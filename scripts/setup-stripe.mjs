#!/usr/bin/env node
// One-shot Stripe setup — creates the 4 credit-pack Products, each with a
// monthly + annual recurring Price, sets the lookup_key on each so the
// create-checkout edge function can resolve them, and (optionally) creates
// the webhook endpoint pointed at the Supabase function.
//
// USAGE:
//   1. Install the SDK:    npm i -D stripe
//   2. Export your key:    export STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
//   3. Run:                node scripts/setup-stripe.mjs
//   4. Copy the webhook signing secret it prints, then:
//        npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx \
//          --project-ref tsvmyjxnvdrwcdesiewv
//
// Idempotent: if a product/price/webhook with the same identifying key
// already exists, the script reuses it instead of erroring.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("ERROR: set STRIPE_SECRET_KEY env var first.");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

const SUPABASE_PROJECT_REF = "tsvmyjxnvdrwcdesiewv";
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/stripe-webhook`;

// Source of truth — must stay in sync with src/lib/credit-config.ts and
// supabase/functions/stripe-webhook/index.ts PRICE_TYPE_TO_CREDITS.
const PACKS = [
  {
    name: "Starter Credit Pack",
    description: "200 credits per month — ~5 transformation videos.",
    monthly: { lookup: "starter",         amount: 1900,   credits: 200 },
    annual:  { lookup: "starter_annual",  amount: 16000,  credits: 2800 },
  },
  {
    name: "Builder Credit Pack",
    description: "500 credits per month — ~12 transformation videos.",
    monthly: { lookup: "standard",        amount: 3900,   credits: 500 },
    annual:  { lookup: "standard_annual", amount: 32800,  credits: 7000 },
  },
  {
    name: "Pro Credit Pack",
    description: "1,200 credits per month — ~30 transformation videos. Best value.",
    monthly: { lookup: "value",           amount: 7900,   credits: 1200 },
    annual:  { lookup: "value_annual",    amount: 66400,  credits: 16800 },
  },
  {
    name: "Studio Credit Pack",
    description: "3,000 credits per month — ~75 transformation videos.",
    monthly: { lookup: "pro_pack",        amount: 14900,  credits: 3000 },
    annual:  { lookup: "pro_pack_annual", amount: 125200, credits: 42000 },
  },
];

async function findOrCreateProduct(name, description) {
  // Look for an existing product by name (active=true).
  for await (const p of stripe.products.list({ active: true, limit: 100 })) {
    if (p.name === name) {
      console.log(`  ↳ reusing product ${p.id} (${name})`);
      // Patch the description so it stays in sync.
      if (p.description !== description) {
        await stripe.products.update(p.id, { description });
      }
      return p;
    }
  }
  const p = await stripe.products.create({ name, description });
  console.log(`  ↳ created product ${p.id} (${name})`);
  return p;
}

async function findOrCreatePrice(productId, { lookup, amount, credits }, interval) {
  // Try lookup_key first — that's how the edge function resolves it later.
  const existing = await stripe.prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`  ↳ reusing price ${existing.data[0].id} (lookup_key=${lookup})`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    lookup_key: lookup,
    transfer_lookup_key: true,
    nickname: `${lookup} — ${credits} credits / ${interval}`,
    metadata: {
      price_type: lookup,
      credits_granted: String(credits),
    },
  });
  console.log(`  ↳ created price ${price.id} (lookup_key=${lookup}, $${amount / 100} / ${interval})`);
  return price;
}

async function findOrCreateWebhook() {
  for await (const ep of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (ep.url === WEBHOOK_URL) {
      console.log(`  ↳ webhook already exists: ${ep.id}`);
      console.log(`  ↳ NOTE: Stripe only reveals the signing secret at creation time.`);
      console.log(`  ↳ If you don't have it, delete this endpoint in Dashboard → Developers → Webhooks and re-run.`);
      return ep;
    }
  }
  const ep = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: [
      "checkout.session.completed",
      "invoice.paid",
      "customer.subscription.deleted",
    ],
    description: "Vantage credit-grant webhook",
  });
  console.log(`\n  ✓ created webhook ${ep.id}`);
  console.log(`  ✓ SIGNING SECRET (save this NOW — Stripe only shows it once):`);
  console.log(`\n      ${ep.secret}\n`);
  console.log(`  Then run:`);
  console.log(`      npx supabase secrets set STRIPE_WEBHOOK_SECRET=${ep.secret} \\`);
  console.log(`        --project-ref ${SUPABASE_PROJECT_REF}\n`);
  return ep;
}

async function main() {
  console.log(`\nUsing Stripe key: ${key.startsWith("sk_live_") ? "LIVE 🔴" : "TEST"}\n`);
  console.log("━━━ Products & Prices ━━━");
  for (const pack of PACKS) {
    console.log(`\n${pack.name}:`);
    const product = await findOrCreateProduct(pack.name, pack.description);
    await findOrCreatePrice(product.id, pack.monthly, "month");
    await findOrCreatePrice(product.id, pack.annual, "year");
  }

  console.log("\n━━━ Webhook Endpoint ━━━");
  await findOrCreateWebhook();

  console.log("\n✓ Done. Now deploy the edge functions:");
  console.log("    npx supabase functions deploy stripe-webhook --no-verify-jwt");
  console.log("    npx supabase functions deploy create-checkout\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  if (err.raw) console.error("Stripe error:", err.raw);
  process.exit(1);
});
