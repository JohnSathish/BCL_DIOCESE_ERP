import { Link, router } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Church,
  Cross,
  FileText,
  Heart,
  Images,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Play,
  Settings,
  User,
  Users,
} from '../../components/icons';
import { useAuthStore } from '../../lib/auth-store';
import { useParishBrand } from '../../lib/parish-brand';
import { dashboardKindForRoles } from '../../lib/rbac';

type MenuItem = {
  label: string;
  href?: string;
  Icon: typeof Church;
  action?: 'login' | 'staff' | 'about';
};

export default function MoreTabScreen() {
  const { config } = useParishBrand();
  const session = useAuthStore((s) => s.session);
  const kind = dashboardKindForRoles(session?.user.roles || []);

  const publicMenu: MenuItem[] = [
    { label: 'Sacraments', href: '/(main)/sacraments', Icon: Cross },
    { label: 'Parish Directory', href: '/(main)/directory-public', Icon: Users },
    { label: 'Photo Gallery', href: '/(public)/gallery', Icon: Images },
    { label: 'Live Stream', href: '/(public)/live-mass', Icon: Play },
    { label: 'Support Our Parish', href: '/donations', Icon: Heart },
    { label: 'Contact Us', href: '/(public)/contact', Icon: Mail },
    { label: 'About Our Parish', action: 'about', Icon: Church },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: config.colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={[config.colors.primary, config.colors.secondary]} style={styles.header}>
        <Image source={config.logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.parishName}>{config.parishName}</Text>
        <Text style={styles.location}>{config.location}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <User size={18} color={config.colors.primary} />
            <Text style={styles.contactText}>{config.priest.name}</Text>
          </View>
          <View style={styles.contactRow}>
            <Phone size={18} color={config.colors.primary} />
            <Pressable onPress={() => void Linking.openURL(`tel:${config.contact.phone}`)}>
              <Text style={[styles.contactText, styles.link]}>{config.contact.phone}</Text>
            </Pressable>
          </View>
          <View style={styles.contactRow}>
            <Mail size={18} color={config.colors.primary} />
            <Text style={styles.contactText}>{config.contact.email}</Text>
          </View>
          <View style={styles.contactRow}>
            <MapPin size={18} color={config.colors.primary} />
            <Text style={[styles.contactText, { flex: 1 }]}>{config.contact.address}</Text>
          </View>
        </View>

        {session && (kind === 'priest' || kind === 'admin' || kind === 'bishop') ? (
          <Pressable
            style={[styles.staffBanner, { backgroundColor: config.colors.secondary }]}
            onPress={() => router.push('/(main)' as never)}
          >
            <BookOpen size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.staffTitle}>Staff Dashboard</Text>
              <Text style={styles.staffSub}>Registers, approvals, and parish management</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.staffBanner, { backgroundColor: config.colors.primary }]}
            onPress={() => router.push('/login' as never)}
          >
            <LogIn size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.staffTitle}>Parishioner / Staff Login</Text>
              <Text style={styles.staffSub}>My Family, certificates, and personal notifications</Text>
            </View>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Explore</Text>
        {publicMenu.map((item) => {
          const content = (
            <View style={styles.menuRow}>
              <View style={[styles.menuIcon, { backgroundColor: `${config.colors.primary}10` }]}>
                <item.Icon size={18} color={config.colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
          );
          if (item.href) {
            return (
              <Link key={item.label} href={item.href as never} asChild>
                <Pressable style={styles.menuItem}>{content}</Pressable>
              </Link>
            );
          }
          if (item.action === 'about') {
            return (
              <Pressable
                key={item.label}
                style={styles.menuItem}
                onPress={() => router.push('/(main)/about' as never)}
              >
                {content}
              </Pressable>
            );
          }
          return (
            <Pressable key={item.label} style={styles.menuItem}>
              {content}
            </Pressable>
          );
        })}

        {session ? (
          <Link href="/(app)/settings" asChild>
            <Pressable style={styles.menuItem}>
              <View style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: `${config.colors.primary}10` }]}>
                  <Settings size={18} color={config.colors.primary} />
                </View>
                <Text style={styles.menuLabel}>Settings</Text>
              </View>
            </Pressable>
          </Link>
        ) : null}

        <Text style={styles.footer}>
          © {new Date().getFullYear()} {config.parishName}. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center' },
  logo: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', marginBottom: 12 },
  parishName: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  location: { color: '#C79A35', fontSize: 14, fontWeight: '600', marginTop: 4 },
  body: { padding: 16, gap: 10 },
  contactCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  contactText: { fontSize: 14, color: '#102A4A', flex: 1 },
  link: { color: '#7A1725', fontWeight: '600' },
  staffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  staffTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  staffSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#102A4A', marginTop: 8, marginBottom: 4 },
  menuItem: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#102A4A' },
  footer: { textAlign: 'center', color: '#5C6570', fontSize: 12, marginTop: 16 },
  powered: { textAlign: 'center', color: '#94A3B8', fontSize: 11 },
});
