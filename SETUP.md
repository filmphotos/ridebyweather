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

## Next Steps (Phase 2)

- [ ] Auth (NextAuth.js + JWT)
- [ ] Route drawing on Mapbox map
- [ ] Per-segment headwind/tailwind visualization
- [ ] Strava OAuth integration
- [ ] Running score page
- [ ] Admin dashboard
- [ ] Garmin Connect IQ data push
