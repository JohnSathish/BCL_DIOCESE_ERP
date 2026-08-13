import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type MassReminderInput = {
  at: string;
  label: string;
  location?: string;
  parishName?: string;
};

const STORAGE_PREFIX = 'mass-reminder:';

function isGranted(perms: unknown): boolean {
  const p = perms as { granted?: boolean; status?: string };
  return Boolean(p.granted) || p.status === 'granted';
}

function formatTime12(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

async function ensureNotificationPermissions() {
  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  let perms = await Notifications.getPermissionsAsync();
  if (!isGranted(perms)) {
    perms = await Notifications.requestPermissionsAsync();
  }
  if (!isGranted(perms)) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mass-reminders', {
      name: 'Mass Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
    });
  }

  return Notifications;
}

async function addToDeviceCalendar(input: MassReminderInput): Promise<boolean> {
  const Calendar = await import('expo-calendar');
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return false;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  if (!writable) return false;

  const start = new Date(input.at);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  await Calendar.createEventAsync(writable.id, {
    title: input.label,
    startDate: start,
    endDate: end,
    location: input.location,
    notes: input.parishName ? `Holy Mass at ${input.parishName}` : 'Holy Mass',
    alarms: [{ relativeOffset: -30, method: Calendar.AlarmMethod.ALERT }],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return true;
}

/**
 * Schedules a local push 30 minutes before Mass and adds a device calendar event.
 */
export async function setMassReminder(
  input: MassReminderInput,
): Promise<{ ok: boolean; message: string }> {
  const massAt = new Date(input.at);
  if (Number.isNaN(massAt.getTime())) {
    return { ok: false, message: 'Invalid Mass time.' };
  }

  const remindAt = new Date(massAt.getTime() - 30 * 60 * 1000);
  if (remindAt.getTime() <= Date.now()) {
    return { ok: false, message: 'This Mass starts in less than 30 minutes.' };
  }

  const Notifications = await ensureNotificationPermissions();
  if (!Notifications) {
    return { ok: false, message: 'Notification permission is required to set a reminder.' };
  }

  const existing = await AsyncStorage.getItem(`${STORAGE_PREFIX}${input.at}`);
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing);
    } catch {
      /* ignore stale id */
    }
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Holy Mass — Starts in 30 Minutes',
      body: `${input.label} · ${formatTime12(massAt)}${
        input.location ? ` · ${input.location}` : ''
      }. Join us in prayer.`,
      data: { type: 'MASS_REMINDER', at: input.at, label: input.label },
      ...(Platform.OS === 'android' ? { channelId: 'mass-reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAt,
    },
  });

  await AsyncStorage.setItem(`${STORAGE_PREFIX}${input.at}`, notificationId);

  let calendarAdded = false;
  try {
    calendarAdded = await addToDeviceCalendar(input);
  } catch {
    calendarAdded = false;
  }

  if (calendarAdded) {
    return {
      ok: true,
      message: 'Reminder saved — calendar event added and notification scheduled for 30 minutes before Mass.',
    };
  }

  return {
    ok: true,
    message: 'Reminder saved — you will be notified 30 minutes before Mass.',
  };
}
