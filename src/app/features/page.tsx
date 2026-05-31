import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features — RideByWeather",
  description:
    "Explore every feature in RideByWeather: Ride Score, wind-aware routing, gear recommendations, group rides, multi-sport support, and device integrations.",
};

const rideScoreFactors = [
  { label: "Wind", weight: 40, color: "#0ea5e9" },
  { label: "Temperature", weight: 20, color: "#22c55e" },
  { label: "Precipitation", weight: 15, color: "#6366f1" },
  { label: "Gusts", weight: 10, color: "#f59e0b" },
  { label: "Humidity", weight: 10, color: "#a855f7" },
  { label: "Safety", weight: 5, color: "#ef4444" },
];

const detailedFeatures = [
  {
    icon: "🤖",
    title: "AI Ride Assistant",
    tagline: "Ask anything. Get answers from your real forecast.",
    description:
      "A chat assistant powered by Claude that knows your saved spots, your current conditions, and the next 36 hours of weather. Ask what to wear, when to leave, or which spot has the best window — no generic AI weather hallucinations.",
    bullets: [
      "Grounded in your actual forecast and Ride Scores",
      "Knows your saved ride spots and recommends across them",
      "Specific clothing suggestions, not vague \"warm layers\"",
      "Streams answers token-by-token",
    ],
    proBadge: true,
  },
  {
    icon: "📍",
    title: "Where Should I Ride?",
    tagline: "Rank your favorite spots by today's best window.",
    description:
      "Save up to 10 ride starting points — home, the trailhead, the cabin — and the scanner ranks them by upcoming 2-hour Ride Score. Tomorrow's best window: Lake Loop 8.4. The shortcut for riders with options.",
    bullets: [
      "Up to 10 saved spots (Free includes 1)",
      "Parallel forecast scan across every spot",
      "Top-pick callout with temp, wind, and score",
      "One-tap rescan whenever the forecast moves",
    ],
    proBadge: true,
  },
  {
    icon: "⏱️",
    title: "24-Hour Route Forecast",
    tagline: "Find the best departure window for THIS route.",
    description:
      "Pick any route on the map and see a 24-bar timeline of Ride Scores — each hour scored against your actual segments and the wind at that hour. The bar chart shows exactly when to leave for the tailwind home.",
    bullets: [
      "Route-aware scoring (your bearings × the hour's wind)",
      "Best departure highlighted with score + conditions",
      "Click any bar for full conditions detail",
      "Works on saved routes and freshly drawn ones",
    ],
    proBadge: true,
  },
  {
    icon: "🌬️",
    title: "Daily Best-Window Push",
    tagline: "Tomorrow's perfect ride window, delivered overnight.",
    description:
      "Each evening you get one push notification with tomorrow's best contiguous 2-hour riding window. Only fires when conditions are actually good — no spam on rainy weeks.",
    bullets: [
      "Score-threshold gated (sends only when ≥ GOOD)",
      "Per-location: uses your saved push location",
      "Includes temp, wind, and condition summary",
      "Independent of storm alerts — toggle separately",
    ],
    proBadge: true,
  },
  {
    icon: "🌡️",
    title: "Ride Score (0–10)",
    tagline: "One number, all the signal.",
    description:
      "Six weather factors weighted into a single, glanceable score. No more squinting at six different forecasts to decide if today's a ride day.",
    bullets: [
      "Updated every hour from live weather data",
      "Color-coded thresholds — green to red at a glance",
      "Per-sport tuning for cycling, running, and walking",
    ],
  },
  {
    icon: "🌬️",
    title: "Wind-Aware Routing",
    tagline: "Know the headwind before you start.",
    description:
      "Every saved route is analyzed segment-by-segment against live wind direction and speed. See exactly which legs will hurt.",
    bullets: [
      "Headwind / tailwind / crosswind percentage per segment",
      "Auto reverse route suggestion when wind flips",
      "Out-and-back recommendation engine",
    ],
    proBadge: true,
  },
  {
    icon: "👕",
    title: "Gear Recommendations",
    tagline: "Show up dressed right.",
    description:
      "A weather-driven avatar shows the exact layers, gloves, eyewear, and shoe choices for current conditions — no more sweating up climbs in a winter jacket.",
    bullets: [
      "Base, mid, and outer layer suggestions",
      "Glove, eyewear, and footwear thresholds",
      "Rain, snow, sun, wind, and night variants",
    ],
  },
  {
    icon: "📡",
    title: "Hourly Forecast Timeline",
    tagline: "Find the window.",
    description:
      "48 hours of Ride Score plotted as a color bar. Spot the 3-hour gap between storms or the quiet evening lull instantly.",
    bullets: [
      "48-hour color-coded score strip",
      "Tap any hour for full forecast detail",
      "Best-window highlighting",
    ],
    proBadge: true,
  },
  {
    icon: "🗺️",
    title: "Route Planning & Elevation",
    tagline: "Build smarter, not harder.",
    description:
      "Draw routes on the map, view elevation and gradient profiles, and overlay wind direction across the whole loop before you commit.",
    bullets: [
      "Mapbox-powered route drawing",
      "Elevation and gradient charting",
      "Per-segment wind overlay",
    ],
  },
  {
    icon: "👥",
    title: "Group Rides",
    tagline: "Get the crew out together.",
    description:
      "Create or join scheduled group rides with a shared Ride Score, RSVP list, and chat. Everyone sees the same forecast before showing up.",
    bullets: [
      "Public or private ride creation",
      "Per-ride RSVP and roster",
      "Shared forecast at start time",
    ],
  },
  {
    icon: "🏃",
    title: "Multi-Sport Support",
    tagline: "One app, every cardio session.",
    description:
      "Cycling, running, and walking each have their own dashboards tuned to the weather factors that actually matter for that sport.",
    bullets: [
      "Cycling: wind-weighted scoring",
      "Running: heat & humidity priority",
      "Walking: gentler thresholds, kid-friendly",
    ],
  },
  {
    icon: "⌚",
    title: "Device Integrations",
    tagline: "Your head unit. Your wrist. Your call.",
    description:
      "Push live weather and storm alerts to Garmin and Wahoo head units soon.",
    bullets: [
      "Garmin & Wahoo push alerts (coming soon)",
      "Storm warning push notifications",
    ],
    proBadge: true,
  },
  {
    icon: "⚖️",
    title: "E-Bike Law Reference",
    tagline: "Know before you go.",
    description:
      "State-by-state guide to US e-bike classifications, helmet rules, age minimums, and where each class is allowed on paths and trails.",
    bullets: [
      "All 50 states + federal land summary",
      "Class 1, 2, 3 path-access breakdown",
      "Helmet and minimum-age lookups",
    ],
  },
  {
    icon: "📱",
    title: "Installable PWA",
    tagline: "Home screen, offline-ready.",
    description:
      "RideByWeather installs to your phone like a native app — no app store needed. Push notifications, full-screen UI, and a custom icon.",
    bullets: [
      "iOS and Android home-screen install",
      "Push storm alerts opt-in",
      "Works on flaky cell coverage",
    ],
  },
  {
    icon: "⛈️",
    title: "Storm Push Alerts",
    tagline: "Get warned before the radar lights up.",
    description:
      "Opt in to push notifications and we'll ping you when a storm cell, lightning risk, or gust front is heading toward your saved routes.",
    bullets: [
      "Lightning, gust, and heavy-rain triggers",
      "Per-route geofencing",
      "Silent overnight by default",
    ],
  },
  {
    icon: "🎬",
    title: "Live Ride Mode",
    tagline: "One screen, the whole ride.",
    description:
      "Start a ride session and the screen stays awake with current conditions, the next-hour outlook, and a re-route prompt if wind shifts mid-loop.",
    bullets: [
      "Wake-lock keeps the screen on",
      "Mid-ride wind-shift detection",
      "Big-touch UI for jersey pockets",
    ],
  },
  {
    icon: "🏪",
    title: "Bike Shop & Partner Map",
    tagline: "Mechanics, coffee, and water — on the route.",
    description:
      "Find bike shops, cafés, and rest stops near your route or current location. Enterprise partners surface with branded pins and offers.",
    bullets: [
      "OSM, Foursquare, and Yelp sources",
      "Filter by mechanic, café, or water",
      "Enterprise partner listings",
    ],
  },
  {
    icon: "📍",
    title: "Auto-Located Forecast",
    tagline: "Open the app, see your weather.",
    description:
      "We detect your city on first load via IP, then upgrade to precise GPS once you grant location. No setup, no zip-code typing.",
    bullets: [
      "Instant IP-based starting city",
      "GPS upgrade on permission grant",
      "Manual override any time",
    ],
  },
  {
    icon: "⚙️",
    title: "Units & Preferences",
    tagline: "Your bike, your numbers.",
    description:
      "Toggle metric or imperial, °F or °C, mph or km/h. Set your wind tolerance, cold threshold, and rain aversion — the Ride Score tunes to you.",
    bullets: [
      "Metric / imperial toggle",
      "Personal weather thresholds",
      "Per-sport defaults",
    ],
  },
  {
    icon: "🆘",
    title: "Emergency & Medical Lookups",
    tagline: "If the ride goes sideways.",
    description:
      "Find the nearest urgent care, hospital, or pharmacy from your current location — useful for mechanicals far from home or a crash on a backroad.",
    bullets: [
      "Hospital, urgent care, pharmacy filters",
      "Distance and routing from current GPS",
      "Offline-cached for last-known route",
    ],
  },
  {
    icon: "🌫️",
    title: "Air Quality Monitoring",
    tagline: "Breathe before you boast.",
    description:
      "AQI pulled into the Ride Score so smoke, smog, or pollen days don't blindside you. Categorical warnings for sensitive groups.",
    bullets: [
      "PM2.5, ozone, and NO₂ tracking",
      "Wildfire-smoke alert thresholds",
      "Sensitive-group warning toggle",
    ],
  },
  {
    icon: "☀️",
    title: "UV Index & Sun Safety",
    tagline: "Sunscreen is gear too.",
    description:
      "Hourly UV index folded into the avatar — get a sunscreen, sleeves, or eyewear reminder when the burn potential spikes.",
    bullets: [
      "Hourly UV forecast",
      "Sleeve and sunscreen prompts",
      "Eyewear tint suggestions",
    ],
  },
  {
    icon: "🌅",
    title: "Sunrise / Sunset Planner",
    tagline: "Catch the golden hour.",
    description:
      "Plan dawn patrol or evening loops with exact civil-twilight windows. Get a low-light gear reminder when lights become legally required.",
    bullets: [
      "Civil-twilight start and end",
      "Lights-required notification",
      "Golden-hour photo window",
    ],
  },
  {
    icon: "💧",
    title: "Heat Index & Hydration Coach",
    tagline: "Drink before you crack.",
    description:
      "Heat index, wet-bulb temp, and humidity-adjusted hydration targets — based on duration and intensity of your planned ride.",
    bullets: [
      "Wet-bulb risk thresholds",
      "Bottle-count recommendation",
      "Electrolyte vs water guidance",
    ],
  },
  {
    icon: "🗓️",
    title: "Multi-Day Tour Planner",
    tagline: "Pack for the whole trip.",
    description:
      "Bike-touring or a weekend training block? See the full week of Ride Scores across multiple stops and pack gear for the worst day.",
    bullets: [
      "7-day score across a route",
      "Multi-stop aggregation",
      "Pack-list export",
    ],
    proBadge: true,
  },
  {
    icon: "⚖️",
    title: "Compare Two Locations",
    tagline: "Should I drive 40 miles for sun?",
    description:
      "Side-by-side Ride Scores for any two cities. Settle the \"is it nicer at the coast today\" debate in 5 seconds.",
    bullets: [
      "Dual forecast panels",
      "Score delta highlighted",
      "Save favorite comparisons",
    ],
    proBadge: true,
  },
  {
    icon: "🚲",
    title: "Bike Type Profiles",
    tagline: "Road, gravel, MTB, e-bike — different math.",
    description:
      "Pick the bike you're riding today and the Ride Score retunes. Road bikes hate crosswinds; gravel bikes shrug them off; e-bikes care about charge weather.",
    bullets: [
      "Road, gravel, MTB, commuter, e-bike",
      "Per-bike threshold defaults",
      "Save multiple bike profiles",
    ],
  },
  {
    icon: "📆",
    title: "Calendar Sync for Group Rides",
    tagline: "Put it on the family calendar.",
    description:
      "Group rides export to Apple, Google, and Outlook calendars with one tap. Reminders include the live Ride Score at start time.",
    bullets: [
      "iCal / .ics export",
      "Auto-update on time changes",
      "Score-at-start in the event note",
    ],
  },
  {
    icon: "🚲",
    title: "Commute Mode",
    tagline: "Morning ride out + evening ride home, side by side.",
    description:
      "Two cards: AM departure and PM return, with the delta highlighted. The single best feature for daily bike commuters — no more guessing whether to bring rain gear.",
    bullets: [
      "Set your own AM and PM times",
      "PM-vs-AM delta in one number",
      "Plain-language verdict each morning",
    ],
  },
  {
    icon: "💰",
    title: "Bike vs Drive",
    tagline: "Real cost of skipping the bike today.",
    description:
      "Today's gas saved, IRS-rate cost saved, CO₂ avoided, and calories burned — for your commute. Daily, weekly, and yearly views.",
    bullets: [
      "Round-trip dollars and gas",
      "EPA-grade CO₂ accounting",
      "Per-mile calorie burn",
    ],
  },
  {
    icon: "🛞",
    title: "Tire Pressure Calculator",
    tagline: "Front and rear PSI, tuned to today.",
    description:
      "Silca-style pressure model — your system weight, tire width, surface, and tubeless setup. Front and rear PSI with the right 48/52 split.",
    bullets: [
      "Smooth, rough, wet, gravel, MTB surfaces",
      "Tubeless adjustment",
      "Wet-road grip drop built in",
    ],
  },
  {
    icon: "⛓️",
    title: "Chain Lube Selector",
    tagline: "Wet, dry, or ceramic — decided.",
    description:
      "Pulls the next 7 days of precip and picks the right lube. Stops the wet-vs-dry argument; matches the week, not your last guess.",
    bullets: [
      "Wet days vs total days",
      "Ceramic-wax window detection",
      "Re-lube reminders after rain rides",
    ],
  },
  {
    icon: "🛣️",
    title: "Road Conditions",
    tagline: "Wet pavement, frost, and ice risk.",
    description:
      "Derived from the same hourly forecast that powers your Ride Score. 12-hour outlook for wet, drying, frost-risk, and ice windows.",
    bullets: [
      "Wet-now and wet-soon advisories",
      "Black-ice and frost detection",
      "Per-hour visual strip",
    ],
  },
  {
    icon: "🗓️",
    title: "Event Countdown",
    tagline: "Pin a race date, watch the forecast trajectory.",
    description:
      "Race, gran fondo, century, big group ride — pin it. Once it enters the 14-day window the daily score appears, and you can plan your taper around the weather.",
    bullets: [
      "Persistent pin",
      "14-day score trajectory",
      "Event-day breakout card",
    ],
    proBadge: true,
  },
  {
    icon: "🔧",
    title: "Service Intervals",
    tagline: "Drivetrain, brakes, tires — never overdue.",
    description:
      "Log lifetime miles, track miles since each component was serviced. Smart defaults for chain, cassette, brake pads (rim & disc), tires, cables, bar tape, and tubeless sealant.",
    bullets: [
      "Color-coded due / overdue status",
      "Quick + miles and bulk mileage entry",
      "Per-component last-done tracking",
    ],
  },
  {
    icon: "🌼",
    title: "Pollen Index",
    tagline: "Grass, tree, weed, ragweed — covered.",
    description:
      "Allergy-sensitive riders need pollen, not just AQI. Per-type breakdown plus a peak grains/m³ figure with rider impact.",
    bullets: [
      "Grass, tree, weed, birch, alder, ragweed",
      "Hourly average — peak picked for the day",
      "Allergy-friendly riding advice",
    ],
  },
  {
    icon: "🫁",
    title: "Sensitive Lungs Mode",
    tagline: "Asthma-aware ride verdict.",
    description:
      "Combines AQI, humidity, cold-air bronchospasm risk, ozone, and pollen into one safety call. Built for riders with exercise-induced bronchospasm or asthma.",
    bullets: [
      "Trigger-by-trigger breakdown",
      "Pre-medication reminders",
      "Stay-inside threshold",
    ],
  },
  {
    icon: "👨‍👩‍👧",
    title: "Family Mode",
    tagline: "Kid- and trailer-friendly verdict.",
    description:
      "Gentler thresholds. Wind matters more (trailers act like sails), gusts matter a lot, cold matters more. One verdict before you load the kids.",
    bullets: [
      "Trailer wind-modifier",
      "Tighter feels-like comfort band",
      "Stroller-friendly walking score",
    ],
  },
  {
    icon: "📅",
    title: "On This Day",
    tagline: "What today's weather did, the last 5 years.",
    description:
      "Open-Meteo archive: high/low temp, max wind, precip on today's date in each of the last 5 years, plus a 5-year mean. Useful for trip planning and pure nostalgia.",
    bullets: [
      "Year-by-year history",
      "5-year mean for the date",
      "Free, no key needed",
    ],
  },
  {
    icon: "🎙️",
    title: "Morning Briefing",
    tagline: "20-second spoken summary + shareable card.",
    description:
      "A four-sentence forecast briefing read aloud through SpeechSynthesis, plus a download-as-PNG square card for sharing. The fastest path to today's plan.",
    bullets: [
      "Browser TTS playback",
      "Auto-rendered square card",
      "Brand mark + score ring",
    ],
  },
  {
    icon: "🏠",
    title: "Indoor Fallback",
    tagline: "When the score crashes, ride inside on purpose.",
    description:
      "Matches an indoor workout (recovery, endurance, sweet-spot, threshold, or VO2) to the duration you would have ridden outside. Curated, TSS-aware library.",
    bullets: [
      "Duration-matched picks",
      "TSS estimates per workout",
      "Auto-suggests easier options when conditions are bad",
    ],
  },
  {
    icon: "🕳️",
    title: "Hazard Pins",
    tagline: "Potholes, debris, glass, closures.",
    description:
      "Drop a pin where the road bites. Pins expire after 30 days so the map stays current. Phase 1 saves locally on your device; community sync comes next.",
    bullets: [
      "5 hazard types",
      "GPS-grab one-tap",
      "Auto-expiry keeps map clean",
    ],
  },
  {
    icon: "🎁",
    title: "Referral Credit",
    tagline: "Refer a friend, both get Pro free.",
    description:
      "Share your invite link — when a friend signs up, you each get a free month of Pro on us. Native share and email built in.",
    bullets: [
      "Personal short code per user",
      "Web Share API + email fallback",
      "Tracked for credit on first upgrade",
    ],
  },
  {
    icon: "✉️",
    title: "Weekly Digest Email",
    tagline: "Sunday: this week's best ride day.",
    description:
      "Per-user weekly summary emailed Sunday morning. 7-day Ride Score forecast with the best day highlighted plus full conditions.",
    bullets: [
      "Best ride day callout",
      "Day-by-day score table",
      "Sent at your saved location",
    ],
  },
  {
    icon: "⚡",
    title: "Lightning Map",
    tagline: "Storm cells, 30-30 rule, get-indoors call.",
    description:
      "12-hour thunderstorm awareness with the 30-30 safety rule baked in. Live strike feed wired and ready for the Vaisala / Blitzortung integration.",
    bullets: [
      "Storm-now / arrives-in advisory",
      "Hour-by-hour strike strip",
      "Lightning safety reminders",
    ],
  },
  {
    icon: "📖",
    title: "City Ride Guides",
    tagline: "Curated rides, season by season.",
    description:
      "Hand-written guides for Portland, Boulder, NYC, SF, Austin, and Chicago. Climatology, season-by-season tips, and signature rides with wind-direction tactics.",
    bullets: [
      "Public, SEO-indexable",
      "Signature rides per city",
      "Best-wind-direction tactics",
    ],
  },
  {
    icon: "🔒",
    title: "Bike Theft Hotspots",
    tagline: "Where not to lock up.",
    description:
      "Neighborhood-level risk index for major US cycling cities. Decide whether to lock outside or bring the bike inside before you ride downtown.",
    bullets: [
      "0–10 risk score per neighborhood",
      "Lock-strategy advice per area",
      "City open-data integrations next",
    ],
  },
  {
    icon: "🔋",
    title: "E-Bike Range Calculator",
    tagline: "Real miles, not the brochure number.",
    description:
      "Folds today's wind, temperature, your weight, assist level, and total climbing into a personalized range estimate — with drains and boosts itemized.",
    bullets: [
      "Wind, cold, weight, climb factors",
      "Eco/Tour/Sport/Turbo PAS levels",
      "Headwind projection from route bearing",
    ],
  },
  {
    icon: "☕",
    title: "Caffeine Timing",
    tagline: "Peak plasma at the start line.",
    description:
      "Plan your coffee, espresso, or pre-workout so peak performance hits when you clip in. Dose calibrated to your weight, top-up for long rides included.",
    bullets: [
      "45-min pre-ride intake target",
      "Weight-based 3–6 mg/kg dosing",
      "Mid-ride top-up for 2h+ efforts",
    ],
  },
  {
    icon: "🔥",
    title: "Streaks & Achievements",
    tagline: "Make every ride count.",
    description:
      "Log a ride, build a streak, unlock weather-class badges — cold rides, dawn patrols, gale warriors. Saved locally, social comparison comes next.",
    bullets: [
      "Current and longest streak tracking",
      "16 weather-class achievements",
      "Quick post-ride log form",
    ],
  },
  {
    icon: "🔦",
    title: "Pre-Sunset Lights Reminder",
    tagline: "Charge before you ride into the dark.",
    description:
      "Opt in to a push at 15/30/45/60 min before civil sunset: light battery check, reflective layer reminder. Runs from your saved push location.",
    bullets: [
      "Configurable lead time",
      "Honors local sunset, not server time",
      "Independent from storm/window alerts",
    ],
  },
  {
    icon: "📦",
    title: "Cargo & Loaded Bike Profiles",
    tagline: "Long-tail, box, panniers — Ride Score retunes.",
    description:
      "Cargo bikes and loaded commuters are sail-shaped and gust-sensitive. The Ride Score now applies an extra gust penalty so the verdict matches what it actually feels like.",
    bullets: [
      "New cargo and loaded-commuter profiles",
      "Gust-extra penalty for sail-shaped loads",
      "Plays directly into your Ride Score",
    ],
  },
  {
    icon: "🚧",
    title: "Bike Lane Closures",
    tagline: "Know the detour before you leave.",
    description:
      "Hand-curated bike lane and multi-use trail closures for major US cycling cities — with severity, reason, and end date. City open-data feeds plug in next.",
    bullets: [
      "Advisory / Partial / Full classification",
      "Source links where available",
      "Crowdsource via email next",
    ],
  },
  {
    icon: "🟠",
    title: "Strava Calibration",
    tagline: "Personal thresholds from your real rides.",
    description:
      "Connect Strava and we import your last 90 days. The Ride Score retunes to your actual tolerance — not the generic baseline. OAuth ready.",
    bullets: [
      "Read-only — never posts to your profile",
      "Last 90 days of activity types",
      "Per-sport threshold retuning",
    ],
    proBadge: true,
  },
];

