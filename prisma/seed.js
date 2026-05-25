const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

const PARTNERS = [
  { name: "Trek Bicycle Boulder", type: "bike_shop", lat: 40.0150, lng: -105.2705, address: "1221 Canyon Blvd, Boulder, CO", phone: "303-444-3782", website: "https://www.trekbikes.com", description: "Full-service Trek dealer with expert fitting and same-day repairs.", isVerified: true, tier: "pro" },
  { name: "University Bicycles", type: "bike_shop", lat: 40.0195, lng: -105.2673, address: "839 Pearl St, Boulder, CO", phone: "303-444-4196", website: "https://www.ubikes.com", description: "Boulder's oldest independent bike shop — since 1974.", isVerified: true, tier: "pro" },
  { name: "Momentum Cyclery", type: "bike_shop", lat: 40.0260, lng: -105.2510, address: "4580 Broadway, Boulder, CO", phone: "303-447-8655", description: "Neighborhood shop specializing in commuter and gravel bikes.", isVerified: false, tier: "free" },
  { name: "Boulder Running Company", type: "running_store", lat: 40.0172, lng: -105.2793, address: "2775 Pearl St, Boulder, CO", phone: "303-786-9255", website: "https://www.boulderrunningcompany.com", description: "Expert gait analysis and footwear fitting for every runner.", isVerified: true, tier: "pro" },
  { name: "Flatirons Athletic Club", type: "gym", lat: 40.0092, lng: -105.2585, address: "505 Thunderbird Dr, Boulder, CO", phone: "303-499-6590", description: "Indoor cycling, triathlon training, and recovery facilities.", isVerified: false, tier: "free" },
  { name: "Colorado Cyclist", type: "bike_shop", lat: 39.9973, lng: -105.2468, address: "3970 E Arapahoe Rd, Boulder, CO", phone: "303-440-7771", description: "Road and gravel specialist with custom wheel builds.", isVerified: false, tier: "free" },
  { name: "Wheat Ridge Cyclery", type: "bike_shop", lat: 39.7697, lng: -105.0989, address: "7085 W 38th Ave, Wheat Ridge, CO", phone: "303-424-3221", website: "https://www.wheatridgecyclery.com", description: "Colorado's largest bike shop — 35,000 sq ft of bikes and gear.", isVerified: true, tier: "enterprise" },
  { name: "Runners Roost Denver", type: "running_store", lat: 39.7392, lng: -104.9903, address: "1685 S Colorado Blvd, Denver, CO", phone: "303-759-8455", description: "Locally owned run specialty store with weekly group runs.", isVerified: true, tier: "pro" },
  { name: "Performance Bicycle Denver", type: "bike_shop", lat: 39.7505, lng: -105.0163, address: "2001 Market St, Denver, CO", phone: "720-904-0200", description: "Chain shop with competitive pricing and wide inventory.", isVerified: false, tier: "free" },
];

async function main() {
  console.log("Seeding partner listings...");
  for (const partner of PARTNERS) {
    const id = partner.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await db.partnerListing.upsert({
      where: { id },
      create: { id, ...partner },
      update: partner,
    });
  }
  console.log(`Seeded ${PARTNERS.length} partner listings.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
