import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Plus, Loader2, Trash2, Plug, ShieldCheck } from "lucide-react";

/**
 * ConnectClaudePanel
 *
 * The "Connect to Claude" surface. Lets a signed-in agent mint a personal
 * connector token (shown once), copy the connector URL + token, and revoke old
 * tokens. All the heavy lifting — fetching a listing, generating the reel,
 * writing the caption — happens on the server + in the connected Claude, so the
 * user's only job here is: click generate, copy, paste.
 */

// Public connector endpoint. Override at build time with VITE_VANTAGE_MCP_URL.
const CONNECTOR_URL =
  (import.meta.env.VITE_VANTAGE_MCP_URL as string | undefined) || "https://mcp.thevantage.media/mcp";

interface TokenRow {
  id: string;
  token_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`${label} copied`);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Couldn't copy — select and copy manually.");
        }
      }}
      className="lux-eyebrow inline-flex items-center gap-1.5 px-3 py-2"
      style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", fontSize: "0.6rem", flexShrink: 0 }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

export default function ConnectClaudePanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_mcp_tokens");
    if (error) {
      console.error("list_mcp_tokens failed:", error);
      toast.error("Couldn't load your connector tokens.");
    } else {
      setTokens((data as TokenRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createToken = async () => {
    setCreating(true);
    const { data, error } = await supabase.rpc("create_mcp_token", { p_label: "Claude connector" });
    setCreating(false);
    if (error) {
      console.error("create_mcp_token failed:", error);
      toast.error("Couldn't generate a token. Please try again.");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.token) {
      setFreshToken(row.token as string);
      toast.success("Token generated — copy it now, it won't be shown again.");
      load();
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.rpc("revoke_mcp_token", { p_id: id });
    if (error) {
      toast.error("Couldn't revoke that token.");
      return;
    }
    toast.success("Token revoked.");
    load();
  };

  const active = tokens.filter((t) => !t.revoked);

  return (
    <div style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)" }}>
      {/* Header */}
      <div className="p-6 sm:p-8" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
        <div className="lux-eyebrow inline-flex items-center gap-2 mb-3" style={{ color: "var(--lux-rust)" }}>
          <Plug size={13} /> CONNECT TO CLAUDE
        </div>
        <h2 className="lux-display" style={{ fontSize: "1.9rem", lineHeight: 1.05, color: "var(--lux-ink)" }}>
          Make reels from <em style={{ color: "var(--lux-brass)" }}>inside Claude</em>.
        </h2>
        <p className="lux-prose mt-3" style={{ fontSize: "0.95rem", maxWidth: 620, color: "var(--lux-ink)" }}>
          Paste a Zillow or Airbnb link — or drop your photos — into any Claude chat and get a finished,
          captioned reel back. No dashboard, no timeline. Connect once with the token below.
        </p>
      </div>

      {/* Step 1 — token */}
      <div className="p-6 sm:p-8" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
        <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)" }}>STEP 1 · YOUR CONNECTOR TOKEN</div>

        {freshToken ? (
          <div className="mb-4">
            <div
              className="flex items-center gap-3 p-4 flex-wrap"
              style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
            >
              <code
                className="flex-1 min-w-[220px]"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", wordBreak: "break-all" }}
              >
                {freshToken}
              </code>
              <CopyButton value={freshToken} label="Token" />
            </div>
            <p className="lux-prose mt-2" style={{ fontSize: "0.8rem", color: "var(--lux-rust)" }}>
              ⚠ Copy it now — for your security this is the only time the full token is shown.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={createToken}
            disabled={creating}
            className="lux-btn inline-flex items-center gap-2"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "12px 22px", opacity: creating ? 0.6 : 1 }}
          >
            {creating ? <Loader2 size={15} className="lux-spin" /> : <Plus size={15} />}
            {creating ? "GENERATING…" : "GENERATE TOKEN"}
          </button>
        )}

        {/* Existing tokens */}
        {loading ? (
          <div className="lux-eyebrow mt-4 inline-flex items-center gap-2" style={{ color: "var(--lux-ash)" }}>
            <Loader2 size={13} className="lux-spin" /> LOADING…
          </div>
        ) : active.length > 0 ? (
          <div className="mt-5 space-y-2">
            {active.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: "var(--lux-bone)", border: "1px solid var(--lux-hairline)" }}
              >
                <div className="min-w-0">
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.8rem", color: "var(--lux-ink)" }}>
                    {t.token_prefix}…
                  </code>
                  <span className="lux-prose ml-3" style={{ fontSize: "0.72rem", color: "var(--lux-ash)" }}>
                    {t.last_used_at ? `last used ${new Date(t.last_used_at).toLocaleDateString()}` : "never used"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(t.id)}
                  className="lux-eyebrow inline-flex items-center gap-1.5"
                  style={{ color: "var(--lux-rust)", fontSize: "0.6rem", flexShrink: 0 }}
                  title="Revoke this token"
                >
                  <Trash2 size={13} /> REVOKE
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Step 2 — connector URL */}
      <div className="p-6 sm:p-8" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
        <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)" }}>STEP 2 · ADD THE CONNECTOR IN CLAUDE</div>
        <p className="lux-prose mb-3" style={{ fontSize: "0.9rem", color: "var(--lux-ink)" }}>
          In Claude, open <strong>Settings → Connectors → Add custom connector</strong> and paste this URL.
          When asked for authentication, paste your token above as a Bearer token.
        </p>
        <div
          className="flex items-center gap-3 p-4 flex-wrap"
          style={{ background: "var(--lux-bone)", border: "1px solid var(--lux-hairline-strong)" }}
        >
          <code
            className="flex-1 min-w-[220px]"
            style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "var(--lux-ink)", wordBreak: "break-all" }}
          >
            {CONNECTOR_URL}
          </code>
          <CopyButton value={CONNECTOR_URL} label="Connector URL" />
        </div>
      </div>

      {/* Step 3 — use it */}
      <div className="p-6 sm:p-8">
        <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)" }}>STEP 3 · JUST ASK</div>
        <p className="lux-prose mb-3" style={{ fontSize: "0.9rem", color: "var(--lux-ink)" }}>
          That's it. In any Claude chat, say:
        </p>
        <div
          className="p-4 mb-4 lux-prose"
          style={{ background: "var(--lux-parchment)", borderLeft: "2px solid var(--lux-brass)", fontSize: "0.9rem", fontStyle: "italic", color: "var(--lux-ink)" }}
        >
          "Make me a reel for this listing: <span style={{ color: "var(--lux-brass)" }}>[paste Zillow/Airbnb link]</span>"
        </div>
        <div className="lux-prose inline-flex items-center gap-2" style={{ fontSize: "0.78rem", color: "var(--lux-ash)" }}>
          <ShieldCheck size={14} /> Your token bills your account's credits. Revoke it anytime — reels still appear in your gallery.
        </div>
      </div>
    </div>
  );
}
