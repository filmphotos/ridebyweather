/**
 * Heat & cold acclimation protocols for cyclists and runners.
 *
 * Sources: ACSM position stands (Exertional Heat Illness 2007, Cold Stress 2021),
 * Périard et al. "Adaptations and mechanisms of human heat acclimation"
 * (Comprehensive Physiology 2015), Castellani & Young "Human physiological
 * responses to cold exposure" (Auton Neurosci 2016), Tipton et al. on cold
 * water immersion adaptation, USATF/USAC coaching guidance.
 *
 * Educational only — NOT medical advice. Athletes with cardiovascular disease,
 * hypertension, asthma, pregnancy, or other conditions should consult a clinician
 * before starting a heat or cold acclimation protocol.
 */

export type Environment = "heat" | "cold";

export interface AcclimationDay {
  day: number;
  duration: string;
  intensity: string;
  notes: string;
}

export interface AdaptationMarker {
  marker: string;
  timeframe: string;
  what: string;
}

export interface WarningSign {
  condition: string;
  severity: "watch" | "stop" | "emergency";
  signs: string[];
  action: string;
}

export interface SportTip {
  sport: "cycling" | "running";
  environment: Environment;
  tips: string[];
}

/**
 * Classic 10-14 day heat acclimation protocol (HA).
 * Progressive exposure to exercise heat stress, isothermal or constant-work.
 */
export const HEAT_PROTOCOL: AcclimationDay[] = [
  {
    day: 1,
    duration: "30 min",
    intensity: "Easy (Z1–Z2, ~50% VO2max)",
    notes:
      "First exposure. Target a sustained core temp rise of ~1°C. Hydrate to within 1% of starting body mass. Expect to feel worse than the workout warrants.",
  },
  {
    day: 2,
    duration: "30–40 min",
    intensity: "Easy (Z2)",
    notes:
      "Repeat dose. RPE will still feel elevated. Weigh in pre/post — fluid loss should not exceed 2% body mass.",
  },
  {
    day: 3,
    duration: "45 min",
    intensity: "Easy + 1–2 short tempo blocks",
    notes:
      "Add modest intensity bumps. Plasma volume is beginning to expand — you may notice slightly reduced HR drift.",
  },
  {
    day: 4,
    duration: "45–60 min",
    intensity: "Steady Z2",
    notes:
      "Sweat rate is increasing. Drink to thirst, but pre-load electrolytes (~1 g sodium per liter) if sessions exceed 60 min.",
  },
  {
    day: 5,
    duration: "60 min",
    intensity: "Steady, build to threshold for 10 min",
    notes:
      "Most riders/runners now report the session feels noticeably easier than day 1. HR at the same pace should drop 5–10 bpm.",
  },
  {
    day: 6,
    duration: "60 min",
    intensity: "Aerobic with intervals (4 × 4 min Z4)",
    notes:
      "Sweat onset earlier, sweat more dilute (sodium retention). Skin temp better regulated.",
  },
  {
    day: 7,
    duration: "Rest or 30 min very easy",
    intensity: "Recovery",
    notes: "Optional easy day. Adaptations consolidate even without exposure.",
  },
  {
    day: 8,
    duration: "60–75 min",
    intensity: "Race-pace efforts (2 × 15 min)",
    notes:
      "Begin event-specific intensity. Plasma volume expansion peaks around days 7–10.",
  },
  {
    day: 9,
    duration: "60 min",
    intensity: "Steady Z2–Z3",
    notes:
      "Thermal comfort markedly improved. You should now sweat earlier and more, but feel less wrecked.",
  },
  {
    day: 10,
    duration: "75–90 min",
    intensity: "Event simulation",
    notes:
      "Functional acclimation achieved for most people. Full ceiling reached by day 14 for elite athletes.",
  },
  {
    day: 11,
    duration: "Maintain 2–3×/week",
    intensity: "Mixed",
    notes:
      "Adaptations decay ~2.5% per day without re-exposure. One hot session every 3–5 days preserves most of the benefit.",
  },
];

/**
 * Cold habituation protocol. Cold adaptation is more controversial — the body
 * develops habituation (blunted shiver and skin vasoconstriction response)
 * rather than the broad cardiovascular adaptations of heat acclimation.
 * Cold-water immersion is the most-studied stimulus; cold-air training
 * primarily teaches gear selection and breathing control.
 */
