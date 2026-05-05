// Stripe webhook receiver — credits the user's profile when a checkout completes.
//
// Without this, payments succeed in Stripe but `profiles.credits_balance` never
// increments. This is the fix for the "customer paid but never got credits" bug.
//
// Setup checklist (do this once after deploying):
//   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
//      URL: https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
//      Events to send:
//        - checkout.session.completed
//        - invoice.paid                  (for subscription renewals)
//        - customer.subscription.deleted (for cancellation cleanup)
//   2. Reveal the signing secret. It looks like `whsec_...`.
//   3. Add it to Supabase secrets:
//      npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref <ref>
//   4. Deploy:
//      npx supabase functions deploy stripe-webhook --project-ref <ref> --no-verify-jwt
//      (--no-verify-jwt is required: Stripe signs requests itself, no Supabase auth header)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2"

// Map every price_type the create-checkout function uses → credits granted.
// MUST match `src/lib/credit-config.ts` CREDIT_PACKS + SUBSCRIPTION_PLANS.
const PRICE_TYPE_TO_CREDITS: Record<string, number> = {
  // Credit packs (one-time purchases)
  starter: 200,
  standard: 500, // matches the BUILDER pack (priceType: "standard")
  value: 1200, // matches the PRO pack (priceType: "value")
  pro_pack: 3000, // matches the STUDIO pack (priceType: "pro_pack")
  // Subscriptions — granted on every renewal
  pro: 60, // legacy small sub
  studio: 160, // legacy mid sub
  essentials_sub: 100,
  solo_agent: 800,
  // (Studio sub credits are granted via product/price metadata if needed)
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
}

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : ""
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
  if (!stripeKey || !webhookSecret) {
    log("Missing env", { hasKey: !!stripeKey, hasSecret: !!webhookSecret })
    return new Response("Server misconfigured", { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" })

  // 1. Verify the signature so we know this request is really from Stripe.
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    log("Missing signature header")
    return new Response("Missing signature", { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (err) {
    log("Signature verification failed", { error: (err as Error).message })
    return new Response(`Bad signature: ${(err as Error).message}`, { status: 400 })
  }

  log("Event verified", { type: event.type, id: event.id })

  // 2. Service-role client so we can write to profiles and credit_transactions.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(stripe, supabase, session, event.id)
    } else if (event.type === "invoice.paid") {
      // Subscription renewal. Stripe Invoices include the subscription line items.
      const invoice = event.data.object as Stripe.Invoice
      await handleInvoicePaid(stripe, supabase, invoice, event.id)
    } else if (event.type === "customer.subscription.deleted") {
      // Optional: log for analytics. We don't subtract credits on cancellation —
      // they keep what they earned.
      log("Subscription cancelled", { id: (event.data.object as Stripe.Subscription).id })
    } else {
      log("Ignoring event type", { type: event.type })
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (err) {
    log("Handler error", { error: (err as Error).message, stack: (err as Error).stack?.slice(0, 400) })
    // Return 500 so Stripe retries automatically (it backs off and retries up to 3 days).
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})

async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const userId = session.metadata?.user_id
  const priceType = session.metadata?.price_type
  if (!userId || !priceType) {
    log("Missing metadata on session", {
      sessionId: session.id,
      metadata: session.metadata,
    })
    return // Don't error — just skip. Probably a Stripe-internal session, not ours.
  }

  // Idempotency: dedupe by Stripe session id so retries don't double-credit.
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle()

  if (existing) {
    log("Duplicate — already credited this session", { sessionId: session.id })
    return
  }

  const credits = PRICE_TYPE_TO_CREDITS[priceType]
  if (!credits) {
    log("Unknown price_type, skipping", { priceType })
    return
  }

  await grantCredits(supabase, {
    userId,
    credits,
    description: `Credit purchase: ${priceType}`,
    stripeSessionId: session.id,
    stripeEventId: eventId,
  })

  log("Credited user", { userId, credits, priceType, sessionId: session.id })
}

async function handleInvoicePaid(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
  eventId: string
) {
  // Only handle subscription renewals. The first invoice for a sub also fires
  // checkout.session.completed, so we use a different id (invoice.id) for dedup
  // and skip if there's no subscription attached.
  // @ts-expect-error Stripe types incomplete on Invoice.subscription
  const subscriptionId = invoice.subscription as string | null
  if (!subscriptionId) return

  // Look up the subscription to read the price_type metadata.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceType =
    subscription.metadata?.price_type ||
    invoice.metadata?.price_type ||
    null

  // Find the user. Prefer subscription metadata, fall back to invoice customer email.
  const userId =
    subscription.metadata?.user_id ||
    invoice.metadata?.user_id ||
    (await findUserByEmail(supabase, invoice.customer_email))

  if (!userId || !priceType) {
    log("Invoice missing user_id or price_type", { invoiceId: invoice.id })
    return
  }

  // Idempotency on invoice.id
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle()
  if (existing) {
    log("Duplicate — already credited this invoice", { invoiceId: invoice.id })
    return
  }

  const credits = PRICE_TYPE_TO_CREDITS[priceType]
  if (!credits) return

  await grantCredits(supabase, {
    userId,
    credits,
    description: `Subscription renewal: ${priceType}`,
    stripeInvoiceId: invoice.id,
    stripeEventId: eventId,
  })

  log("Credited subscription renewal", { userId, credits, priceType })
}

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string | null | undefined
): Promise<string | null> {
  if (!email) return null
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle()
  return (data as { user_id: string } | null)?.user_id ?? null
}

async function grantCredits(
  supabase: ReturnType<typeof createClient>,
  opts: {
    userId: string
    credits: number
    description: string
    stripeSessionId?: string
    stripeInvoiceId?: string
    stripeEventId: string
  }
) {
  const { userId, credits, description, stripeSessionId, stripeInvoiceId, stripeEventId } = opts

  // 1. Read current balance.
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("user_id", userId)
    .maybeSingle()

  if (readErr) throw new Error(`Read profile failed: ${readErr.message}`)

  const currentBalance = (profile as { credits_balance: number } | null)?.credits_balance ?? 0
  const newBalance = currentBalance + credits

  // 2. Increment balance.
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ credits_balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
  if (updateErr) throw new Error(`Update profile failed: ${updateErr.message}`)

  // 3. Log the transaction.
  const tx: Record<string, unknown> = {
    user_id: userId,
    credits_amount: credits,
    transaction_type: "purchase",
    description,
    stripe_event_id: stripeEventId,
  }
  if (stripeSessionId) tx.stripe_session_id = stripeSessionId
  if (stripeInvoiceId) tx.stripe_invoice_id = stripeInvoiceId

  const { error: txErr } = await supabase.from("credit_transactions").insert([tx])
  if (txErr) {
    // Tx insert failed — roll the balance back so we don't leave the user with
    // credits but no audit trail. This is rare; usually means schema mismatch.
    await supabase
      .from("profiles")
      .update({ credits_balance: currentBalance })
      .eq("user_id", userId)
    throw new Error(`Transaction insert failed: ${txErr.message}`)
  }
}
