'use client';

type Lang = 'english' | 'garo' | 'khasi' | 'hindi' | 'tamil' | string;

const STYLE: Record<string, string> = {
  english: 'hms-lang--english',
  garo: 'hms-lang--garo',
  khasi: 'hms-lang--khasi',
  hindi: 'hms-lang--hindi',
  tamil: 'hms-lang--tamil',
};

export function LanguageBadge({
  language,
  label,
}: {
  language: Lang | null;
  label?: string;
}) {
  if (!language) return null;
  const cls = STYLE[language] || 'hms-lang--default';
  const text =
    label ||
    (language === 'garo'
      ? 'GARO'
      : language === 'english'
        ? 'ENGLISH'
        : language.toUpperCase());
  return <span className={`hms-lang ${cls}`}>{text}</span>;
}
