export function splitReading(raw?: string | null): { citation: string; body: string } {
  if (!raw?.trim()) return { citation: '', body: '' };
  const cleaned = cleanReadingText(raw);
  const parts = cleaned.split(/\n\n+/);
  if (parts.length >= 2 && parts[0].length < 120) {
    return { citation: parts[0].trim(), body: parts.slice(1).join('\n\n').trim() };
  }
  return { citation: cleaned, body: '' };
}

export function cleanReadingText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/  \n/g, '\n')
    .replace(/\n- (LISTEN PODCAST|VIEW REFLECTION|En Espa|View Calendar|Get Daily)[\s\S]*$/i, '')
    .trim();
}

export function readingExcerpt(text?: string | null, max = 120): string {
  if (!text?.trim()) return '';
  const plain = cleanReadingText(text).replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}
