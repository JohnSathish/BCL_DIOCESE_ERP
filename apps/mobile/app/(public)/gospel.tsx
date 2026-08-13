import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { useParishStore } from '../../lib/parish-store';
import { api, CMS_SLUG } from '../../lib/api';
import { cacheRemember, OfflineKeys } from '../../lib/offline';
import {
  dailyContentQueryPath,
  type DailyContent,
} from '../../lib/daily-content';
import { cleanReadingText, splitReading } from '../../lib/reading-format';
import { brand } from '../../lib/theme';

function ReadingSection({
  title,
  raw,
  ui,
  colors,
}: {
  title: string;
  raw?: string | null;
  ui: ReturnType<typeof useAppTheme>['ui'];
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  if (!raw?.trim()) return null;
  const { citation, body } = splitReading(raw);
  const hasBody = Boolean(body.trim());
  const text = hasBody ? body : citation;
  const cite = hasBody ? citation : '';

  return (
    <View style={[ui.card, { marginBottom: 12 }]}>
      <Text style={[ui.meta, { color: brand.burgundy, fontWeight: '800', letterSpacing: 0.5 }]}>
        {title.toUpperCase()}
      </Text>
      {cite ? (
        <Text style={[ui.cardTitle, { color: colors.primary, marginTop: 4, marginBottom: 8 }]}>
          {cite}
        </Text>
      ) : null}
      {text ? <Text style={[ui.body, { lineHeight: 24 }]}>{cleanReadingText(text)}</Text> : null}
    </View>
  );
}

export default function GospelScreen() {
  const { t } = useTranslation('mobile');
  const { ui, colors } = useAppTheme();
  const parish = useParishStore((s) => s.context);
  const slug =
    parish?.parishCode?.toLowerCase().includes('shp') ||
    parish?.parishName?.toLowerCase().includes('sacred')
      ? 'sacred-heart'
      : CMS_SLUG;

  const daily = useQuery({
    queryKey: ['daily-content', 'gospel', slug, parish?.parishId],
    staleTime: 60 * 60 * 1000,
    queryFn: () =>
      cacheRemember(
        OfflineKeys.dailyContent,
        () =>
          api<DailyContent>(
            dailyContentQueryPath({ parishId: parish?.parishId, slug }),
            { auth: false },
          ),
        1000 * 60 * 60 * 24 * 7,
      ),
  });

  const d = daily.data;
  const feast = d?.liturgy?.feastName || d?.gospel?.title || t('gospel.title');
  const usccbUrl = d?.meta?.usccbUrl || 'https://bible.usccb.org/bible/readings/';

  return (
    <Screen scroll>
      <Text style={ui.title}>{t('gospel.title')}</Text>
      <Text style={[ui.meta, { marginBottom: 12 }]}>
        {d?.date || 'Today'}
        {d?.liturgy?.season ? ` · ${d.liturgy.season}` : ''}
      </Text>

      <View style={[ui.card, { marginBottom: 12 }]}>
        <Text style={[ui.cardTitle, { color: colors.primary }]}>{feast}</Text>
        {d?.gospel?.reference ? (
          <Text style={[ui.meta, { marginTop: 6 }]}>Gospel: {d.gospel.reference}</Text>
        ) : null}
        <Pressable
          style={{
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: brand.burgundy,
          }}
          onPress={() => void Linking.openURL(usccbUrl)}
        >
          <ExternalLink size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800' }}>{t('gospel.openUsccb')}</Text>
        </Pressable>
      </View>

      {daily.isLoading ? <Text style={ui.meta}>{t('gospel.loading')}</Text> : null}

      <ReadingSection title={t('gospel.reading1')} raw={d?.readings?.first} ui={ui} colors={colors} />
      <ReadingSection title={t('gospel.psalm')} raw={d?.readings?.psalm} ui={ui} colors={colors} />
      <ReadingSection
        title={d?.bibleVerse?.theme || t('gospel.alleluia')}
        raw={
          d?.bibleVerse?.reference && d?.bibleVerse?.text
            ? `${d.bibleVerse.reference}\n\n${d.bibleVerse.text}`
            : d?.bibleVerse?.text || d?.bibleVerse?.reference
        }
        ui={ui}
        colors={colors}
      />
      <ReadingSection title="Reading 2" raw={d?.readings?.second} ui={ui} colors={colors} />
      <ReadingSection
        title={t('gospel.gospel')}
        raw={
          d?.gospel?.reference && d?.gospel?.text
            ? `${d.gospel.reference}\n\n${d.gospel.text}`
            : d?.gospel?.text || d?.gospel?.reference
        }
        ui={ui}
        colors={colors}
      />

      {d?.meta?.attribution ? (
        <Text style={[ui.meta, { marginTop: 8, marginBottom: 16, lineHeight: 18 }]}>
          {d.meta.attribution}
        </Text>
      ) : null}
    </Screen>
  );
}
