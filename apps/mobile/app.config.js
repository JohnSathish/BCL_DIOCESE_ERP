/** @type {import('expo/config').ExpoConfig} */
const REGISTRY = {
  'sacred-heart': {
    parishName: 'Sacred Heart Shrine Parish',
    shortName: 'Sacred Heart Parish',
    tagline: 'Faith · Community · Service',
    colors: { primary: '#7A1725', secondary: '#102A4A', accent: '#C79A35' },
    androidPackage: 'in.sacredheartshrinetura.parish',
    iosBundleId: 'in.sacredheartshrinetura.parish',
  },
};

const appId = process.env.EXPO_PUBLIC_PARISH_APP_ID || 'sacred-heart';
const parish = REGISTRY[appId] || REGISTRY['sacred-heart'];

module.exports = {
  name: parish.parishName,
  slug: 'bcl-parish-app',
  version: '1.0.4',
  orientation: 'portrait',
  scheme: appId.replace(/-/g, ''),
  userInterfaceStyle: 'light',
  newArchEnabled: false,
  icon: './assets/parishes/sacred-heart/logo.png',
  splash: {
    image: './assets/parishes/sacred-heart/splash-welcome.png',
    resizeMode: 'cover',
    backgroundColor: '#5C0A16',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'expo-camera',
      {
        cameraPermission: `Allow ${parish.shortName} to scan certificate QR codes.`,
      },
    ],
    [
      'expo-notifications',
      {
        color: parish.colors.accent,
        icon: './assets/parishes/sacred-heart/logo.png',
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission: `Allow ${parish.shortName} to add Holy Mass times to your calendar.`,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  android: {
    package: parish.androidPackage,
    versionCode: 7,
    adaptiveIcon: {
      foregroundImage: './assets/parishes/sacred-heart/adaptive-foreground.png',
      backgroundColor: '#7A1725',
    },
    permissions: ['CAMERA', 'POST_NOTIFICATIONS', 'READ_CALENDAR', 'WRITE_CALENDAR'],
  },
  ios: {
    bundleIdentifier: parish.iosBundleId,
    supportsTablet: true,
    icon: './assets/parishes/sacred-heart/logo.png',
    infoPlist: {
      NSCameraUsageDescription: 'Scan parish certificate QR codes for verification.',
      NSFaceIDUsageDescription: `Unlock ${parish.shortName} securely.`,
      NSCalendarsUsageDescription: 'Add Holy Mass reminders to your calendar.',
      NSRemindersUsageDescription: 'Set reminders for upcoming Mass times.',
    },
  },
  web: {
    bundler: 'metro',
    favicon: './assets/parishes/sacred-heart/logo.png',
  },
  extra: {
    parishAppId: appId,
    parishName: parish.parishName,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'eb8248da-1cc7-4455-9cbf-b5e1f9a01a2a',
    },
    subtitle: parish.tagline,
  },
};
