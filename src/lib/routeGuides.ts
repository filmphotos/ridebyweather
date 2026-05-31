// Seed editorial city guides. Each city has a hand-curated list of ride
// suggestions and a climatology summary the SEO can index.

export interface RideSuggestion {
  name: string;
  miles: number;
  bestWindOut: string; // compass shorthand (e.g. "W" meaning out into westerly headwind)
  description: string;
}

export interface CityGuide {
  slug: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  intro: string;
  climatology: string;
  seasons: { name: string; window: string; advice: string }[];
  rides: RideSuggestion[];
}

export const CITY_GUIDES: CityGuide[] = [
  {
    slug: "portland-or",
    city: "Portland",
    state: "OR",
    lat: 45.5152,
    lng: -122.6784,
    intro:
      "Portland is a cycling-first city wedged between two rivers and a coast range. Prevailing winds come up the Gorge from the west — favorite loops are designed around that.",
    climatology:
      "Spring is wet and mild (40–60°F). Summer is dry and pleasant (60–85°F). Fall storms arrive late October. Winters are wet, dark, and warm enough to ride year-round in the right kit.",
    seasons: [
      { name: "Spring", window: "Mar–May", advice: "Always pack a shell. Best rides happen between rain bands." },
      { name: "Summer", window: "Jun–Sep", advice: "Lowest wind days are mornings. Heat domes can push afternoons over 95°F." },
      { name: "Fall", window: "Oct–Nov", advice: "Golden hour stretches long. Bring lights — early dusk catches people out." },
      { name: "Winter", window: "Dec–Feb", advice: "Layer for 40°F and steady rain. Plan around the heavy days, not against them." },
    ],
    rides: [
      { name: "Sauvie Island Loop", miles: 13, bestWindOut: "N", description: "Flat, scenic, popular. Best ridden counter-clockwise so the westerly tailwind pushes you home." },
      { name: "Forest Park to Pittock", miles: 9, bestWindOut: "shelter", description: "Tree cover blocks wind end-to-end. The go-to climb when the gorge is howling." },
      { name: "Sandy River Gorge", miles: 38, bestWindOut: "E", description: "Big climbs, low traffic. Save it for a clear-fall day before the wet sets in." },
    ],
  },
  {
    slug: "boulder-co",
    city: "Boulder",
    state: "CO",
    lat: 40.0150,
    lng: -105.2705,
    intro:
      "Boulder is the cycling-mecca cliché for a reason. Dry climate, low humidity, and 300+ riding days a year. Wind off the foothills is the deciding factor on most rides.",
    climatology:
      "Crisp dry summers (60–88°F), short cool winters (15–55°F). Afternoon thunderstorms in July/August can build fast over the foothills. Chinook winds in winter can spike to 60 mph.",
    seasons: [
      { name: "Spring", window: "Apr–May", advice: "Snow possible into May. Most riders watch for warm SW winds breaking up the cold." },
      { name: "Summer", window: "Jun–Aug", advice: "Be off the high climbs by noon — afternoon storms are routine." },
      { name: "Fall", window: "Sep–Oct", advice: "Peak ride season. Stable, dry, golden cottonwoods." },
      { name: "Winter", window: "Nov–Mar", advice: "Indoor-on-snow-days, outdoor-on-sun-days. Chinooks can give you 70°F in February." },
    ],
    rides: [
      { name: "Lefthand Canyon", miles: 35, bestWindOut: "W", description: "Steady climb into a typical morning headwind, free tailwind home." },
      { name: "Hygiene Loop", miles: 28, bestWindOut: "N", description: "Flat, low-traffic, foothill-protected. Doable even on windy days." },
      { name: "Magnolia Road", miles: 22, bestWindOut: "W", description: "Punishing climb, otherworldly views. Don&apos;t do it if storms are forecast." },
    ],
  },
  {
    slug: "nyc-ny",
    city: "New York City",
    state: "NY",
    lat: 40.7128,
    lng: -74.0060,
    intro:
      "NYC riding is split between Central Park morning laps, the West Side bike path, and weekend escapes up to Nyack or the Palisades. Wind off the Hudson dictates which way you ride first.",
    climatology:
      "Hot humid summers (70–95°F, dewpoints in the 70s), cold humid winters (20–45°F). Spring and fall are short and prized. Sea breeze flips wind direction late afternoon in summer.",
    seasons: [
      { name: "Spring", window: "Apr–May", advice: "Big day-to-day swings. Always pack arm warmers, sometimes a jacket." },
      { name: "Summer", window: "Jun–Aug", advice: "Beat the heat — dawn rides only on dewpoint &gt; 70°F days." },
      { name: "Fall", window: "Sep–Oct", advice: "Best riding window of the year. Long, dry, cool." },
      { name: "Winter", window: "Dec–Mar", advice: "Salt destroys drivetrains. Indoor for the slop, outdoor for the sun." },
    ],
    rides: [
      { name: "9W to Piermont", miles: 36, bestWindOut: "N", description: "Classic out-and-back. Mid-morning start beats the sea breeze flip." },
      { name: "Central Park Loop", miles: 6, bestWindOut: "shelter", description: "Tree-shielded. Pre-dawn laps avoid the joggers and the wind." },
      { name: "Brooklyn → Coney Island", miles: 20, bestWindOut: "S", description: "Tailwind on the way out is rare — work hard south, glide back north." },
    ],
  },
  {
    slug: "san-francisco-ca",
    city: "San Francisco",
    state: "CA",
    lat: 37.7749,
    lng: -122.4194,
    intro:
      "SF is wind country with a coastal twist. The afternoon westerly through the Golden Gate is famously brutal. Morning is the riding window.",
    climatology:
      "Cool dry summers (55–70°F) with intense afternoon wind. Mild wet winters (45–60°F). Microclimates rule — Marin can be 75°F while the Avenues sit in fog at 55°F.",
    seasons: [
      { name: "Spring", window: "Mar–May", advice: "Calm clear days are gold — grab them." },
      { name: "Summer", window: "Jun–Aug", advice: "Fog and 25 mph wind by noon. Hill-protected loops shine." },
      { name: "Fall", window: "Sep–Oct", advice: "Warmest, calmest, best riding of the year." },
      { name: "Winter", window: "Nov–Feb", advice: "Atmospheric rivers come in waves. Watch the radar." },
    ],
    rides: [
      { name: "Paradise Loop", miles: 32, bestWindOut: "W", description: "Marin classic. Out into morning headwind, downwind home." },
      { name: "GG Bridge to Sausalito", miles: 11, bestWindOut: "shelter", description: "Touristy but iconic. Best at 6am before the bridge crowd." },
      { name: "Headlands & Hawk Hill", miles: 18, bestWindOut: "W", description: "Climb early, descend before the gusts pick up." },
    ],
  },
  {
    slug: "austin-tx",
    city: "Austin",
    state: "TX",
    lat: 30.2672,
    lng: -97.7431,
    intro:
      "Austin riding is about heat management and finding the rare windless day. South wind dominates spring/summer; north winds bring sharp cold fronts in winter.",
    climatology:
      "Long hot summers (75–100°F). Mild dry winters (35–65°F). Rainy season peaks May and October. Texas cold fronts can drop the temp 30°F in an hour.",
    seasons: [
      { name: "Spring", window: "Mar–May", advice: "Some of the best riding before the heat hits. Watch for severe storms." },
      { name: "Summer", window: "Jun–Sep", advice: "Sunrise rides only on heat-index 100+ days. Hydrate aggressively." },
      { name: "Fall", window: "Oct–Nov", advice: "Cool fronts make epic days. Track the post-frontal wind shift." },
      { name: "Winter", window: "Dec–Feb", advice: "Northerly winds bite — face protection on sub-40°F mornings." },
    ],
    rides: [
      { name: "Veloway Loop", miles: 4, bestWindOut: "shelter", description: "Closed-to-traffic, treelined. The summer pre-dawn standby." },
      { name: "360 Bridge to Bee Cave", miles: 30, bestWindOut: "S", description: "Hill country payoff. Avoid summer afternoons — bridge gets oven hot." },
      { name: "Decker Lake Loop", miles: 30, bestWindOut: "varies", description: "Race-pace classic. Watch for cross-traffic on the long straights." },
    ],
  },
  {
    slug: "chicago-il",
    city: "Chicago",
    state: "IL",
    lat: 41.8781,
    lng: -87.6298,
    intro:
      "Chicago riding is dominated by the Lakefront Trail and the constant lake-effect wind. North or south wind decides which way you start.",
    climatology:
      "Brutally cold winters (5–35°F, sub-zero stretches), warm humid summers (65–88°F). Spring is unstable. Fall is sharp and short.",
    seasons: [
      { name: "Spring", window: "Apr–May", advice: "Lake-effect cold lingers. Pack 20°F more layers than the inland forecast." },
      { name: "Summer", window: "Jun–Aug", advice: "Lake breeze cools the path 10°F vs. the loop. Use it." },
      { name: "Fall", window: "Sep–Oct", advice: "Cool, dry, perfect. Watch for sudden cold-front nights." },
      { name: "Winter", window: "Nov–Mar", advice: "Indoor weather. The occasional 50°F day is gold — drop everything." },
    ],
    rides: [
      { name: "Lakefront Trail N→S", miles: 18, bestWindOut: "S", description: "Tailwind days only — northerlies make this brutal on the way back." },
      { name: "Skokie Lagoons Loop", miles: 12, bestWindOut: "shelter", description: "Tree-protected. The bad-wind-day option." },
      { name: "Palos Forest Preserve", miles: 25, bestWindOut: "varies", description: "Closest singletrack-and-pavement mix. Worth the drive out." },
    ],
  },
];

export function getCityGuide(slug: string): CityGuide | undefined {
  return CITY_GUIDES.find((g) => g.slug === slug);
}
