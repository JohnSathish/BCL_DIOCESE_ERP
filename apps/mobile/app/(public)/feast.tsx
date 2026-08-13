import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { useParishStore } from '../../lib/parish-store';
import { api, CMS_SLUG } from '../../lib/api';
import { cacheRemember, OfflineKeys } from '../../lib/offline';
import {
  colourEmoji,
  dailyContentQueryPath,
  type DailyContent,
} from '../../lib/daily-content';

export default function FeastScreen() {
  const { ui, colors } = useAppTheme();
  const parish = useParishStore((s) => s.context);
  const slug =
    parish?.parishCode?.toLowerCase().includes('shp') ||
    parish?.parishName?.toLowerCase().includes('sacred')
      ? 'sacred-heart'
      : CMS_SLUG;

  const daily = useQuery({
    queryKey: ['daily-content', 'feast', slug, parish?.parishId],
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
  const feast = d?.liturgy?.feastName || 'Today\'s liturgical day';
  const colour = d?.liturgy?.colour
    ? `${colourEmoji(d.liturgy.colour)} ${d.liturgy.colour}`
    : '—';
  const seasonBits = [d?.liturgy?.season, d?.liturgy?.year ? `Year ${d.liturgy.year}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen scroll>
      <Text style={ui.title}>Today&apos;s Feast</Text>
      <View style={ui.card}>
        <Text style={ui.meta}>LITURGICAL DAY</Text>
        <Text style={[ui.cardTitle, { color: colors.primary, fontSize: 20 }]}>{feast}</Text>
        <Text style={ui.body}>Colour: {colour}</Text>
        {seasonBits ? <Text style={ui.body}>{seasonBits}</Text> : null}
        {d?.liturgy?.rank ? <Text style={ui.body}>Rank: {d.liturgy.rank}</Text> : null}
      </View>
      <View style={ui.card}>
        <Text style={ui.cardTitle}>Saint of the Day</Text>
        <Text style={[ui.cardTitle, { color: colors.primary, fontSize: 18, marginTop: 4 }]}>
          {d?.saint?.name || '—'}
        </Text>
        {d?.saint?.bio ? <Text style={ui.body}>{d.saint.bio}</Text> : null}
        {d?.saint?.patronage ? (
          <Text style={ui.body}>Patronage: {d.saint.patronage}</Text>
        ) : (
          <Text style={ui.body}>Ask for intercession for the diocese, clergy, and families.</Text>
        )}
      </View>
    </Screen>
  );
}
