const fs = require("fs");
const path = require("path");
for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

(async () => {
  try {
    console.log("DB URL host:", new URL(process.env.DATABASE_URL).host);
    const u = await p.user.findUnique({
      where: { email: "steve@scanalot.photos" },
      include: { subscription: true },
    });
    console.log("USER:", JSON.stringify(u, null, 2));
    if (u) {
      const ok = await bcrypt.compare("12345678", u.passwordHash);
      console.log("BCRYPT MATCH:", ok);
    }
  } catch (e) {
    console.error("ERR:", e.message);
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
