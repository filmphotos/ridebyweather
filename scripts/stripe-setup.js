// One-off script: creates Pro & Enterprise products + prices in Stripe (test mode),
// then writes the resulting Price IDs back into .env.local.
//
// Reads STRIPE_SECRET_KEY from .env.local — never logs the key.
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");

const ENV_PATH = path.join(__dirname, "..", ".env.local");

function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function updateEnvKey(file, key, value) {
  let txt = fs.readFileSync(file, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}="${value}"`;
  txt = re.test(txt) ? txt.replace(re, line) : txt + `\n${line}\n`;
  fs.writeFileSync(file, txt);
}

async function ensureProduct(stripe, name, unitAmount) {
  // Find existing product by name
  const search = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
  let product = search.data[0];
  if (!product) {
    product = await stripe.products.create({ name });
    console.log(`Created product: ${name} (${product.id})`);
  } else {
    console.log(`Reused existing product: ${name} (${product.id})`);
  }

  // Find an active recurring monthly USD price at the desired amount
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.currency === "usd" &&
      p.unit_amount === unitAmount
  );
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`  Created price: $${(unitAmount / 100).toFixed(2)}/mo (${price.id})`);
  } else {
    console.log(`  Reused existing price: $${(unitAmount / 100).toFixed(2)}/mo (${price.id})`);
  }
  return price.id;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const key = env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_placeholder")) {
    throw new Error("STRIPE_SECRET_KEY missing or placeholder in .env.local");
  }
  if (!key.startsWith("sk_test_")) {
    throw new Error("Refusing to run against a LIVE key — only sk_test_ allowed");
  }

  const stripe = new Stripe(key);
  console.log("Creating products in Stripe test mode…");

  const proId = await ensureProduct(stripe, "RideByWeather Pro", 900);
  const entId = await ensureProduct(stripe, "RideByWeather Enterprise", 4900);

  updateEnvKey(ENV_PATH, "STRIPE_PRO_PRICE_ID", proId);
  updateEnvKey(ENV_PATH, "STRIPE_ENTERPRISE_PRICE_ID", entId);
  console.log("\n.env.local updated.");
  console.log("Pro       :", proId);
  console.log("Enterprise:", entId);
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