// Each advertised feature maps to the page that actually delivers it. Features
// without an entry (e.g. Device Integrations) are genuinely not live yet.
const featureLinks: Record<string, string> = {
  "AI Ride Assistant": "/ask",
  "Where Should I Ride?": "/spots",
  "24-Hour Route Forecast": "/routes",
  "Daily Best-Window Push": "/settings",
  "Ride Score (0–10)": "/ride-score",
  "Wind-Aware Routing": "/routes",
  "Gear Recommendations": "/gear",
  "Hourly Forecast Timeline": "/forecast",
  "Route Planning & Elevation": "/routes",
  "Group Rides": "/group-rides",
  "Multi-Sport Support": "/running",
  "E-Bike Law Reference": "/ebike-laws",
  "Storm Push Alerts": "/settings",
  "Live Ride Mode": "/ride",
  "Bike Shop & Partner Map": "/bike-shops",
  "Auto-Located Forecast": "/cycling",
  "Units & Preferences": "/settings",
  "Emergency & Medical Lookups": "/hospitals",
  "Air Quality Monitoring": "/air-quality",
  "UV Index & Sun Safety": "/sun",
  "Sunrise / Sunset Planner": "/sun",
  "Heat Index & Hydration Coach": "/hydration",
  "Multi-Day Tour Planner": "/tour",
  "Compare Two Locations": "/compare",
  "Bike Type Profiles": "/bike-profiles",
  "Calendar Sync for Group Rides": "/group-rides",
  "Installable PWA": "/cycling",
  "Commute Mode": "/commute",
  "Bike vs Drive": "/bike-vs-drive",
  "Tire Pressure Calculator": "/tire-pressure",
  "Chain Lube Selector": "/chain-lube",
  "Road Conditions": "/road-conditions",
  "Event Countdown": "/event",
  "Service Intervals": "/maintenance",
  "Pollen Index": "/pollen",
  "Sensitive Lungs Mode": "/asthma",
  "Family Mode": "/family",
  "On This Day": "/on-this-day",
  "Morning Briefing": "/briefing",
  "Indoor Fallback": "/indoor",
  "Hazard Pins": "/hazards",
  "Referral Credit": "/referrals",
  "Weekly Digest Email": "/settings",
  "Lightning Map": "/lightning",
  "City Ride Guides": "/guides",
  "Bike Theft Hotspots": "/theft",
  "Strava Calibration": "/strava",
  "E-Bike Range Calculator": "/ebike-range",
  "Caffeine Timing": "/caffeine",
  "Streaks & Achievements": "/streaks",
  "Pre-Sunset Lights Reminder": "/settings",
  "Cargo & Loaded Bike Profiles": "/bike-profiles",
  "Bike Lane Closures": "/closures",
};