export const COLD_PROTOCOL: AcclimationDay[] = [
  {
    day: 1,
    duration: "5 min finish (cold shower 15–18°C / 60–65°F)",
    intensity: "Post-workout exposure",
    notes:
      "End your normal session with a cold shower. Focus on slow nasal breathing — the cold shock response peaks in the first 60 s.",
  },
  {
    day: 2,
    duration: "10 min easy outdoor in 5–10°C / 40–50°F",
    intensity: "Underdress one layer",
    notes:
      "Deliberately go out slightly under-dressed. Goal is mild cold sensation in hands/face, never numbness.",
  },
  {
    day: 3,
    duration: "20–30 min ride or run in the cold",
    intensity: "Z2",
    notes:
      "Warm up indoors first to reduce bronchospasm risk. A buff over the mouth pre-warms inhaled air.",
  },
  {
    day: 4,
    duration: "10 min cold-water immersion (12–15°C / 54–60°F)",
    intensity: "Static immersion to shoulders",
    notes:
      "Optional — only if a controlled tub or lake is available. Never alone. Exit at the first shiver wave.",
  },
  {
    day: 5,
    duration: "45–60 min outdoor session",
    intensity: "Steady, add 10 min tempo",
    notes:
      "By now, the initial cold shock response should be blunted. Breathing should feel controlled within 60 s of exposure.",
  },
  {
    day: 6,
    duration: "Long ride/run 60–90 min",
    intensity: "Endurance",
    notes:
      "Practice layering for the full session. Dress to be slightly cool at the start — you'll warm into it within 10 min.",
  },
  {
    day: 7,
    duration: "Rest or short technical session",
    intensity: "Recovery",
    notes:
      "Optional cold shower to maintain habituation. Hydration is still critical — cold air is dry and you under-drink.",
  },
  {
    day: 8,
    duration: "Repeat days 3–6 weekly",
    intensity: "Maintenance",
    notes:
      "Cold habituation is preserved with 2–3 cold exposures per week. Full reversal takes ~3 weeks without exposure.",
  },
];

export const HEAT_ADAPTATIONS: AdaptationMarker[] = [
  {
    marker: "Plasma volume expansion",
    timeframe: "Days 3–7",
    what:
      "Blood plasma increases 5–15%, lowering heart rate at any given workload and improving stroke volume. The single biggest performance win.",
  },
  {
    marker: "Earlier sweat onset",
    timeframe: "Days 4–8",
    what:
      "Sweating begins at a lower core temperature, dumping heat sooner. Sweat rate can nearly double.",
  },
  {
    marker: "Dilute sweat (sodium sparing)",
    timeframe: "Days 5–10",
    what:
      "Aldosterone-driven sodium reabsorption in sweat ducts means less electrolyte loss per liter — important for long events.",
  },
  {
    marker: "Lower core & skin temperature",
    timeframe: "Days 7–14",
    what:
      "Resting and exercising core temp drop 0.2–0.4°C. Perceived effort at race pace drops noticeably.",
  },
  {
    marker: "Improved cardiac output",
    timeframe: "Days 7–14",
    what:
      "Combined plasma volume + thermal tolerance translates to roughly 4–7% performance gain in events held above ~22°C / 72°F.",
  },
];

export const COLD_ADAPTATIONS: AdaptationMarker[] = [
  {
    marker: "Blunted cold shock response",
    timeframe: "After 4–6 exposures",
    what:
      "The reflex gasp, hyperventilation, and tachycardia on cold-water entry diminish substantially. The single most safety-relevant adaptation.",
  },
  {
    marker: "Habituated shivering",
    timeframe: "1–2 weeks",
    what:
      "Shivering threshold lowers — body tolerates a slightly cooler core before activating energy-expensive shivering.",
  },
  {
    marker: "Improved peripheral perfusion",
    timeframe: "2–3 weeks",
    what:
      "Cold-induced vasodilation (CIVD) cycles in fingers and toes become more frequent and pronounced, reducing frostbite risk.",
  },
  {
    marker: "Brown-fat activation",
    timeframe: "4–6 weeks",
    what:
      "Limited evidence in trained athletes, but regular cold exposure modestly increases non-shivering thermogenesis capacity.",
  },
  {
    marker: "Psychological tolerance",
    timeframe: "Throughout",
    what:
      "Often the biggest practical gain — learned breathing control and gear confidence let you start cold sessions calmly.",
  },
];

export const HEAT_WARNINGS: WarningSign[] = [
  {
    condition: "Heat cramps",
    severity: "watch",
    signs: [
      "Painful muscle spasms (calves, quads, abs)",
      "Profuse sweating",
      "Otherwise alert and oriented",
    ],
    action:
      "Stop, move to shade, drink an electrolyte solution (sodium-bearing — not plain water). Resume only after cramps resolve.",
  },
  {
    condition: "Heat exhaustion",
    severity: "stop",
    signs: [
      "Core temp 38–40°C / 100.4–104°F",
      "Heavy sweating, pale, clammy skin",
      "Headache, nausea, dizziness, weakness",
      "Heart rate elevated above normal effort",
    ],
    action:
      "Stop immediately. Get to shade. Remove excess clothing. Cool with water, ice towels on neck/armpits/groin. Drink cool fluids. Seek care if symptoms persist >30 min or worsen.",
  },
  {
    condition: "Heat stroke (medical emergency)",
    severity: "emergency",
    signs: [
      "Core temp ≥40°C / 104°F",
      "Altered mental status — confusion, slurred speech, irrational behavior",
      "Hot skin (may still be sweating in exertional heat stroke)",
      "Possible collapse or seizure",
    ],
    action:
      "CALL 911. Begin cold-water immersion immediately if possible (tub, stock tank, hose-down) — every minute over 40°C causes cellular damage. Do not delay cooling waiting for transport.",
  },
];

