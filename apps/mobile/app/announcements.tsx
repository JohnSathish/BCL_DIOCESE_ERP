import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { api, CMS_SLUG } from '../lib/api';
import { colors, ui } from '../lib/theme';

type Post = {
  id: string;
  title: string;
  excerpt?: string | null;
  content: string;
  publishedAt?: string | null;
};

export default function AnnouncementsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [siteTitle, setSiteTitle] = useState('Parish');
  const [tagline, setTagline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const site = await api<{ siteTitle: string; tagline?: string | null; posts: Post[] }>(
        `/cms/public/${CMS_SLUG}`,
        { auth: false },
      );
      setSiteTitle(site.siteTitle);
      setTagline(site.tagline || null);
      setPosts(site.posts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={ui.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={ui.title}>Announcements</Text>
      <Text style={ui.subtitle}>{siteTitle}</Text>
      {tagline ? <Text style={ui.meta}>{tagline}</Text> : null}
      {loading && !posts.length ? <ActivityIndicator color={colors.burgundy} /> : null}
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {!loading && !posts.length && !error ? (
        <View style={ui.card}>
          <Text style={ui.body}>No published posts yet for this parish website.</Text>
        </View>
      ) : null}
      {posts.map((post) => (
        <View key={post.id} style={ui.card}>
          <Text style={ui.cardTitle}>{post.title}</Text>
          {post.publishedAt ? (
            <Text style={ui.meta}>{new Date(post.publishedAt).toLocaleDateString()}</Text>
          ) : null}
          <Text style={ui.body}>{post.excerpt || post.content}</Text>
        </View>
      ))}
      <Pressable style={ui.button} onPress={() => load(true)}>
        <Text style={ui.buttonText}>Refresh</Text>
      </Pressable>
    </ScrollView>
  );
}