const faqs = [
  {
    q: "Do I need to pay to use RideByWeather?",
    a: "No. The Free tier is forever-free and covers the basic Ride Score, 7-day forecast, gear avatar, group rides, e-bike law lookups, 1 saved ride spot, and 3 saved routes. Pro ($9/mo) unlocks the AI Ride Assistant, the multi-location \"Where should I ride?\" scanner, the 24-hour route forecast, daily best-window push alerts, and the 14-day outlook.",
  },
  {
    q: "How accurate is the Ride Score?",
    a: "The score combines OpenWeatherMap's One Call 3.0 forecast with our weighted algorithm (Wind 40%, Temp 20%, Precip 15%, Gusts 10%, Humidity 10%, Safety 5%). It's tuned by real riders and updates hourly. Pro users get per-bike profile retuning.",
  },
  {
    q: "Which devices and services integrate?",
    a: "Garmin and Wahoo head-unit push alerts are in active development. Push notifications work on iOS 16.4+, Android, and desktop. The PWA installs to your home screen — no app store required.",
  },
  {
    q: "Can I use this for running or walking?",
    a: "Yes. /running and /walking each have their own dashboards with sport-tuned weights (running shifts more weight to heat and humidity; walking uses gentler thresholds). One account covers all three.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your account stays — you just drop back to the Free tier. Saved routes, ride history, and preferences are preserved. You can re-upgrade any time with no migration cost.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes — 14 days, no credit card upfront on the trial flow. After that it's $9/month, cancel any time through the Stripe billing portal in your account menu.",
  },
];

