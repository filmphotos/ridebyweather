# RideByWeather — Wear OS app (Galaxy Watch 4)

A glanceable companion for the RideByWeather phone app. The **phone stays the
brain** (routes, payments, settings, group rides); the **watch is a dashboard**
you check in 1–2 seconds:

- Big color-coded **ride/heat-risk score** for your current GPS spot
- **Temp / feels-like / humidity** and **wind** (speed, direction, gust)
- **Nearest ER / urgent care**, tap to open turn-by-turn directions
- Sign in once on the watch; it talks to your existing backend

This is a **separate native app** (Kotlin + Jetpack Compose for Wear OS). It is
*not* part of the Capacitor `android/` build — different platform, different UI.

---

## How it talks to the backend

The watch calls two endpoints on your deployed server:

| Endpoint | Use |
|---|---|
| `POST /api/auth/login` | Sign in; returns a JWT in the JSON body (added for non-browser clients) |
| `GET /api/ride-score?lat&lng[&routeBearing]` | Score + current weather |
| `GET /api/medical?lat&lng&radius` | Nearest hospitals / urgent care |

All authenticated calls send `Authorization: Bearer <token>`. The token is the
same 30-day JWT the website issues — the API routes now accept it via either the
`rbw_token` cookie (web) **or** the Bearer header (watch). See
`src/lib/auth.ts` → `getTokenFromRequest` / `getAuthPayload`.

---

## Prerequisites

- **Android Studio** (Ladybug 2024.2 or newer)
- **JDK 17** (bundled with recent Android Studio)
- A **Galaxy Watch 4** (Wear OS 3 / API 30) — or the Wear OS emulator
- Your backend reachable over HTTPS (e.g. the Vercel deployment)

---

## 1. Set the server URL

Default is `https://ridebyweather.com`. To change the compiled-in default, edit
`app/build.gradle.kts`:

```kotlin
buildConfigField("String", "DEFAULT_BASE_URL", "\"https://your-domain.com\"")
```

You can also override it at runtime on the watch under **Settings → Server URL**
(handy for pointing at a staging/LAN server). Note: a phone-paired watch on
Wi-Fi can reach `https://` public URLs fine; reaching your laptop's
`http://192.168.x.x:3000` requires the dev server bound to `0.0.0.0` and the
watch on the same network.

## 2. Open & build

1. In Android Studio: **File → Open** → select the `wear/` folder (not the repo
   root).
2. Let Gradle sync. Android Studio will fetch Gradle 8.11.1 and generate the
   wrapper automatically. (CLI alternative if you have Gradle installed:
   `cd wear && gradle wrapper --gradle-version 8.11.1`, then `./gradlew assembleDebug`.)
3. Build → **Make Project** to confirm it compiles.

The debug APK lands at `wear/app/build/outputs/apk/debug/app-debug.apk`.

## 3. Install on the Galaxy Watch 4

**On the watch (one-time):**
1. Settings → About watch → Software → tap **Software version** 7× to unlock
   Developer options.
2. Settings → Developer options → enable **ADB debugging** and **Debug over
   Wi-Fi**. Note the IP shown (e.g. `192.168.1.42:5555`).
3. Keep the watch on the **same Wi-Fi** as your computer.

**On your computer:**
```bash
adb connect 192.168.1.42:5555      # use the IP from the watch
adb devices                         # confirm the watch shows up
adb install -r wear/app/build/outputs/apk/debug/app-debug.apk
```

Or just press **Run ▶** in Android Studio with the watch selected as the target
device — it installs and launches automatically.

> First connection prompts "Allow debugging?" on the watch — tap **Always
> allow** then re-run `adb connect`.

## 4. First launch

1. Open **RideByWeather** from the watch app list.
2. Tap **Sign in**, enter your account email + password (uses the watch
   keyboard / voice input). The watch stores the returned token locally.
3. Allow **location** when prompted.
4. The dashboard loads your score + weather. **Refresh** re-pulls; **Nearest
   ER** lists facilities and taps through to directions.

---

## What's intentionally NOT on the watch

Route planning, maps, Stripe/checkout, group rides, signup, admin — those stay
on the phone. A 1.4" round screen is a glance device; cramming the full app onto
it would make all of it worse. This mirrors how Strava/Komoot/Wahoo split phone
vs. watch.

## Ideas for next iterations

- **Tile** (swipe-left dashboard) and a **watch-face complication** that turns
  red when heat risk crosses a threshold — needs `androidx.wear.tiles` /
  `androidx.wear.watchface`.
- **Headwind/tailwind arrow** using device bearing vs. wind direction (the API
  already accepts `routeBearing`).
- **Background heat alert** that buzzes the wrist when risk crosses red
  mid-ride.
- **Garmin Connect IQ port** (Monkey C) to cover Garmin Edge bike computers +
  Garmin watches from the same backend.

## Project layout

```
wear/
  settings.gradle.kts, build.gradle.kts, gradle.properties
  app/
    build.gradle.kts
    src/main/
      AndroidManifest.xml
      res/…                       (theme, strings, launcher icon)
      java/com/ridebyweather/wear/
        MainActivity.kt           host + location permission
        MainViewModel.kt          state, refresh, login, hospitals
        data/
          Models.kt               @Serializable API models
          RbwApi.kt               OkHttp client (login, ride-score, medical)
          SettingsStore.kt        DataStore: base URL + token
        location/LocationHelper.kt  FusedLocation → current fix
        presentation/
          WearApp.kt              swipe-dismiss navigation
          DashboardScreen.kt      score + weather + nav chips
          HospitalScreen.kt       nearest care + directions
          SettingsScreen.kt       server URL, sign in/out, login form
          UiUtils.kt              color/format helpers
```
