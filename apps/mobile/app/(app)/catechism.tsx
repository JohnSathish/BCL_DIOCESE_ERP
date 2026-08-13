import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import {
  STAFF_CACHE,
  fetchStaffCached,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
} from '../../lib/staff-data';
import { api } from '../../lib/api';

type CatechismDash = {
  totalStudents?: number;
  classes?: number;
  teachers?: number;
  attendanceToday?: { rate?: number; marked?: number; present?: number };
};

type CatechismClass = {
  id: string;
  name: string;
  grade?: string | null;
  academicYear?: string | null;
  _count?: { students: number };
};

export default function CatechismScreen() {
  const { ui, colors } = useAppTheme();
  const parishId = useStaffParishId();

  const dash = useQuery({
    queryKey: staffQueryKey('catechism-dash', parishId),
    queryFn: () =>
      fetchStaffCached(STAFF_CACHE.catechism, () =>
        api<CatechismDash>(`/catechism/dashboard${parishQuery(parishId)}`),
      ),
  });

  const classes = useQuery({
    queryKey: staffQueryKey('catechism-classes', parishId),
    queryFn: () => api<CatechismClass[]>(`/catechism/classes${parishQuery(parishId)}`),
  });

  const d = dash.data;

  return (
    <Screen scroll>
      <Text style={ui.title}>Catechism</Text>
      <Text style={ui.subtitle}>Classes, students and attendance</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {[
          ['Classes', d?.classes],
          ['Students', d?.totalStudents],
          ['Teachers', d?.teachers],
          ['Attendance', d?.attendanceToday?.rate != null ? `${d.attendanceToday.rate}%` : '—'],
        ].map(([label, value]) => (
          <View key={String(label)} style={[ui.card, { width: '47%', flexGrow: 1, padding: 12 }]}>
            <Text style={ui.meta}>{String(label)}</Text>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 20 }}>
              {String(value ?? '—')}
            </Text>
          </View>
        ))}
      </View>

      {(classes.data || []).map((c) => (
        <View key={c.id} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{c.name}</Text>
          <Text style={ui.meta}>
            {[c.grade, c.academicYear, c._count?.students != null ? `${c._count.students} students` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ))}
      {dash.isLoading || classes.isLoading ? (
        <Text style={ui.meta}>Loading catechism…</Text>
      ) : null}
    </Screen>
  );
}
