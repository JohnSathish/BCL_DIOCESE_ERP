export type LlmProviderMode = 'live' | 'heuristic';

export type LlmFlags = {
  enabled: boolean;
  provider: 'openai' | 'heuristic';
  model: string;
};

export type LlmCompletionResult = {
  text: string;
  providerMode: LlmProviderMode;
  model?: string;
  latencyMs?: number;
  error?: string;
};

export type LlmTask =
  | 'reflection'
  | 'compose'
  | 'translate'
  | 'search_summary'
  | 'chat'
  | 'ocr'
  | 'assistant';