const proFeatures = [
  "AI Ride Assistant — chat grounded in your real forecast",
  "“Where should I ride?” scanner — rank 10 saved spots",
  "24-hour route forecast (pick the best departure window)",
  "Daily best-window push alerts",
  "14-day Ride Score forecast (vs 7)",
  "Wind-aware route optimization",
  "Unlimited saved routes",
  "Historical weather replay",
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-12 sm:pt-20 sm:pb-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-gray-950 to-gray-950" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-sky-400">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            Everything inside RideByWeather
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Features built for{" "}
            <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              riders who don&apos;t guess
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            From a single Ride Score to wind-aware segment routing — here&apos;s exactly what
            you get when you sign up, plus what unlocks at Pro.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link href="/signup" className="btn-primary text-base px-6 sm:px-8 py-3 sm:py-4">
              Get Started — Free
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-6 sm:px-8 py-3 sm:py-4">
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Ride Score breakdown */}
      <section className="px-4 py-16 sm:py-20 sm:px-6 lg:px-8 bg-gray-900/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              How the Ride Score is built
            </h2>
            <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              Six weather factors, weighted by how much they actually matter to a cyclist&apos;s
              experience. Tuned by real riders, not marketing.
            </p>
          </div>

          <div className="card">
            <div className="space-y-4">
              {rideScoreFactors.map((f) => (
                <div key={f.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-200">{f.label}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: f.color }}>
                      {f.weight}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${f.weight * 2.5}%`, backgroundColor: f.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-gray-500 text-center">
              Weights are tuned per sport. Running shifts more weight to heat and humidity.
            </p>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Every feature, in one place
            </h2>
            <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              Free tier covers the essentials. Pro unlocks the wind-aware routing engine and
              the longer forecast horizon.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {detailedFeatures.map((f) => {
              const href = featureLinks[f.title];
              return (
                <div
                  key={f.title}
                  className={`card flex flex-col ${href ? "transition-colors hover:border-sky-500/40" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-4xl">{f.icon}</div>
                    <div className="flex items-center gap-1.5">
                      {f.proBadge && (
                        <span className="inline-flex items-center rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-wide">
                          Pro
                        </span>
                      )}
                      {!href && (
                        <span className="inline-flex items-center rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-sm font-medium text-sky-400">{f.tagline}</p>
                  <p className="mt-3 text-sm text-gray-400">{f.description}</p>
                  <ul className="mt-4 space-y-1.5 flex-1">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-gray-300">
                        <span className="text-green-400 mt-0.5">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  {href && (
                    <Link
                      href={href}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-400 hover:text-sky-300"
                    >
                      Open feature
                      <span aria-hidden>→</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Free vs Pro comparison */}
      <section className="px-4 py-16 sm:py-20 sm:px-6 lg:px-8 bg-gray-900/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Free vs Pro at a glance
            </h2>
            <p className="mt-3 text-gray-400 text-sm sm:text-base">
              Start free forever. Upgrade only when you need the routing engine.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="card">
              <h3 className="text-lg font-bold text-white">Free</h3>
              <p className="mt-1 text-sm text-gray-500">For casual riders and curious cyclists</p>
              <ul className="mt-5 space-y-2">
                {[
                  "Basic Ride Score (current conditions)",
                  "Current weather forecast",
                  "Gear recommendations",
                  "3 saved routes",
                  "Group rides",
                  "E-bike law reference",
                  "Mobile PWA access",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="btn-secondary w-full text-center mt-6"
              >
                Start Free
              </Link>
            </div>

            <div className="card border-sky-500/50 ring-1 ring-sky-500/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white">
                MOST POPULAR
              </div>
              <h3 className="text-lg font-bold text-white">Pro — $9 / mo</h3>
              <p className="mt-1 text-sm text-gray-500">For serious riders chasing the right window</p>
              <ul className="mt-5 space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="font-medium">Everything in Free, plus:</span>
                </li>
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-sky-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="btn-primary w-full text-center mt-6"
              >
                Start 14-Day Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-gray-400 text-sm sm:text-base">
              The stuff people ask before signing up.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="card group [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-4 list-none">
                  <span className="text-base font-semibold text-white">{item.q}</span>
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-gray-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:py-24 sm:px-6 lg:px-8 bg-gray-900/40">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Ready to stop guessing?
          </h2>
          <p className="mt-4 text-gray-400 text-sm sm:text-lg">
            Sign up free in 30 seconds. No credit card. Upgrade only when the routing engine
            starts paying for itself.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link href="/signup" className="btn-primary text-base px-6 sm:px-8 py-3 sm:py-4">
              Create Free Account
            </Link>
            <Link href="/cycling" className="btn-secondary text-base px-6 sm:px-8 py-3 sm:py-4">
              Try Today&apos;s Score
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
