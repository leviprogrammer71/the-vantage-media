# Vantage — Google OAuth + Stripe Setup Walkthrough

Step-by-step "paste here, paste there" instructions to make Google sign-in and Stripe checkout work end-to-end. Do these in order. **Total time: ~20 minutes.**

> ⚠️ **First**: rotate the Google client secret you posted in chat. Anyone who saw it can use it. Go to Google Cloud Console → APIs & Services → Credentials → click your OAuth client → **Reset Secret**. The new secret is what you'll paste in Step 2 below.

---

## STEP 1 — Google Cloud Console: configure the OAuth client

1. Open https://console.cloud.google.com/apis/credentials
2. Make sure your project is selected (top-left dropdown)
3. Click your existing **OAuth 2.0 Client ID** (or create one: *Create Credentials → OAuth client ID → Web application*)
4. In **Authorized JavaScript origins**, make sure these are listed (add any missing):
   - `https://thevantage.co`
   - `http://localhost:5173` (for local dev)
   - your Lovable preview URL if you have one (e.g. `https://<id>.lovableproject.com`)
5. In **Authorized redirect URIs**, add **exactly** this (it's your Supabase project's auth callback):
   ```
   https://tsvmyjxnvdrwcdesiewv.supabase.co/auth/v1/callback
   ```
6. Click **Save**
7. Copy the **Client ID** and **Client secret** (the rotated one) — you need them in Step 2

---

## STEP 2 — Supabase: enable the Google provider

1. Open https://supabase.com/dashboard/project/tsvmyjxnvdrwcdesiewv/auth/providers
2. Find **Google**, toggle it ON
3. Paste your **Client ID** and **Client Secret** from Step 1
4. **Skip nonce checks**: leave OFF
5. Click **Save**

---

## STEP 3 — Supabase: set Site URL and Redirect URLs

1. Open https://supabase.com/dashboard/project/tsvmyjxnvdrwcdesiewv/auth/url-configuration
2. **Site URL**: `https://thevantage.co`
3. **Redirect URLs** (one per line — add all of these):
   ```
   https://thevantage.co/**
   http://localhost:5173/**
   ```
   Add your Lovable preview URL too (e.g. `https://<id>.lovableproject.com/**`) if you use it.
4. Click **Save**

> The `**` wildcard lets the OAuth flow return to `/` with the `?returnUrl=` query string we send.

---

## STEP 4 — Test Google sign-in

1. Visit `https://thevantage.co/login` (or your local `http://localhost:5173/login`)
2. Click **Continue with Google**
3. Pick your Google account
4. You should land back on `/` then auto-forward to wherever the user originally tried to go (e.g. `/video?mode=transform`)

If it errors out, the most common causes:
- **"redirect_uri_mismatch"** → the URI in Step 1.5 doesn't exactly match `https://tsvmyjxnvdrwcdesiewv.supabase.co/auth/v1/callback`
- **"Provider not enabled"** → Step 2 didn't save — toggle it again
- **Stuck on Google's "this page can't be reached"** → Step 3 Site URL / Redirect URLs need the wildcard `/**`

---

## STEP 5 — Stripe: get your secret key

1. Open https://dashboard.stripe.com/apikeys
2. Decide: **Test mode** for trial runs, **Live mode** when you want real money. Toggle in the top-right.
3. Reveal **Secret key** — starts with `sk_test_...` (test) or `sk_live_...` (live)
4. Copy it — you need it in Step 6

---

## STEP 6 — Supabase: set Stripe secrets

1. Open https://supabase.com/dashboard/project/tsvmyjxnvdrwcdesiewv/settings/functions
2. Scroll to **Edge Function Secrets**
3. Add (or update) these secrets:
   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the `sk_test_...` or `sk_live_...` from Step 5 |
   | `STRIPE_WEBHOOK_SECRET` | leave blank for now — fill after Step 8 |
4. Click **Save**

---

## STEP 7 — Stripe: create the products and prices

You have two equally valid options. **Pick A or B**, not both.

### Option A — Use lookup_keys (recommended, easiest)

For each product below: open https://dashboard.stripe.com/products → **+ Add product** → fill in name + price → **Show advanced options** → set **Lookup key** to the exact string in the table → Save.

| Lookup key | Product name | Price | Type | What it gives the user |
|---|---|---|---|---|
| `essentials_sub` | Essentials Subscription | $10.99 USD | Recurring monthly | 100 credits/month |
| `pro` | Pro Subscription | $49 USD | Recurring monthly | 60 credits/month |
| `studio` | Studio Subscription | $99 USD | Recurring monthly | 160 credits/month |
| `starter` | Starter Credit Pack | $19 USD | One-time | 200 credits |
| `standard` | Standard Credit Pack | $39 USD | One-time | 500 credits |
| `value` | Value Credit Pack | $79 USD | One-time | 1200 credits |
| `pro_pack` | Pro Credit Pack | $149 USD | One-time | 3000 credits |