export const COLD_WARNINGS: WarningSign[] = [
  {
    condition: "Mild hypothermia",
    severity: "stop",
    signs: [
      "Core temp 32–35°C / 90–95°F",
      "Persistent shivering, can't fully suppress it",
      "Cold, pale extremities; loss of fine motor in fingers",
      "Mumbling, withdrawn behavior",
    ],
    action:
      "Stop, get out of wind, shed wet layers, add insulation, eat carbs, drink warm (not hot) fluids. Active rewarming with body contact if possible. Do not resume training.",
  },
  {
    condition: "Severe hypothermia (medical emergency)",
    severity: "emergency",
    signs: [
      "Core temp <32°C / <90°F",
      "Shivering stops despite still being cold",
      "Confusion, paradoxical undressing, loss of coordination",
      "Slow, weak pulse; shallow breathing",
    ],
    action:
      "CALL 911. Handle gently — rough handling can trigger fatal arrhythmia. Insulate, do NOT rub limbs, do NOT give alcohol. Evacuate.",
  },
  {
    condition: "Frostnip / superficial frostbite",
    severity: "watch",
    signs: [
      "Numb, white, or waxy patches on ears, nose, cheeks, fingers, toes",
      "Skin still soft and pliable",
      "Returns to normal color and feeling on rewarming",
    ],
    action:
      "Get indoors. Rewarm in 37–39°C / 99–102°F water for 15–30 min. Never rewarm if there's any chance the tissue will refreeze before reaching shelter.",
  },
  {
    condition: "Exercise-induced bronchospasm",
    severity: "watch",
    signs: [
      "Chest tightness, wheezing, dry cough in cold air",
      "Worse below ~0°C / 32°F",
      "Resolves within minutes of stopping and warming the airway",
    ],
    action:
      "Slow down, breathe through a buff/mask. If you have a prescribed inhaler, use as directed. Talk to a clinician about pre-treatment if it's a recurring issue.",
  },
];

export const SPORT_TIPS: SportTip[] = [
  {
    sport: "cycling",
    environment: "heat",
    tips: [
      "Wind chill from speed dramatically increases evaporative cooling — you'll under-dress for descents and overheat on climbs.",
      "Plan loops with shade and water stops every 30–45 min. Use two bottles minimum above 25°C / 77°F.",
      "Pre-cool with ice slurry or ice vest 15 min before the start of a hard effort — buys ~10–15 min of high-intensity tolerance.",
      "White or light jerseys, sleeve covers wet down at stops. Helmet vents matter more than you think.",
      "Sodium target: 500–1000 mg per liter of fluid for rides over 90 min in heat.",
    ],
  },
  {
    sport: "cycling",
    environment: "cold",
    tips: [
      "The 10°F rule: dress for ~10°F (5–6°C) warmer than the actual temperature — you'll generate heat fast.",
      "Hands and feet first. Lobster gloves below 0°C / 32°F, shoe covers below 10°C / 50°F.",
      "Cover exposed skin below -5°C / 23°F — wind chill at 20 mph drops the felt temp another 10°C / 18°F.",
      "Carry a buff/balaclava for descents. A wet base layer in cold weather is dangerous — pack a dry one for long rides.",
      "Battery life on lights and head units drops 30–50% in the cold. Keep a backup in an inside pocket.",
    ],
  },
  {
    sport: "running",
    environment: "heat",
    tips: [
      "Less convective cooling than cycling — heat builds faster at lower power. Shift hard sessions to dawn.",
      "Pace adjustment: add ~10–20 s/mi (6–12 s/km) for every 5°C / 9°F above 15°C / 60°F until acclimated.",
      "Hat with a brim, white singlet, sunglasses. Pour cold water over head/wrists at every fountain.",
      "Carry electrolytes for any run over 60 min above 25°C / 77°F. Sodium loss is faster than you'd guess.",
      "Treadmill substitution is legitimate — better than skipping or risking heat illness on the trail.",
    ],
  },
  {
    sport: "running",
    environment: "cold",
    tips: [
      "Three-layer system: wicking base, insulating mid (optional), wind-blocking shell. Avoid cotton at all costs.",
      "The 20°F rule: dress for 20°F (10°C) warmer than actual — running generates more heat than cycling per minute.",
      "Warm up indoors for 5 min before stepping out below freezing — reduces airway irritation and injury risk.",
      "Ice patches: shorten stride, land flat-footed, run on snow (more grip) than packed ice. Microspikes for icy trails.",
      "Reflective gear and a headlamp — daylight is short and drivers are less attentive in winter.",
    ],
  },
];

export const QUICK_FACTS = [
  {
    label: "Days to functional heat acclimation",
    value: "10–14",
    color: "#f97316",
  },
  {
    label: "Plasma volume gain",
    value: "+5–15%",
    color: "#22c55e",
  },
  {
    label: "Decay without re-exposure",
    value: "~2.5%/day",
    color: "#eab308",
  },
  {
    label: "Cold habituation sessions",
    value: "4–6",
    color: "#38bdf8",
  },
];
