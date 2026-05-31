-- Ride Window Push Alerts: add a per-subscription opt-in toggle and a
-- separate "last notified" timestamp so window alerts don't interfere
-- with storm alert dedup.
--
-- Apply once against production. Safe to re-run thanks to IF NOT EXISTS.

ALTER TABLE "push_subscriptions"
  ADD COLUMN IF NOT EXISTS "windowAlerts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastWindowNotifiedAt" TIMESTAMP(3);
