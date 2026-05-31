-- Rider weight: add a nullable weightLb column to user_preferences so we can
-- estimate calories burned per ride. Apply once against production; safe to
-- re-run thanks to IF NOT EXISTS.

ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "weightLb" DOUBLE PRECISION;
