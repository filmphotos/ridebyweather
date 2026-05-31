-- Multi-location "Where should I ride?" scanner — Pro feature.
-- Stores the user's saved ride start points. Vercel's `prisma db push`
-- applies this automatically on deploy; this file is the audit trail.

CREATE TABLE IF NOT EXISTS "ride_spots" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"         TEXT NOT NULL,
  "locationName" TEXT,
  "lat"          DOUBLE PRECISION NOT NULL,
  "lng"          DOUBLE PRECISION NOT NULL,
  "sport"        TEXT NOT NULL DEFAULT 'cycling',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ride_spots_userId_idx" ON "ride_spots"("userId");
