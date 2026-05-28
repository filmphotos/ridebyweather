# RideByWeather — Garmin Connect IQ app

A glanceable ride/heat-risk app for **Garmin Edge bike computers and watches**,
written in Monkey C. Same backend as the phone + Wear OS apps — it logs in with
your account and shows the score for your current GPS spot, in its risk color
(red = dangerous), with the current temperature. Tap / press select to refresh.

> ✅ **Compiles cleanly for the Edge 530** (verified with Connect IQ SDK 9.1.0).
> Built artifact: `bin/RideByWeather.prg`. Runtime behavior on a physical device
> is not yet exercised — see "Put it on a real device" below.
>
> Working CLI build used (developer key kept outside the repo):
> ```
> "%APPDATA%\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-9.1.0-*\bin\monkeyc.bat" ^
>   -d edge530 -f monkey.jungle -o bin\RideByWeather.prg ^
>   -y C:\Users\dell\ConnectIQ\developer_key
> ```

---

## What it does

- Reads your location (`Positioning` permission)
- Logs in to `POST /api/auth/login` with the email/password you set in settings,
  caches the returned token in app `Storage`
- Calls `GET /api/ride-score?lat&lng` with `Authorization: Bearer <token>`
- Draws the score + label + temp, colored by risk

One codebase covers **Edge** units and **Garmin watches** (see `<iq:products>`
in `manifest.xml` — add or remove devices there).

## Prerequisites

1. **Garmin Connect IQ SDK** — install the **SDK Manager** from
   <https://developer.garmin.com/connect-iq/sdk/> (needs a free Garmin account),
   then download a current SDK + the device files for your target(s).
2. **VS Code** + the **Monkey C** extension (publisher: Garmin).
3. A **developer key** (one-time):
   - In VS Code: `Ctrl+Shift+P` → **Monkey C: Generate a Developer Key**, or
   - CLI: `openssl genrsa -out developer_key.pem 4096` then
     `openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem -out developer_key -nocrypt`
   - Point the extension at it (`Monkey C: Set developer key`). **Never commit
     this key** (already in `.gitignore`).

## Build & run in the simulator

1. Open the `garmin/` folder in VS Code.
2. `Ctrl+Shift+P` → **Monkey C: Build Current Project** (or **Run** to launch
   the Connect IQ simulator).
3. In the simulator: **Settings → set a position** (so GPS returns a fix), then
   exercise the app. Use the simulator's app settings to enter your email /
   password / URL.

CLI alternative (paths vary by OS/SDK version):
```bash
monkeyc -d edge840 -f monkey.jungle -o bin/RideByWeather.prg -y developer_key
connectiq            # starts the simulator
monkeydo bin/RideByWeather.prg edge840
```

## Put it on a real device (sideload)

1. Build for your specific device: select it in the VS Code build target, or
   `monkeyc -d <deviceId> ... -o bin/RideByWeather.prg -y developer_key`.
2. Connect the Edge/watch via USB; it mounts as a drive.
3. Copy `bin/RideByWeather.prg` to the device's **`GARMIN/APPS/`** folder.
4. Eject. The app appears in the device's Connect IQ apps / activities list.

## Sign in (QR device pairing)

No password is stored on the device. On first launch the app:
1. Requests a short pairing **code** from the backend and shows it as a **QR**.
2. You **scan the QR with your phone** (or open `ridebyweather.com/link` and type
   the code). You log in there once and tap **Approve**.
3. The device is **polling** in the background; once approved it receives a
   token, stores it on-device, and shows your score.

This needs the backend pieces deployed:
- API routes: `/api/device/code`, `/api/device/approve`, `/api/device/poll`,
  `/api/device/qr`
- Page: `/link`
- DB table: run `prisma/migrations/device_pairings.sql` against the Postgres DB
  (or `prisma db push`)

The optional **Server URL** setting (Garmin Connect → Connect IQ app settings)
lets you point at a non-default backend; changing it clears the cached token.

## Project layout

```
garmin/
  manifest.xml          app id, type, products, permissions
  monkey.jungle         build config
  resources/
    strings/strings.xml
    drawables/          launcher_icon.png + drawables.xml
    settings/           settings.xml (UI) + properties.xml (defaults)
  source/
    RbwApp.mc           AppBase entry point
    RbwView.mc          renders score/label/temp in color
    RbwDelegate.mc      tap / select -> refresh
    Api.mc              login + ride-score over HTTP, GPS
```

## Next ideas

- A **data field** variant so the score shows on a data screen *during* a ride
  on Edge (most-used surface for cyclists).
- Background fetch + a **complication/glance** for at-a-glance risk.
- Headwind/tailwind using heading vs. wind direction (API accepts `routeBearing`).
