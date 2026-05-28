-- Device pairing feature (QR "show a code, approve on phone" login) —
-- run against your Postgres database.
-- Equivalent to what `prisma db push` would create for the new model.
-- Safe to run multiple times (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "device_pairings" (
    "id"           TEXT NOT NULL,
    "code"         TEXT NOT NULL,
    "deviceSecret" TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "token"        TEXT,
    "userId"       TEXT,
    "deviceLabel"  TEXT,
    "expiresAt"    TIMESTAMP(3) NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_pairings_code_key"
    ON "device_pairings"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "device_pairings_deviceSecret_key"
    ON "device_pairings"("deviceSecret");
CREATE INDEX IF NOT EXISTS "device_pairings_deviceSecret_idx"
    ON "device_pairings"("deviceSecret");
