import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Phone, User, Users } from '../../components/icons';
import { useParishBrand } from '../../lib/parish-brand';

export default function ParishDirectoryScreen() {
  const { config } = useParishBrand();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={[config.colors.secondary, config.colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Parish Directory</Text>
        <Text style={styles.headerSub}>Approved public information</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.card}>
          <User size={20} color={config.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.role}>Parish Priest</Text>
            <Text style={styles.name}>{config.priest.name}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Users size={20} color={config.colors.primary} />
          <Text style={styles.section}>Ministries</Text>
          {config.ministries.map((m) => (
            <Text key={m.id} style={styles.ministry}>
              · {m.title}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Parish Office</Text>
          <View style={styles.row}>
            <Phone size={16} color={config.colors.primary} />
            <Text style={styles.line} onPress={() => void Linking.openURL(`tel:${config.contact.phone}`)}>
              {config.contact.phone}
            </Text>
          </View>
          <View style={styles.row}>
            <Mail size={16} color={config.colors.primary} />
            <Text style={styles.line}>{config.contact.email}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 14 },
  body: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8 },
  role: { fontSize: 11, fontWeight: '800', color: '#8B7355', textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { fontSize: 17, fontWeight: '700', color: '#102A4A' },
  section: { fontSize: 15, fontWeight: '800', color: '#7A1725', marginBottom: 4 },
  ministry: { fontSize: 14, color: '#102A4A', paddingVertical: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  line: { fontSize: 14, color: '#102A4A' },
});
