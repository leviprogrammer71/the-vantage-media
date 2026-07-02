# The Vantage — MCP Server

Create short-form real-estate video reels **entirely through Claude** — from a
Zillow/Airbnb link or from photos an agent uploads, no dashboard login required.

The server wraps The Vantage's existing reel generator (the `generate-listing-video`
Supabase edge function) and hides its async nature, so a single tool call returns
a **finished reel URL plus a ready-to-post caption and hashtags**.

## Tools

| Tool | Purpose | Read-only |
| --- | --- | --- |
| `vantage_fetch_listing` | Fetch photos + details from a Zillow/Airbnb URL | ✅ |
| `vantage_generate_reel` | Render a reel from uploaded photos | ❌ |
| `vantage_create_reel_from_url` | **Primary.** Fetch a listing URL + render in one call | ❌ |

### Input paths
- **Path 1 — Zillow/Airbnb URL:** `vantage_create_reel_from_url` (or `vantage_fetch_listing` to review first).
- **Path 2 — Own photos:** `vantage_generate_reel` with `photos: [...]`.
- **Path 3 — MLS / listing number:** *planned, not yet implemented.*

## Setup

```bash
cd vantage-mcp-server
npm install
npm run build
```

Copy `.env.example` to `.env` and fill in values (at minimum a `VANTAGE_TOKEN`
for local testing, or send it per-request as a header in production).

## Run

Remote (Streamable HTTP, stateless JSON) — recommended:

```bash
TRANSPORT=http PORT=3000 npm start
# → POST http://localhost:3000/mcp     (health: GET /health)
```

Local (stdio):

```bash
TRANSPORT=stdio npm start
```

## Auth

Every request is billed against an agent's Vantage account via their **session
token** (a Supabase user JWT). The server resolves it in this order:

1. `Authorization: Bearer <token>` request header
2. `x-vantage-token` request header
3. `VANTAGE_TOKEN` environment variable (local/stdio)

The Supabase anon key (public) is read from `VANTAGE_SUPABASE_ANON_KEY`.

## Test with MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
# set TRANSPORT=stdio, or point the Inspector's HTTP transport at /mcp
```

Try, in order:
1. `vantage_fetch_listing` with a Zillow/Airbnb URL — verify photos/details.
2. `vantage_create_reel_from_url` with the same URL — verify a reel URL + caption.
3. `vantage_generate_reel` with 2-9 image URLs — verify the photo-upload path.

## System prompt

`system-prompt.md` is the recommended assistant instruction to pair with this
MCP so Claude uses the tools the way agents expect.

## Notes & limitations

- **Listing scraping is best-effort.** Zillow/Airbnb use bot protection and
  change their markup often. On any failure the tools return an actionable
  error telling the agent to upload photos directly (`vantage_generate_reel`).
- **Photos** may be public image URLs or base64 data URIs; up to 9 are used,
  in the order provided (= the order they appear in the reel).
- **Generation blocks** until the reel is rendered (typically 1-3 minutes); the
  async Replicate poll loop is handled internally.
