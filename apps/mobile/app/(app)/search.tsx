import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { Search } from '../../components/icons';
import { useAppTheme } from '../../lib/providers';
import { brand } from '../../lib/theme';
import { api } from '../../lib/api';

const SCOPE = [
  'Families',
  'Members',
  'Certificates',
  'Marriage',
  'Baptism',
  'Finance',
  'Mass',
  'Events',
  'Reports',
  'Notifications',
] as const;

type AiSearchResult = {
  query: string;
  intent: string;
  resultCount: number;
  summary?: string;
  result?: unknown;
};

function flattenResults(data: AiSearchResult): Array<{ title: string; meta: string; scope: string }> {
  const out: Array<{ title: string; meta: string; scope: string }> = [];
  const r = data.result;

  const push = (title: string, meta: string, scope: string) => {
    out.push({ title, meta, scope });
  };

  if (Array.isArray(r)) {
    for (const row of r.slice(0, 15)) {
      const o = row as Record<string, unknown>;
      if (o.firstName || o.lastName) {
        push(
          [o.firstName, o.lastName].filter(Boolean).join(' '),
          [o.houseName, o.village, o.type].filter(Boolean).join(' · ') || data.intent,
          o.type ? String(o.type) : 'Members',
        );
      } else if (o.houseName || o.familyCode) {
        push(
          String(o.houseName || o.familyCode),
          [o.village, o.familyCode].filter(Boolean).join(' · '),
          'Families',
        );
      }
    }
  } else if (r && typeof r === 'object') {
    const bag = r as Record<string, unknown[]>;
    for (const [key, arr] of Object.entries(bag)) {
      if (!Array.isArray(arr)) continue;
      const scope =
        key === 'members' ? 'Members' : key === 'families' ? 'Families' : key === 'sacraments' ? 'Baptism' : 'Reports';
      for (const row of arr.slice(0, 8)) {
        const o = row as Record<string, unknown>;
        push(
          [o.firstName, o.lastName, o.houseName].filter(Boolean).join(' ') || String(o.id || key),
          data.intent,
          scope,
        );
      }
    }
  }

  if (!out.length && data.summary) {
    push(data.summary.slice(0, 80), `${data.resultCount} results · ${data.intent}`, 'Reports');
  }

  return out;
}

export default function GlobalSearchScreen() {
  const { ui, colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<(typeof SCOPE)[number] | 'All'>('All');

  const search = useMutation({
    mutationFn: (q: string) =>
      api<AiSearchResult>('/ai/search', {
        method: 'POST',
        body: JSON.stringify({ query: q }),
      }),
  });

  const results = useMemo(() => {
    if (!search.data) return [];
    const rows = flattenResults(search.data);
    if (scope === 'All') return rows;
    return rows.filter((r) => r.scope === scope);
  }, [search.data, scope]);

  return (
    <Screen scroll>
      <Text style={ui.title}>Global Search</Text>
      <Text style={ui.subtitle}>AI-powered search across parish records</Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: 18,
          paddingHorizontal: 14,
          height: 50,
          marginTop: 8,
        }}
      >
        <Search size={18} color={brand.burgundy} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ask or search…"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.text, fontSize: 16 }}
          autoFocus
          onSubmitEditing={() => {
            if (query.trim()) search.mutate(query.trim());
          }}
          returnKeyType="search"
        />
      </View>

      <Pressable
        style={[ui.button, { marginTop: 10 }, search.isPending && ui.buttonDisabled]}
        onPress={() => query.trim() && search.mutate(query.trim())}
        disabled={search.isPending || !query.trim()}
      >
        <Text style={ui.buttonText}>{search.isPending ? 'Searching…' : 'Search'}</Text>
      </Pressable>

      {search.data?.summary ? (
        <View style={[ui.card, { marginTop: 12 }]}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Summary</Text>
          <Text style={ui.body}>{search.data.summary}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {(['All', ...SCOPE] as const).map((s) => {
          const active = scope === s;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: active ? brand.burgundy : colors.surface2,
              }}
            >
              <Text style={{ color: active ? '#fff' : colors.muted, fontWeight: '700', fontSize: 12 }}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {search.isPending ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : null}

      <View style={{ marginTop: 14, gap: 8 }}>
        {results.map((r, i) => (
          <View
            key={`${r.title}-${i}`}
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 14,
            }}
          >
            <Text style={{ color: brand.burgundy, fontSize: 11, fontWeight: '800' }}>{r.scope}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 4 }}>
              {r.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{r.meta}</Text>
          </View>
        ))}
        {search.isSuccess && !results.length ? (
          <View style={[ui.card, { alignItems: 'center', paddingVertical: 28 }]}>
            <Text style={{ color: colors.muted, fontWeight: '600' }}>No matches</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
