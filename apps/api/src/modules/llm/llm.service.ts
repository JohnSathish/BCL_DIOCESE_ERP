import { Injectable, Logger } from '@nestjs/common';
import { LlmCompletionResult, LlmFlags, LlmProviderMode, LlmTask } from './llm.types';

type CompleteOpts = {
  task: LlmTask;
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  llmFlags(): LlmFlags {
    const key = process.env.OPENAI_API_KEY?.trim();
    const featureOff = this.flagOff(process.env.FEATURE_LLM);
    const enabled = Boolean(key) && !featureOff;
    return {
      enabled,
      provider: enabled ? 'openai' : 'heuristic',
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    };
  }

  private flagOff(v?: string) {
    const s = (v || '').toLowerCase();
    return s === '0' || s === 'false' || s === 'no' || s === 'off';
  }

  isLive() {
    return this.llmFlags().enabled;
  }

  /** Run LLM when configured; otherwise return fallback result. */
  async runWithFallback<T>(
    task: LlmTask,
    llmCall: () => Promise<T>,
    fallback: () => T,
  ): Promise<{ data: T; providerMode: LlmProviderMode; error?: string }> {
    if (!this.isLive()) {
      return { data: fallback(), providerMode: 'heuristic' };
    }
    try {
      const data = await llmCall();
      return { data, providerMode: 'live' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[llm ${task}] fallback: ${msg}`);
      return { data: fallback(), providerMode: 'heuristic', error: msg };
    }
  }

  async complete(opts: CompleteOpts): Promise<LlmCompletionResult> {
    const flags = this.llmFlags();
    if (!flags.enabled) {
      return { text: '', providerMode: 'heuristic', error: 'LLM disabled' };
    }

    const started = Date.now();
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const body: Record<string, unknown> = {
      model: flags.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      max_tokens: opts.maxTokens ?? Number(process.env.LLM_MAX_TOKENS || 2048),
      temperature: 0.4,
    };
    if (opts.json) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - started;
    const raw = await res.text();
    if (!res.ok) {
      this.logger.error(`[llm ${opts.task}] HTTP ${res.status}: ${raw.slice(0, 200)}`);
      throw new Error(`OpenAI HTTP ${res.status}`);
    }

    let parsed: { choices?: Array<{ message?: { content?: string } }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid OpenAI response JSON');
    }

    const text = parsed.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('Empty LLM response');

    this.logger.log(`[llm ${opts.task}] ok model=${flags.model} ms=${latencyMs} chars=${text.length}`);
    return { text, providerMode: 'live', model: flags.model, latencyMs };
  }

  parseJson<T>(text: string): T {
    const trimmed = text.trim();
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const payload = fence ? fence[1].trim() : trimmed;
    return JSON.parse(payload) as T;
  }
}
