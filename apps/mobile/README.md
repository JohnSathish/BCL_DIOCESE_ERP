# BCL Parish App

**Faith. Community. Service.** · Official mobile client for the BCL Diocese ERP

Premium Expo / React Native app for parishioners, family heads, parish priests, bishops, and diocese administrators — with live JWT auth against the NestJS API.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Expo SDK 53 · React Native · TypeScript |
| Routing | Expo Router (**React Navigation**) · bottom tabs |
| State | Zustand |
| Data | TanStack Query · offline AsyncStorage cache |
| Forms | React Hook Form · Zod |
| Styling | NativeWind (Tailwind) · brand theme |
| Security | SecureStore JWT · refresh tokens · biometrics |
| Push | expo-notifications |
| QR | expo-camera barcode scan → ERP verify API |

## Run

```bash
cd apps/mobile
pnpm install
pnpm dev
# press `a` for Android emulator / Expo Go
```

### API URL

```bash
# Android emulator → host machine
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api/v1

# Physical device (same Wi‑Fi) — use your LAN IP
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api/v1
```

Nest API must be running (`pnpm --filter @bcl/api dev`).

## First-run flow

1. **Splash** — BCL Parish App branding  
2. **Select Diocese** → **Select Parish** (persisted)  
3. **Login** — JWT email/password (OTP UI ready; SMS gateway later) · biometric · guest  
4. **Role home** — automatic dashboard:

| Role | Dashboard |
|------|-----------|
| Guest / Parishioner | Parishioner home (gospel, mass, quick actions) |
| Family Head / Member | Family-oriented modules |
| Parish Priest / Staff | KPI + quick pastoral actions |
| Bishop / Diocese Admin | Diocese overview + console |

Bottom tabs: **Home · Directory/Records · Calendar · Alerts · Profile/More**

## Demo JWT accounts

- `priest@sacredheart-tura.org` / `Priest@12345`
- `admin@basecodelabs.com` / `Admin@12345`

## Key routes

- `/(main)` — role tabs (official home)
- `/onboarding/select-diocese` · `/onboarding/select-parish`
- `/login` — React Hook Form + JWT
- `/(public)/verify` — QR camera + token verify
- `/(app)/*` — staff modules (families, sacraments, finance, AI, …)

## Offline & push

- `lib/offline.ts` — `cacheRemember` for dashboards, mass, announcements, certificates  
- `lib/notifications.ts` — permission + Expo push token registration (after JWT login)  
- API client auto-**refreshes** JWT via `POST /auth/refresh`

### Push notifications (production)

**Expo Go cannot receive Android push** (SDK 53+). Use a **development or preview APK**.

1. **API** — add to `apps/api/.env`:
   ```bash
   EXPO_ACCESS_TOKEN=your_expo_access_token
   ```
   Create token at [expo.dev](https://expo.dev) → Account → Access Tokens.

2. **Mobile** — ensure `apps/mobile/.env` has your LAN API URL and:
   ```bash
   EXPO_PUBLIC_EAS_PROJECT_ID=eb8248da-1cc7-4455-9cbf-b5e1f9a01a2a
   ```

3. **Build & install (EAS cloud)** — from `apps/mobile`:
   ```bash
   npx eas-cli login
   npx eas build --profile preview --platform android
   ```
   Download APK from the EAS dashboard and install on the phone.

4. **Local APK** (no EAS quota) — prebuilt debug APK:
   ```bash
   adb install -r apps/mobile/dist/BCL-Parish-App-debug.apk
   ```

5. **Test flow** — open app → login → allow notifications → App Control → compose PUSH → publish.  
   Parish Communication Center PUSH channel uses the same Expo delivery.

## Production Android (commands)

| Goal | Command |
|------|---------|
| Dev Metro (Expo Go / emulator) | `pnpm --filter @bcl/mobile dev` |
| Open on Android emulator | `pnpm --filter @bcl/mobile android:device` |
| EAS preview APK | `cd apps/mobile && npx eas build --profile preview --platform android` |
| EAS production AAB (Play Store) | `cd apps/mobile && npx eas build --profile production --platform android` |
| Install local debug APK | `adb install -r apps/mobile/dist/BCL-Parish-App-debug.apk` |

Phone and PC must share Wi‑Fi; API URL in `.env` must use the PC LAN IP (not `localhost`).

## Brand

- Burgundy `#7A1F2A` · Gold `#C8A34D` · Accent `#2563EB` · Canvas `#F8FAFC` · Radius 18px
