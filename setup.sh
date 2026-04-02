#!/bin/bash
# ============================================================
# The Vantage — Supabase Setup Script
# Run this from the project root on your local machine.
# Prerequisites: Supabase CLI installed (npx supabase or brew install supabase/tap/supabase)
# ============================================================

set -euo pipefail

PROJECT_REF="tsvmyjxnvdrwcdesiewv"
echo "Setting up The Vantage on Supabase project: $PROJECT_REF"
echo ""

# ---- 1. Link project ----
echo "Step 1: Linking Supabase project..."
npx supabase link --project-ref "$PROJECT_REF"
echo "Project linked"
echo ""

# ---- 2. Set edge function secrets ----
echo "Step 2: Setting edge function secrets..."
echo "Enter your API keys (they won't be echoed):"

read -sp "  OPENROUTER_API_KEY: " OPENROUTER_KEY && echo ""
read -sp "  REPLICATE_API_TOKEN: " REPLICATE_KEY && echo ""
read -sp "  RESEND_API_KEY: " RESEND_KEY && echo ""
read -sp "  STRIPE_SECRET_KEY: " STRIPE_KEY && echo ""

npx supabase secrets set \
  OPENROUTER_API_KEY="$OPENROUTER_KEY" \
  REPLICATE_API_TOKEN="$REPLICATE_KEY" \
  RESEND_API_KEY="$RESEND_KEY" \
  STRIPE_SECRET_KEY="$STRIPE_KEY"
echo "Secrets set"
echo ""

# ---- 3. Push database migrations ----
echo "Step 3: Running database migrations..."
npx supabase db push
echo "Migrations applied"
echo ""

# ---- 4. Deploy edge functions ----
echo "Step 4: Deploying all edge functions..."
FUNCTIONS=(
  analyze-submission
  build-video-prompt
  check-subscription
  create-checkout
  customer-portal
  demo-enhance
  enhance-photo
  generate-listing-video
  generate-transformation-video
  generate-video
  get-shared-video
  send-confirmation
  send-email-sequence
  website-consultation
)

for fn in "${FUNCTIONS[@]}"; do
  echo "  Deploying $fn..."
  npx supabase functions deploy "$fn" --no-verify-jwt
done
echo "All edge functions deployed"
echo ""

# ---- 5. Summary ----
echo "============================================================"
echo "SETUP COMPLETE!"
echo ""
echo "What's done:"
echo "  - Project linked to $PROJECT_REF"
echo "  - 4 API secrets set (OpenRouter, Replicate, Resend, Stripe)"
echo "  - 17 database migrations applied"
echo "  - 14 edge functions deployed"
echo ""
echo "Still needed (manual in Supabase Dashboard):"
echo "  1. Auth > Providers > Enable Google OAuth"
echo "     - Set Google Client ID & Secret"
echo "     - Add redirect URL: https://tsvmyjxnvdrwcdesiewv.supabase.co/auth/v1/callback"
echo "  2. Auth > URL Configuration > Set Site URL to your domain"
echo "  3. Auth > URL Configuration > Add redirect URLs for your domain"
echo ""
echo "IMPORTANT: Rotate all API keys after confirming everything works!"
echo "============================================================"
