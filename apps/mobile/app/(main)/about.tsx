import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useParishBrand } from '../../lib/parish-brand';

export default function AboutParishScreen() {
  const { config } = useParishBrand();
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <Image source={config.logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>{config.parishName}</Text>
      <Text style={styles.location}>{config.location}</Text>
      <Text style={styles.diocese}>{config.dioceseName}</Text>
      <Text style={styles.tagline}>{config.tagline}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.body}>
          The official mobile app of {config.parishName}. Stay connected with Mass times, daily
          gospel, parish events, announcements, prayers, and parish life.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Information</Text>
        <Text style={styles.meta}>Version {version}</Text>
        {config.poweredBy ? (
          <Text
            style={styles.powered}
            onPress={() => config.poweredBy?.url && void Linking.openURL(config.poweredBy.url)}
          >
            Powered by {config.poweredBy.label}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logo: { width: 120, height: 120, marginBottom: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#7A1725', textAlign: 'center' },
  location: { fontSize: 15, color: '#C79A35', fontWeight: '600', marginTop: 4 },
  diocese: { fontSize: 13, color: '#5C6570', marginTop: 8, textAlign: 'center' },
  tagline: { fontSize: 14, color: '#102A4A', marginTop: 12, fontStyle: 'italic' },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#102A4A', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22, color: '#5C6570' },
  meta: { fontSize: 13, color: '#5C6570' },
  powered: { fontSize: 12, color: '#94A3B8', marginTop: 12 },
});
