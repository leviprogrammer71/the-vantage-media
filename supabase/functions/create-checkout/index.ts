import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs - These are the Stripe price IDs for our products
const PRICE_IDS = {
  // Subscriptions
  pro: "price_vantage_pro_monthly", // $49/month - 60 credits
  studio: "price_vantage_studio_monthly", // $99/month - 160 credits
  essentials_sub: "price_vantage_essentials_monthly", // $10.99/month - 100 credits
  // Credit packs (one-time)
  starter: "price_credit_pack_starter", // $19 - 200 credits
  standard: "price_credit_pack_standard", // $39 - 500 credits  
  value: "price_credit_pack_value", // $79 - 1200 credits
  pro_pack: "price_credit_pack_pro", // $149 - 3000 credits
};

// Product IDs mapping
const PRODUCT_IDS = {
  pro: "prod_TdrnttVY5gV77O",
  studio: "prod_TdrnS0t3L5PCpc",
  essentials_sub: "prod_essentials_sub", // Will need real Stripe product ID
  starter: "prod_Tdrn21OtswUTLO",
  standard: "prod_TdrnlpbewfqKKF",
  value: "prod_Tdrn6zpb3ig6ze",
  pro_pack: "prod_TdrnzpZuc2BfqV",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set in Supabase secrets");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw new Error(`Auth failed: ${authError.message}`);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceType, isSubscription } = await req.json();
    logStep("Request body", { priceType, isSubscription });

    if (!priceType || !PRICE_IDS[priceType as keyof typeof PRICE_IDS]) {
      throw new Error(`Invalid price type: ${priceType}`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://thevantage.co";

    // Resolve price: try product ID first, then fall back to lookup_key by priceType.
    const productId = PRODUCT_IDS[priceType as keyof typeof PRODUCT_IDS];
    let priceId: string | null = null;

    if (productId && !productId.includes("essentials_sub")) {
      const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
        logStep("Found price by product", { priceId, productId });
      }
    }

    // Fallback: lookup by lookup_key matching the priceType (e.g., "starter", "standard", etc.)
    if (!priceId) {
      const byLookup = await stripe.prices.list({ lookup_keys: [priceType], active: true, limit: 1 });
      if (byLookup.data.length > 0) {
        priceId = byLookup.data[0].id;
        logStep("Found price by lookup_key", { priceId, lookup_key: priceType });
      }
    }

    if (!priceId) {
      throw new Error(
        `No active price found. Either create a Stripe product with ID "${productId}" ` +
          `or add a price with lookup_key "${priceType}". See setup guide for details.`
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        price_type: priceType,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
