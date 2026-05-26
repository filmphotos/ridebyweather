export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
    if (provider === "sqlite") {
      await initSqlite();
    }
  }
}

async function initSqlite() {
  try {
    const { db } = await import("./lib/db");

    const tables = [
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT,
        "avatarUrl" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "tier" TEXT NOT NULL DEFAULT 'free',
        "stripeCustomerId" TEXT UNIQUE,
        "stripeSubscriptionId" TEXT UNIQUE,
        "stripePriceId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "currentPeriodEnd" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "preferredUnit" TEXT NOT NULL DEFAULT 'imperial',
        "sport" TEXT NOT NULL DEFAULT 'cycling',
        "ebikeMode" INTEGER NOT NULL DEFAULT 0,
        "preferCold" INTEGER NOT NULL DEFAULT 0,
        "dislikeWind" INTEGER NOT NULL DEFAULT 0,
        "temperatureMin" REAL,
        "temperatureMax" REAL
      )`,
      `CREATE TABLE IF NOT EXISTS "routes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "name" TEXT NOT NULL,
        "sport" TEXT NOT NULL DEFAULT 'cycling',
        "distance" REAL NOT NULL DEFAULT 0,
        "elevationGain" REAL NOT NULL DEFAULT 0,
        "geometry" TEXT NOT NULL DEFAULT '{}',
        "bearings" TEXT NOT NULL DEFAULT '[]',
        "segments" TEXT NOT NULL DEFAULT '[]',
        "isPublic" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "weather_snapshots" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "lat" REAL NOT NULL,
        "lng" REAL NOT NULL,
        "timestamp" DATETIME NOT NULL,
        "tempF" REAL NOT NULL,
        "feelsLikeF" REAL NOT NULL,
        "humidity" INTEGER NOT NULL DEFAULT 50,
        "windSpeedMph" REAL NOT NULL DEFAULT 0,
        "windGustMph" REAL NOT NULL DEFAULT 0,
        "windDirDeg" INTEGER NOT NULL DEFAULT 0,
        "precipProb" REAL NOT NULL DEFAULT 0,
        "precipInch" REAL NOT NULL DEFAULT 0,
        "cloudCover" INTEGER NOT NULL DEFAULT 0,
        "visibility" REAL NOT NULL DEFAULT 10,
        "uvIndex" REAL,
        "condition" TEXT NOT NULL DEFAULT 'clear',
        "conditionCode" INTEGER NOT NULL DEFAULT 800,
        "isStorm" INTEGER NOT NULL DEFAULT 0,
        "isIce" INTEGER NOT NULL DEFAULT 0,
        "provider" TEXT NOT NULL DEFAULT 'open-meteo',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "ride_score_history" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "routeId" TEXT,
        "sport" TEXT NOT NULL DEFAULT 'cycling',
        "score" REAL NOT NULL,
        "label" TEXT NOT NULL,
        "breakdown" TEXT NOT NULL DEFAULT '{}',
        "weatherId" TEXT,
        "lat" REAL NOT NULL,
        "lng" REAL NOT NULL,
        "timestamp" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "device_integrations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" DATETIME,
        "scopes" TEXT NOT NULL DEFAULT '[]',
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "provider")
      )`,
      `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "expiresAt" DATETIME NOT NULL,
        "usedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId")`,
      `CREATE TABLE IF NOT EXISTS "partner_listings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "lat" REAL NOT NULL,
        "lng" REAL NOT NULL,
        "address" TEXT NOT NULL,
        "phone" TEXT,
        "website" TEXT,
        "description" TEXT,
        "isVerified" INTEGER NOT NULL DEFAULT 0,
        "tier" TEXT NOT NULL DEFAULT 'free',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const sql of tables) {
      await db.$executeRawUnsafe(sql);
    }

    // Idempotent migrations for columns added after initial schema.
    // SQLite throws if the column already exists; we swallow that specific case.
    const addColumnMigrations = [
      `ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user'`,
    ];
    for (const sql of addColumnMigrations) {
      try {
        await db.$executeRawUnsafe(sql);
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message ?? "";
        if (!/duplicate column name/i.test(msg)) {
          console.error("[instrumentation] migration failed:", msg);
        }
      }
    }

    // Seed partner listings if empty
    const count = await db.partnerListing.count();
    if (count === 0) {
      await seedPartners(db);
    }
  } catch (e) {
    console.error("[instrumentation] DB init failed:", e);
  }
}

async function seedPartners(db: Awaited<typeof import("./lib/db")>["db"]) {
  const partners = [
    { id: "trek-bicycle-boulder", name: "Trek Bicycle Boulder", type: "bike_shop", lat: 40.015, lng: -105.2705, address: "1221 Canyon Blvd, Boulder, CO", phone: "303-444-3782", website: "https://www.trekbikes.com", description: "Full-service Trek dealer with expert fitting and same-day repairs.", isVerified: true, tier: "pro" },
    { id: "university-bicycles", name: "University Bicycles", type: "bike_shop", lat: 40.0195, lng: -105.2673, address: "839 Pearl St, Boulder, CO", phone: "303-444-4196", website: "https://www.ubikes.com", description: "Boulder's oldest independent bike shop — since 1974.", isVerified: true, tier: "pro" },
    { id: "momentum-cyclery", name: "Momentum Cyclery", type: "bike_shop", lat: 40.026, lng: -105.251, address: "4580 Broadway, Boulder, CO", phone: "303-447-8655", description: "Neighborhood shop specializing in commuter and gravel bikes.", isVerified: false, tier: "free" },
    { id: "boulder-running-company", name: "Boulder Running Company", type: "running_store", lat: 40.0172, lng: -105.2793, address: "2775 Pearl St, Boulder, CO", phone: "303-786-9255", website: "https://www.boulderrunningcompany.com", description: "Expert gait analysis and footwear fitting for every runner.", isVerified: true, tier: "pro" },
    { id: "wheat-ridge-cyclery", name: "Wheat Ridge Cyclery", type: "bike_shop", lat: 39.7697, lng: -105.0989, address: "7085 W 38th Ave, Wheat Ridge, CO", phone: "303-424-3221", website: "https://www.wheatridgecyclery.com", description: "Colorado's largest bike shop — 35,000 sq ft of bikes and gear.", isVerified: true, tier: "enterprise" },
    { id: "runners-roost-denver", name: "Runners Roost Denver", type: "running_store", lat: 39.7392, lng: -104.9903, address: "1685 S Colorado Blvd, Denver, CO", phone: "303-759-8455", description: "Locally owned run specialty store with weekly group runs.", isVerified: true, tier: "pro" },
  ];

  for (const p of partners) {
    await db.partnerListing.upsert({
      where: { id: p.id },
      create: p,
      update: {},
    });
  }
}
