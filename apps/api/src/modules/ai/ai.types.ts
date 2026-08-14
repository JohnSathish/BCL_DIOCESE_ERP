export const AI_ENTITIES = [
  'marriage',
  'baptism',
  'confirmation',
  'communion',
  'death',
  'family',
  'member',
  'priest',
  'parish',
  'mass',
  'event',
  'finance',
  'briefing',
  'duplicate',
  'unknown',
] as const;

export type AiEntity = (typeof AI_ENTITIES)[number];

export type AiAction =
  | 'search'
  | 'count'
  | 'compare'
  | 'analyse'
  | 'report'
  | 'schedule'
  | 'explain';

export type StructuredAiQuery = {
  action: AiAction;
  entity: AiEntity;
  parishHint?: string;
  yearFrom?: number;
  yearTo?: number;
  dateFrom?: string;
  dateTo?: string;
  ministerHint?: string;
  villageHint?: string;
  nameHint?: string;
  maritalHint?: 'widower' | 'widow' | 'bachelor' | 'virgin';
  compareEntities?: AiEntity[];
};

export type AiTableColumn = { key: string; label: string };

export type AiSource = {
  title: string;
  detail: string;
  href: string;
};

export type AiActionChip = {
  id: string;
  label: string;
  href?: string;
};

export type AiAssistantResponse = {
  headline: string;
  answer: string;
  entity: AiEntity;
  intent: string;
  count: number;
  columns: AiTableColumn[];
  rows: Record<string, string>[];
  recordIds: string[];
  breakdown: Array<{ label: string; value: number }>;
  sources: AiSource[];
  actions: AiActionChip[];
  followUps: string[];
  insights: string[];
  refused?: boolean;
  empty?: boolean;
  structuredQuery: StructuredAiQuery;
  debug?: Record<string, unknown>;
};

export type AiConversationContext = Partial<StructuredAiQuery> & {
  lastQuery?: string;
};
