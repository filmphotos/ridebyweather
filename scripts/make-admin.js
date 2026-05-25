// Promote an existing user to admin role.
// Usage: node scripts/make-admin.js you@example.com
// Or create + promote: node scripts/make-admin.js you@example.com YourPassword "Your Name"

// Minimal .env loader — looks for .env.local then .env in CWD.
const fs = require("fs");
const path = require("path");
for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: node scripts/make-admin.js <email> [password] [name]");
    process.exit(1);
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!password) {
      console.error(`No user with email ${email}. Pass a password to create one:`);
      console.error(`  node scripts/make-admin.js ${email} <password> "Admin Name"`);
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null,
        role: "admin",
        subscription: { create: { tier: "enterprise", status: "active" } },
      },
    });
    console.log(`Created admin user: ${user.email}`);
  } else {
    const data = { role: "admin" };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    user = await prisma.user.update({ where: { id: user.id }, data });
    console.log(
      `Updated ${user.email} — role: admin${password ? ", password reset" : ""}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
