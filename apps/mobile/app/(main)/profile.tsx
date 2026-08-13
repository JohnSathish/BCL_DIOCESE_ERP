import { Link, useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui';
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Church,
  Cross,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Users,
} from '../../components/icons';
import { useAuthStore } from '../../lib/auth-store';
import { useParishStore } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';
import { dashboardKindForRoles, primaryRole, roleLabel } from '../../lib/rbac';
import { brand } from '../../lib/theme';

type HubLink = {
  label: string;
  href?: string;
  Icon: typeof User;
  color: string;
  hint?: string;
  action?: 'logout';
};

function SectionLabel({ children, color }: { children: string; color: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 4,
      }}
    >
      {children}
    </Text>
  );
}

function HubRows({
  links,
  colors,
  onLogout,
}: {
  links: HubLink[];
  colors: { card: string; border: string; text: string; muted: string };
  onLogout?: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {links.map((item) => {
        const Icon = item.Icon;
        const body = (
          <>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: `${item.color}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={18} color={item.color} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                {item.label}
              </Text>
              {item.hint ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{item.hint}</Text>
              ) : null}
            </View>
            <Text style={{ color: colors.muted }}>›</Text>
          </>
        );

        const rowStyle = {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: 12,
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
        };

        if (item.action === 'logout') {
          return (
            <Pressable key={item.label} onPress={onLogout} style={rowStyle}>
              {body}
            </Pressable>
          );
        }

        return (
          <Link key={item.label} href={(item.href || '/(main)') as never} asChild>
            <Pressable style={rowStyle}>{body}</Pressable>
          </Link>
        );
      })}
    </View>
  );
}

export default function ProfileMoreScreen() {
  const { ui, colors, isDark } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const themeMode = useAuthStore((s) => s.themeMode);
  const setThemeMode = useAuthStore((s) => s.setThemeMode);
  const parish = useParishStore((s) => s.context);
  const router = useRouter();

  const kind = dashboardKindForRoles(session?.user.roles || []);
  const parishName = parish?.parishName || 'Your parish';
  const dioceseName = parish?.dioceseName || 'Diocese of Tura';

  const doLogout = async () => {
    await logout();
    router.replace('/(main)/profile' as never);
  };

  const guestAuth: HubLink[] = [
    {
      label: 'Parishioner / Family Login',
      href: '/login?intent=family',
      Icon: Users,
      color: brand.burgundy,
      hint: 'Family records, certificates & donations',
    },
    {
      label: 'Parish Priest Login',
      href: '/login?intent=priest',
      Icon: Church,
      color: brand.navy,
      hint: 'Priest / Assistant Priest / Parish staff',
    },
    {
      label: 'Diocese Login',
      href: '/login?intent=diocese',
      Icon: Building2,
      color: brand.gold,
      hint: 'Bishop / Diocese Office',
    },
  ];

  const guestUtility: HubLink[] = [
    {
      label: 'Language',
      href: '/(app)/settings',
      Icon: BookOpen,
      color: brand.teal,
      hint: 'English · Garo · Hindi',
    },
    {
      label: 'Settings',
      href: '/(app)/settings',
      Icon: Settings,
      color: '#64748B',
    },
    {
      label: 'Contact Parish',
      href: '/(public)/contact',
      Icon: Heart,
      color: brand.purple,
    },
    {
      label: 'About',
      href: '/(public)/home',
      Icon: Cross,
      color: brand.navy,
      hint: 'Parish & app information',
    },
  ];

  const familyLinks: HubLink[] = [
    { label: 'My Family', href: '/family', Icon: Users, color: brand.burgundy },
    { label: 'My Sacraments', href: '/(app)/baptisms', Icon: Cross, color: brand.emerald },
    { label: 'Certificates', href: '/certificates', Icon: FileText, color: brand.teal },
    { label: 'Donations', href: '/donations', Icon: Heart, color: brand.gold },
    { label: 'Prayer Requests', href: '/prayer', Icon: Heart, color: brand.purple },
    { label: 'Parish Activities', href: '/(public)/events', Icon: Calendar, color: brand.orange },
    { label: 'Settings', href: '/(app)/settings', Icon: Settings, color: '#64748B' },
    { label: 'Logout', action: 'logout', Icon: LogOut, color: brand.danger },
  ];

  const priestLinks: HubLink[] = [
    { label: 'Dashboard', href: '/(main)', Icon: LayoutDashboard, color: brand.burgundy },
    { label: "Today's Mass", href: '/(app)/schedule', Icon: Church, color: brand.indigo },
    { label: 'Certificates', href: '/certificates', Icon: FileText, color: brand.teal },
    { label: 'Finance', href: '/(app)/finance', Icon: BarChart3, color: brand.orange },
    { label: 'Calendar', href: '/(main)/calendar', Icon: Calendar, color: brand.navy },
    { label: 'Website CMS', href: '/(app)/cms', Icon: Building2, color: brand.teal },
    { label: 'Families', href: '/(app)/families', Icon: Users, color: brand.royal },
    { label: 'Settings', href: '/(app)/settings', Icon: Settings, color: '#64748B' },
    { label: 'Logout', action: 'logout', Icon: LogOut, color: brand.danger },
  ];

  const bishopLinks: HubLink[] = [
    { label: 'Diocese Dashboard', href: '/(main)', Icon: LayoutDashboard, color: brand.navy },
    { label: 'Parishes', href: '/(app)/diocese', Icon: Church, color: brand.burgundy },
    { label: 'Priests', href: '/(app)/priests', Icon: User, color: brand.royal },
    { label: 'Transfers', href: '/(app)/priests', Icon: FileText, color: brand.gold },
    { label: 'Reports', href: '/(app)/reports', Icon: BarChart3, color: brand.orange },
    { label: 'Analytics', href: '/(app)/reports', Icon: BarChart3, color: brand.teal },
    { label: 'Settings', href: '/(app)/settings', Icon: Settings, color: '#64748B' },
    { label: 'Logout', action: 'logout', Icon: LogOut, color: brand.danger },
  ];

  let title = 'Welcome';
  let subtitle = 'Sign in to personalize your parish experience';
  let eyebrow = 'PROFILE';
  let links: HubLink[] = [];

  if (!session) {
    links = [];
  } else if (kind === 'bishop' || kind === 'admin') {
    eyebrow = 'DIOCESE';
    title = `${session.user.firstName} ${session.user.lastName}`.trim() || 'Most Rev. Bishop';
    subtitle = dioceseName;
    links = bishopLinks;
  } else if (kind === 'priest') {
    eyebrow = 'PARISH STAFF';
    title = `Rev. Fr. ${session.user.firstName} ${session.user.lastName}`.trim();
    subtitle = parishName;
    links = priestLinks;
  } else {
    eyebrow = 'FAMILY';
    title =
      kind === 'family'
        ? `${session.user.lastName || session.user.firstName} Family`
        : `${session.user.firstName} ${session.user.lastName}`.trim();
    subtitle = parishName;
    links = familyLinks;
  }

  return (
    <Screen scroll>
      <LinearGradient
        colors={
          kind === 'bishop' || kind === 'admin'
            ? ['#0F3D91', '#1E3A5F', '#7B1E2B']
            : kind === 'priest'
              ? ['#7B1E2B', '#5A1520', '#0F3D91']
              : ['#7B1E2B', '#0F3D91']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, padding: 18, marginBottom: 4 }}
      >
        <Text style={{ color: brand.goldSoft, fontWeight: '800', fontSize: 11, letterSpacing: 0.8 }}>
          {eyebrow}
        </Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 }}>{title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>{subtitle}</Text>
        {session ? (
          <Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 12, fontWeight: '600' }}>
            {roleLabel(primaryRole(session.user.roles))}
          </Text>
        ) : (
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 10, fontSize: 13 }}>
            Public visitor · use Sign In below for staff or family access
          </Text>
        )}
      </LinearGradient>

      {!session ? (
        <>
          <SectionLabel color={colors.muted}>Sign In</SectionLabel>
          <HubRows links={guestAuth} colors={colors} />
          <SectionLabel color={colors.muted}>More</SectionLabel>
          <HubRows links={guestUtility} colors={colors} />
        </>
      ) : (
        <>
          <SectionLabel color={colors.muted}>Shortcuts</SectionLabel>
          <HubRows links={links} colors={colors} onLogout={() => void doLogout()} />
        </>
      )}

      <View style={[ui.card, { marginTop: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ui.cardTitle}>Dark mode</Text>
          <Switch
            value={themeMode === 'dark' || (themeMode === 'system' && isDark)}
            onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')}
            trackColor={{ true: brand.burgundy }}
          />
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/onboarding/select-parish' as never)}
        style={{ marginTop: 12, marginBottom: 8 }}
      >
        <Text style={[ui.link, { textAlign: 'center' }]}>Switch parish</Text>
      </Pressable>
    </Screen>
  );
}
