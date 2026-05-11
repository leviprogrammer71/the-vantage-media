// create-checkout — Stripe Checkout session builder
//
// We DO NOT use the Stripe Node SDK here. The SDK + Deno + Supabase Edge
// Runtime combination throws "An error occurred with our connection to Stripe"
// at random regardless of which httpClient is configured, because the SDK's
// internal HTTP transport doesn't survive the runtime boundary. Direct REST
// calls via Deno's native fetch() are bulletproof.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid priceType strings. The actual Stripe Price is resolved at runtime via
// the price's lookup_key (which must equal the priceType string). Set the
// lookup_key in the Stripe dashboard or via setup-stripe.mjs.
const VALID_PRICE_TYPES = new Set([
  "pro", "studio", "essentials_sub", "solo_agent",
  "starter", "standard", "value", "pro_pack",
  "starter_annual", "standard_annual", "value_annual", "pro_pack_annual",
]);

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// ---- Stripe REST helper ----------------------------------------------------
// Stripe's REST API takes `application/x-www-form-urlencoded` bodies (not JSON)
// with bracket notation for nested fields (e.g. line_items[0][price]=...).
function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          parts.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof v === "object") {
      parts.push(formEncode(v as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

async function stripeCall(
  stripeKey: string,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, unknown>,
): Promise<any> {
  let url = `https://api.stripe.com${path}`;
  let body: string | undefined;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${stripeKey}`,
  };
  if (method === "GET" && params) {
    const qs = formEncode(params);
    if (qs) url += `?${qs}`;
  } else if (method === "POST" && params) {
    body = formEncode(params);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Stripe returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = parsed?.error?.message || `HTTP ${res.status}`;
    const code = parsed?.error?.code ? ` (code: ${parsed.error.code})` : "";
    throw new Error(`Stripe ${path} failed: ${msg}${code}`);
  }
  return parsed;
}

// ---- Server ----------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    logStep("Function started");

    const rawKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!rawKey) throw new Error("STRIPE_SECRET_KEY is not set in Supabase secrets");
    // Strip whitespace + any non-printable / non-ASCII characters. A trailing
    // newline or invisible unicode char in the Supabase secret value causes
    // fetch() to throw "headers is not a valid ByteString".
    const stripeKey = rawKey.replace(/[^\x21-\x7E]/g, "");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY contained only invalid characters");
    if (stripeKey !== rawKey) {
      logStep("Sanitized key", {
        rawLen: rawKey.length,
        cleanLen: stripeKey.length,
        stripped: rawKey.length - stripeKey.length,
      });
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
    if (!priceType || !VALID_PRICE_TYPES.has(priceType)) {
      throw new Error(`Invalid price type: ${priceType}`);
    }

    logStep("Stripe key info", {
      keyPrefix: stripeKey.slice(0, 8),
      keyLen: stripeKey.length,
    });

    // 1. Resolve the price by lookup_key.
    const pricesResp = await stripeCall(stripeKey, "GET", "/v1/prices", {
      "lookup_keys[]": priceType,
      active: "true",
      limit: "1",
    });
    const price = pricesResp?.data?.[0];
    if (!price?.id) {
      throw new Error(
        `No active Stripe Price found with lookup_key="${priceType}". ` +
        `Create one in Stripe or run scripts/setup-stripe.mjs.`,
      );
    }
    const priceId = price.id;
    // Trust the Stripe price object over the client's isSubscription flag.
    // Recurring prices REQUIRE subscription mode; one-time prices REQUIRE
    // payment mode. Stripe rejects any mismatch.
    const priceIsRecurring = !!price.recurring;
    const mode = priceIsRecurring ? "subscription" : "payment";
    logStep("Found price by lookup_key", {
      priceId,
      lookup_key: priceType,
      recurring: priceIsRecurring,
      resolved_mode: mode,
      client_isSubscription: isSubscription,
    });

    // 2. Find existing customer by email (optional — Stripe also accepts customer_email).
    let customerId: string | undefined;
    try {
      const custResp = await stripeCall(stripeKey, "GET", "/v1/customers", {
        email: user.email,
        limit: "1",
      });
      if (custResp?.data?.[0]?.id) {
        customerId = custResp.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    } catch (e) {
      // Non-fatal — proceed with customer_email path.
      logStep("Customer lookup skipped", { error: String(e) });
    }

    // 3. Create the Checkout Session.
    const origin = req.headers.get("origin") || "https://thevantage.media";
    const sessionParams: Record<string, unknown> = {
      mode,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      "metadata[user_id]": user.id,
      "metadata[price_type]": priceType,
    };
    if (customerId) sessionParams.customer = customerId;
    else sessionParams.customer_email = user.email;

    const session = await stripeCall(
      stripeKey,
      "POST",
      "/v1/checkout/sessions",
      sessionParams,
    );

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const err = error as Error;
    logStep("ERROR", { message: err.message, stack: err.stack?.slice(0, 600) });
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