✅ When you're done, the edge function will find each price by its lookup key automatically. Nothing else to configure.

### Option B — Match the existing hardcoded product IDs

This is for you if you've already imported the products. The edge function expects these exact `prod_` IDs:

```
pro          -> prod_TdrnttVY5gV77O
studio       -> prod_TdrnS0t3L5PCpc
starter      -> prod_Tdrn21OtswUTLO
standard     -> prod_TdrnlpbewfqKKF
value        -> prod_Tdrn6zpb3ig6ze
pro_pack     -> prod_TdrnzpZuc2BfqV
```

If you have these products in Stripe with active prices, you don't need lookup keys. If the product IDs differ, edit `supabase/functions/create-checkout/index.ts` lines 24–32 to match yours.

> 💡 **Note**: `check-subscription/index.ts` references different product IDs (`prod_TdYoQkGWmIclvj`, `prod_TdYoBJ3jc8yb32`) than `create-checkout/index.ts` does for `pro`/`studio`. If you go with Option B, **make these match** or active subscriptions won't be detected. Easiest fix: use Option A and update `check-subscription` to look up by lookup_key too — let me know if you want me to make that change.

---

## STEP 8 — Stripe: webhook for subscription events (optional but recommended)

Without this, Stripe events (subscription renewed, payment failed, subscription canceled) won't update your DB automatically.

1. Open https://dashboard.stripe.com/webhooks → **+ Add endpoint**
2. **Endpoint URL**: `https://tsvmyjxnvdrwcdesiewv.supabase.co/functions/v1/stripe-webhook`
   *(only if you have a `stripe-webhook` edge function — check `supabase/functions/` for it)*
3. **Events to send**: select
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. Click the endpoint → reveal **Signing secret** (starts with `whsec_...`)
6. Go back to Supabase **Edge Function Secrets** (Step 6) and paste it as `STRIPE_WEBHOOK_SECRET`

---

## STEP 9 — Deploy the edge functions

If you're using the Supabase CLI:
```bash
supabase functions deploy create-checkout
supabase functions deploy check-subscription
supabase functions deploy customer-portal
```

If you're using Lovable's auto-deploy, the functions are already live — just save & redeploy from the editor.

---

## STEP 10 — End-to-end test

1. Sign in (Google or email/password)
2. Visit `/pricing`
3. Click **Buy** on any plan
4. Stripe Checkout opens → use card `4242 4242 4242 4242`, any future date, any CVC
5. Pay → you should land on `/pricing?success=true&session_id=...`
6. Refresh `/dashboard` — credits should reflect the purchase

If credits don't update: check the webhook (Step 8). Without the webhook, you need to manually call the function that grants credits, or rely on `check-subscription` polling.

---

## TROUBLESHOOTING

| Symptom | Fix |
|---|---|
| `No active price found` from `/pricing` button | Step 7 wasn't done, or lookup_keys are misspelled |
| `STRIPE_SECRET_KEY is not set` | Step 6 wasn't saved — re-add and click Save |
| `Auth failed: ...` from checkout | User session expired — sign out / sign in |
| Google sign-in works but lands on `/` instead of where they were going | Make sure Step 3 redirect URLs include `/**` |
| Webhook says "Invalid signature" | `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint's signing secret — re-copy from Stripe |

---

## WHAT'S ALREADY DONE IN THE CODE

- ✅ `create-checkout/index.ts` now tries `prod_` ID first, then falls back to `lookup_key` — so Option A works without any code changes
- ✅ `signInWithGoogle()` accepts an optional `returnUrl` and passes it through the OAuth flow
- ✅ `Auth.tsx` validates `returnUrl` is a same-origin path (no open-redirects) and threads it through Google sign-in
- ✅ `OAuthReturnHandler` mounted on `/` catches the OAuth return and forwards users to where they were going
- ✅ All edge functions have `STRIPE_SECRET_KEY` env checks with descriptive errors

---

## ABOUT YOUR EARLIER REQUESTS

A couple things I couldn't do for you, and why:

- **"Use my Google client secret directly"** — I refused and you should rotate it now (Step 0 above). Credentials posted in chat are exposed; OAuth secrets must only ever be entered by you in the Supabase / Google consoles in your own browser session.
- **"Create a demo key special for you and access functionalities as a user"** — I can't create accounts or sign in as a user. You can create a demo account yourself (e.g. `demo@thevantage.co`) and grant it credits via the Supabase SQL editor if you want a sandbox account.
