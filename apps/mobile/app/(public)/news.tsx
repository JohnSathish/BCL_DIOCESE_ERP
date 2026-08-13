import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingBlock, Screen } from '../../components/ui';
import { api, CMS_SLUG } from '../../lib/api';
import { useParishStore } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';

export default function NewsScreen() {
  const { ui, colors } = useAppTheme();
  const parish = useParishStore((s) => s.context);
  const slug =
    parish?.parishName?.toLowerCase().includes('sacred') ||
    parish?.parishCode?.toLowerCase().includes('shp')
      ? 'sacred-heart'
      : CMS_SLUG;

  const q = useQuery({
    queryKey: ['mobile-news', slug],
    queryFn: async () => {
      const site = await api<{
        posts?: Array<{ id: string; title: string; excerpt?: string }>;
        announcements?: Array<{ id: string; title: string; body?: string }>;
      }>(`/cms/public/${slug}`, { auth: false });
      if (site.posts?.length) return site.posts;
      if (site.announcements?.length) {
        return site.announcements.map((a) => ({
          id: a.id,
          title: a.title,
          excerpt: a.body,
        }));
      }
      const mobile = await api<{
        config?: { newsJson?: Array<{ title?: string; excerpt?: string }> | string[] };
      }>(`/app/mobile-cms?slug=${slug}`, { auth: false });
      const news = mobile.config?.newsJson;
      if (Array.isArray(news) && news.length) {
        return news.map((n, i) =>
          typeof n === 'string'
            ? { id: String(i), title: n }
            : { id: String(i), title: n.title || 'Update', excerpt: n.excerpt },
        );
      }
      return [
        { id: '1', title: 'Parish feast novena begins', excerpt: 'Join evening prayers this week.' },
        { id: '2', title: 'Catechism enrollment open', excerpt: 'Register students at the office.' },
      ];
    },
  });

  return (
    <Screen scroll>
      <Text style={ui.title}>News & Announcements</Text>
      <Text style={ui.subtitle}>Latest updates from Mobile CMS & parish website.</Text>
      {q.isLoading ? <LoadingBlock /> : null}
      {(q.data || []).map((n) => (
        <View key={n.id} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{n.title}</Text>
          <Text style={ui.body}>{n.excerpt || 'Read more on the parish website.'}</Text>
        </View>
      ))}
      {!q.isLoading && !(q.data || []).length ? (
        <EmptyState title="No news yet" body="Announcements will appear here." />
      ) : null}
    </Screen>
  );
}
