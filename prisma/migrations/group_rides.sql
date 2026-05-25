-- Group Rides feature — run against your Postgres database
-- Equivalent to what `prisma db push` would create for the new models.
-- Safe to run multiple times (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "group_rides" (
    "id"           TEXT NOT NULL,
    "creatorId"    TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "sport"        TEXT NOT NULL DEFAULT 'cycling',
    "startTime"    TIMESTAMP(3) NOT NULL,
    "lat"          DOUBLE PRECISION NOT NULL,
    "lng"          DOUBLE PRECISION NOT NULL,
    "locationName" TEXT NOT NULL,
    "pace"         TEXT,
    "distanceMi"   DOUBLE PRECISION,
    "maxRiders"    INTEGER,
    "visibility"   TEXT NOT NULL DEFAULT 'public',
    "inviteCode"   TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_rides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "group_rides_inviteCode_key" ON "group_rides"("inviteCode");
CREATE INDEX IF NOT EXISTS "group_rides_startTime_idx" ON "group_rides"("startTime");
CREATE INDEX IF NOT EXISTS "group_rides_sport_startTime_idx" ON "group_rides"("sport", "startTime");

CREATE TABLE IF NOT EXISTS "group_ride_participants" (
    "id"          TEXT NOT NULL,
    "groupRideId" TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'going',
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_ride_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "group_ride_participants_groupRideId_userId_key"
    ON "group_ride_participants"("groupRideId", "userId");
CREATE INDEX IF NOT EXISTS "group_ride_participants_userId_idx"
    ON "group_ride_participants"("userId");

-- Foreign keys (added separately so re-runs don't fail if already present)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_rides_creatorId_fkey') THEN
        ALTER TABLE "group_rides"
        ADD CONSTRAINT "group_rides_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_ride_participants_groupRideId_fkey') THEN
        ALTER TABLE "group_ride_participants"
        ADD CONSTRAINT "group_ride_participants_groupRideId_fkey"
        FOREIGN KEY ("groupRideId") REFERENCES "group_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_ride_participants_userId_fkey') THEN
        ALTER TABLE "group_ride_participants"
        ADD CONSTRAINT "group_ride_participants_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
