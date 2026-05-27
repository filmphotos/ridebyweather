# RideByWeather — Setup Guide

## Prerequisites

1. **Node.js 20+** — Download from https://nodejs.org (LTS recommended)
2. **PostgreSQL** — Download from https://postgresql.org or use Docker:
   ```
   docker run --name ridebyweather-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ridebyweather -p 5432:5432 -d postgres:16
   ```
3. **Redis** (optional for MVP, used for caching) — Download from https://redis.io or Docker:
   ```
   docker run --name ridebyweather-redis -p 6379:6379 -d redis:7-alpine
   ```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
copy .env.example .env.local
```
Edit `.env.local` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `OPENWEATHER_API_KEY` — free key from https://openweathermap.org/api (One Call API 3.0)
- `NEXT_PUBLIC_MAPBOX_TOKEN` — from https://mapbox.com (free tier available)

> **Note:** The app works WITHOUT API keys using mock weather data. You can skip OPENWEATHER_API_KEY for initial testing.

### 3. Set up the database
```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to PostgreSQL
```

### 4. Run the development server
```bash
npm run dev
```

Open http://localhost:3000

---

## Storm / Lightning Push Notifications

The app can push a `⚡ Storm alert` to a user's device when a thunderstorm is detected at or near their location within the next ~3 hours.

### One-time VAPID key generation
```bash
npx web-push generate-vapid-keys
```
Add the output to `.env.local` and to Vercel project env:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:alerts@yourdomain.com
CRON_SECRET=<long-random-string>
```

### How it works
- User opts in from **Settings → Notifications → Storm & lightning alerts**, which grabs their geolocation and stores a Web Push subscription via `POST /api/push/subscribe`.
- A Vercel Cron job (see `vercel.json`, every 15 min) hits `GET /api/push/check-storms` with `Authorization: Bearer $CRON_SECRET`.
- The handler fetches weather for each opted-in location, calls `detectStorm()`, and sends one push per device via `web-push`. A 60-minute suppression window prevents duplicate alerts.
- The service worker (`/public/sw.js`) shows the notification and focuses the app on click.

### Manual test
1. Open Settings → Notifications → toggle on, grant the permission prompt.
2. Click **Send test alert** — you should see `⚡ Test storm alert` on the device.
3. To dry-run the cron locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/push/check-storms`.

---

## Project Structure

```
src/
├── app/
│   ├── cycling/          ← Main MVP dashboard
│   ├── running/          ← Phase 2 placeholder
│   ├── pricing/          ← Subscription plans
│   └── api/
│       ├── ride-score/   ← GET ?lat=&lng=&routeBearing=
│       ├── weather/forecast/ ← GET ?lat=&lng=&hours=
│       └── stripe/webhook/   ← Stripe billing events
├── components/
│   ├── RideScore/        ← Gauge + breakdown
│   ├── WeatherCard/      ← Current conditions
│   ├── WeatherAvatar/    ← Gear recommendations
│   └── Forecast/         ← 24h timeline
└── lib/
    ├── ride-score.ts     ← Core algorithm (0–10)
    ├── weather.ts        ← Provider abstraction
    ├── db.ts             ← Prisma singleton
    └── utils.ts          ← Helpers
```

## Ride Score Algorithm

Cycling weights:
- **Wind Impact: 40%** (headwind %, crosswind instability, gust ratio)
- **Temperature: 20%** (ideal 55–68°F, exponential decay outside)
- **Precipitation: 15%** (probability × intensity)
- **Gust Factor: 10%** (gust/sustained ratio penalty)
- **Humidity: 10%** (comfort multiplier)
- **Safety Override: 5%** (storm/ice caps score ≤ 3)

## Android App (Capacitor)

The Next.js web app is wrapped as a native Android app via Capacitor. The shell loads `https://ridebyweather.com` (configured in `capacitor.config.ts`), so the Play Store build always reflects the live site.

### Prerequisites (one-time)

1. **JDK 21** — install Temurin: https://adoptium.net (or `winget install EclipseAdoptium.Temurin.21.JDK`)
2. **Android Studio** — https://developer.android.com/studio (includes Android SDK + emulator)
3. Set `JAVA_HOME` to the JDK install path; restart shell.

### Build & run

```bash
npm run android:sync   # copy web assets + plugin config into android/
npm run android:open   # open android/ in Android Studio
npm run android:run    # build + install on connected device/emulator
```

In Android Studio: **Build → Generate Signed Bundle/APK** to produce a Play Store `.aab`.

### Changing the loaded URL

Edit `server.url` in `capacitor.config.ts` (e.g. point at a staging deploy), then `npm run android:sync`.

## Next Steps (Phase 2)

- [ ] Auth (NextAuth.js + JWT)
- [ ] Route drawing on Mapbox map
- [ ] Per-segment headwind/tailwind visualization
- [ ] Strava OAuth integration
- [ ] Running score page
- [ ] Admin dashboard
- [ ] Garmin Connect IQ data push
