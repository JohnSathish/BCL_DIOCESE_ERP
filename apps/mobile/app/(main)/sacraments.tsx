import { Link } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useParishBrand } from '../../lib/parish-brand';

export default function SacramentsScreen() {
  const { config } = useParishBrand();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[config.colors.primary, config.colors.secondary]} style={styles.header}>
        <Text style={styles.headerTitle}>Sacraments</Text>
        <Text style={styles.headerSub}>{config.parishName}</Text>
      </LinearGradient>
      <View style={styles.list}>
        {config.sacraments.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.desc}>{s.description}</Text>
            <Link href="/(public)/contact" asChild>
              <Pressable style={[styles.btn, { backgroundColor: config.colors.primary }]}>
                <Text style={styles.btnText}>Contact Parish Office</Text>
              </Pressable>
            </Link>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  title: { fontSize: 17, fontWeight: '800', color: '#7A1725' },
  desc: { fontSize: 14, color: '#5C6570', marginTop: 6, lineHeight: 21 },
  btn: { marginTop: 12, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
