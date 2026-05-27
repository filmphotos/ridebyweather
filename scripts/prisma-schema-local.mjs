// Generates prisma/schema.local.prisma — a SQLite-flavored copy of the
// committed Postgres schema, for local dev. Prod (Vercel) keeps using
// prisma/schema.prisma directly. See package.json `predev` script.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "prisma", "schema.prisma");
const dest = path.resolve(here, "..", "prisma", "schema.local.prisma");

const text = fs.readFileSync(src, "utf8");
if (!/provider\s*=\s*"postgresql"/.test(text)) {
  console.warn("[prisma-schema-local] schema.prisma is not postgresql — leaving schema.local.prisma untouched");
  process.exit(0);
}

const swapped = text.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
fs.writeFileSync(dest, swapped);
console.log("[prisma-schema-local] wrote prisma/schema.local.prisma (provider=sqlite)");
