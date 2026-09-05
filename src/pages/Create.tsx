import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useListingPipeline, type PipelineResult, type LogLine } from "@/hooks/useListingPipeline";
import { useBrandKit, EMPTY_KIT, type BrandKit } from "@/hooks/useBrandKit";
import { Pill, Tag, Field, StatCard, Card, HandNote, PhoneMock } from "@/components/lux/elements";
import { toast } from "sonner";

/**
 * /create — "Give us the listing. We make the content."
 *
 * Four screens, nothing more:
 *   1 INPUT       — a URL field or 8 photos. No settings. The machine decides.
 *   2 PROCESSING  — a live production log. Proof of work, not a spinner.
 *   3 REVIEW      — the reel, the Property Lock report, format packaging.
 *   4 BRAND KIT   — one-time, optional. The retention mechanism.
 */

type Screen = "input" | "processing" | "review" | "brand";

/* ─────────────────────────── shared bits ─────────────────────────── */

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
    <header
      className="sticky top-0 z-40"
      style={{ background: "var(--lux-bone)", borderBottom: "1px solid var(--lux-hairline)" }}
    >
      <div className="lux-container flex items-center justify-between" style={{ minHeight: 68 }}>
        <Link to="/" className="flex items-baseline gap-2 no-underline" style={{ color: "var(--lux-ink)" }}>
          <span className="lux-display-italic" style={{ fontSize: 22, lineHeight: 1 }}>The Vantage</span>
          <span className="lux-eyebrow hidden sm:inline" style={{ color: "var(--lux-brass)", fontSize: "0.55rem" }}>
            AUTOMATED LISTING MEDIA
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/examples" className="lux-eyebrow hidden sm:inline" style={{ color: "var(--lux-ink)", opacity: 0.7, fontSize: "0.6rem" }}>
            THE GALLERY
          </Link>
          <Link to="/profile" className="lux-eyebrow" style={{ color: "var(--lux-ink)", opacity: 0.7, fontSize: "0.6rem" }}>
            ACCOUNT
          </Link>
        </div>
      </div>
    </header>
    <main id="main-content">{children}</main>
  </div>
);

const Mono: React.CSSProperties = { fontFamily: "'Space Mono', ui-monospace, monospace" };

/* ─────────────────────────── SCREEN 1 · INPUT ─────────────────────────── */

function InputScreen({ onStart }: { onStart: (i: { url?: string; files?: File[] }) => void }) {
  const [url, setUrl] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const takeFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, 8);
    onStart({ files });
  };

  return (
    <div className="lux-container" style={{ paddingTop: "9vh", paddingBottom: 100, maxWidth: 760 }}>
      <div className="lux-eyebrow mb-5" style={{ color: "var(--lux-rust)" }}>AUTOMATED LISTING MEDIA</div>
      <h1 className="lux-display" style={{ fontSize: "clamp(2.4rem, 6vw, 4.4rem)", lineHeight: 0.96, letterSpacing: "-0.02em" }}>
        Give us the listing.
        <br />
        <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>We make the content.</span>
      </h1>

      {/* Option A — the URL is the instruction */}
      <div className="mt-11 flex items-start gap-3 flex-wrap">
        <div style={{ flex: "1 1 380px" }}>
          <Field
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) onStart({ url: url.trim() }); }}
            placeholder="Paste a Zillow, MLS, or Airbnb link"
            aria-label="Listing URL"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" />
              </svg>
            }
          />
        </div>
        <HandNote arrow="left" style={{ paddingTop: 16 }}>the machine takes it from here</HandNote>
      </div>

      <div className="flex items-center gap-4 my-6">
        <div style={{ flex: 1, height: 1, background: "var(--lux-hairline)" }} />
        <span className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.58rem" }}>OR</span>
        <div style={{ flex: 1, height: 1, background: "var(--lux-hairline)" }} />
      </div>

      {/* Option B — an open zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); takeFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
        className="text-center cursor-pointer transition-colors"
        style={{
          border: `1px dashed ${drag ? "var(--lux-rust)" : "var(--lux-hairline-strong)"}`,
          background: drag ? "rgba(140,63,46,0.05)" : "var(--lux-cream)",
          borderRadius: 18,
          padding: "46px 24px",
        }}
      >
        <div className="lux-prose" style={{ color: "var(--lux-ash)", fontSize: "1rem" }}>
          Or drop up to 8 listing photos
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => takeFiles(e.target.files)}
        />
      </div>

      <p className="mt-8" style={{ ...Mono, fontSize: "0.72rem", color: "var(--lux-ash)", letterSpacing: "0.02em" }}>
        The machine reads your listing before it touches a single frame.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Pill
          variant="dark"
          onClick={() => (url.trim() ? onStart({ url: url.trim() }) : fileRef.current?.click())}
          style={{ padding: "18px 32px", fontSize: "0.92rem", color: "var(--lux-champagne)" }}
        >
          Build my reel →
        </Pill>
        <Tag tone="rust">1 listing · a week of content</Tag>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
        <StatCard value="3 min" label="Average render" />
        <StatCard value="8" label="Photos in, full reel out" />
        <StatCard value="1080p" label="Minimum output" />
        <StatCard value="60" label="Free credits" hint="NO CARD" />
      </div>
    </div>
  );
}

/* ──────────────────── SCREEN 2 · PROCESSING (the machine) ──────────────────── */

function LogRow({ line }: { line: LogLine }) {
  const color =
    line.kind === "lock" ? "var(--lux-rust)"
    : line.kind === "ok" ? "#2E6E42"
    : line.kind === "warn" ? "var(--lux-rust)"
    : line.kind === "detail" ? "var(--lux-ash)"
    : "var(--lux-ink)";
  const glyph = line.kind === "ok" ? "✓" : line.kind === "warn" ? "!" : "✦";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...Mono, fontSize: "0.82rem", color, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ color: line.kind === "ok" ? "#2E6E42" : "var(--lux-rust)" }}>{glyph}</span>
        <span>{line.text}</span>
      </div>
      {line.sub?.length ? (
        <div style={{ paddingLeft: 26, marginTop: 6 }}>
          {line.sub.map((s, i) => (
            <div key={i} style={{ ...Mono, fontSize: "0.72rem", color: "var(--lux-ash)", lineHeight: 1.7 }}>{s}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProcessingScreen({
  log,
  shots,
}: {
  log: LogLine[];
  shots: { photo: string; status: "pending" | "ok" }[];
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [log.length]);

  return (
    <div className="lux-container" style={{ paddingTop: 46, paddingBottom: 100 }}>
      <div className="grid lg:grid-cols-12 gap-10">
        {/* The production log */}
        <div className="lg:col-span-8">
          <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-rust)" }}>THE MACHINE · WORKING</div>
          <div
            style={{
              background: "var(--lux-cream)",
              border: "1px solid var(--lux-hairline-strong)",
              padding: "26px 24px",
              maxHeight: "62vh",
              overflowY: "auto",
            }}
          >
            {log.map((l) => <LogRow key={l.id} line={l} />)}
            <div ref={endRef} />
          </div>
          <div className="lux-eyebrow mt-5" style={{ color: "var(--lux-rust)", fontSize: "0.6rem" }}>
            ◆ PROPERTY LOCK ACTIVE — ALL CONTENT FAITHFUL TO YOUR LISTING
          </div>
        </div>

        {/* Validated filmstrip */}
        <div className="lg:col-span-4">
          <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-ash)" }}>VALIDATED SHOTS</div>
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-3">
            {shots.map((s, i) => (
              <div key={i} className="relative" style={{ aspectRatio: "1/1", overflow: "hidden", border: "1px solid var(--lux-hairline)" }}>
                <img src={s.photo} alt="" aria-hidden className="w-full h-full object-cover"
                  style={{ filter: s.status === "ok" ? "none" : "grayscale(1) opacity(0.45)", transition: "filter .5s" }} />
                {s.status === "ok" && (
                  <span className="absolute" style={{
                    right: 6, bottom: 6, width: 20, height: 20, borderRadius: 999,
                    background: "#2E6E42", color: "#fff", fontSize: 12, display: "grid", placeItems: "center",
                  }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── SCREEN 3 · REVIEW ─────────────────────── */

function ReviewScreen({
  result,
  kit,
  onBrand,
  onRestart,
}: {
  result: PipelineResult;
  kit: BrandKit | null;
  onBrand: () => void;
  onRestart: () => void;
}) {
  const [showReport, setShowReport] = useState(false);
  const [format, setFormat] = useState<"reel" | "tiktok" | "mls">("reel");
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const [showControls, setShowControls] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowControls(true), 5000); return () => clearTimeout(t); }, []);

  const download = async () => {
    try {
      const res = await fetch(result.videoUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const safe = (result.listing.address || "vantage").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
      a.download = `${safe}-${format}.mp4`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(result.videoUrl, "_blank");
    }
  };

  const FORMATS: { id: typeof format; label: string; note: string }[] = [
    { id: "reel", label: "Instagram Reel", note: "9:16 · 15s" },
    { id: "tiktok", label: "TikTok", note: "9:16 · captions" },
    { id: "mls", label: "MLS Export", note: "AI-disclosure tag" },
  ];

  return (
    <div className="lux-container" style={{ paddingTop: 40, paddingBottom: 110, maxWidth: 940 }}>
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6">
          <PhoneMock label={result.listing.address ? undefined : "Just Listed"}>
            <video
              ref={vidRef}
              src={result.videoUrl}
              autoPlay
              loop
              playsInline
              controls={showControls}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </PhoneMock>
        </div>

        <div className="lg:col-span-6">
          <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>YOUR REEL IS READY</div>
          <h1 className="lux-display" style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", lineHeight: 1.02 }}>
            {result.listing.address || "Your listing"}
          </h1>
          {result.listing.price && (
            <div className="lux-eyebrow mt-2" style={{ color: "var(--lux-ash)", fontSize: "0.65rem" }}>
              {result.listing.price}
              {result.listing.beds ? ` · ${result.listing.beds} BED` : ""}
              {result.listing.baths ? ` · ${result.listing.baths} BATH` : ""}
            </div>
          )}

          {/* 1 — Property Lock report */}
          <button
            onClick={() => setShowReport((s) => !s)}
            className="w-full text-left mt-8"
            style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)", padding: "14px 16px", cursor: "pointer" }}
          >
            <div className="flex items-center justify-between">
              <span className="lux-eyebrow" style={{ color: "var(--lux-rust)", fontSize: "0.62rem" }}>
                ◆ PROPERTY LOCK REPORT — {result.featuresVerified}/{result.featuresTotal} VERIFIED
              </span>
              <span style={{ color: "var(--lux-ash)" }}>{showReport ? "−" : "+"}</span>
            </div>
          </button>
          {showReport && (
            <div style={{ border: "1px solid var(--lux-hairline)", borderTop: "none", padding: "16px", background: "var(--lux-bone)" }}>
              {result.shotPlan.map((s, i) => (
                <div key={i} className="flex items-center justify-between" style={{ padding: "7px 0", borderBottom: "1px solid var(--lux-hairline)" }}>
                  <span style={{ ...Mono, fontSize: "0.72rem", color: "var(--lux-ink)" }}>
                    {String(i + 1).padStart(2, "0")} · {s.label}
                  </span>
                  <span style={{ ...Mono, fontSize: "0.68rem", color: "#2E6E42" }}>✓ verified</span>
                </div>
              ))}
              <p className="lux-prose mt-3" style={{ fontSize: "0.78rem", color: "var(--lux-ash)" }}>
                No features were invented and no rooms were added. Every frame derives from the photos you supplied.
                {result.qa?.verdict === "review" && ` Note: ${result.qa.summary}`}
              </p>
            </div>
          )}

          {/* 2 — format packaging */}
          <div className="lux-eyebrow mt-8 mb-3" style={{ color: "var(--lux-ash)", fontSize: "0.58rem" }}>FORMAT</div>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <Tag key={f.id} active={format === f.id} onClick={() => setFormat(f.id)}>
                {f.label} <span style={{ opacity: 0.6, marginLeft: 6, fontSize: "0.66rem" }}>{f.note}</span>
              </Tag>
            ))}
          </div>

          {/* 3 — brand application */}
          <Card className="mt-7" style={{ padding: 18 }}>
            {kit?.full_name ? (
              <div className="lux-prose" style={{ fontSize: "0.85rem" }}>
                Branded for <b>{kit.full_name}</b>{kit.brokerage ? ` · ${kit.brokerage}` : ""} — applied to every reel.
                <button onClick={onBrand} className="lux-eyebrow ml-2" style={{ color: "var(--lux-rust)", fontSize: "0.58rem", cursor: "pointer", background: "none", border: "none" }}>EDIT →</button>
              </div>
            ) : (
              <div className="lux-prose" style={{ fontSize: "0.85rem" }}>
                Add your brand in 60 seconds — it applies to every reel you make.
                <button onClick={onBrand} className="lux-eyebrow ml-2" style={{ color: "var(--lux-rust)", fontSize: "0.58rem", cursor: "pointer", background: "none", border: "none" }}>ADD BRAND →</button>
              </div>
            )}
          </Card>

          <Pill variant="rust" onClick={download} className="mt-7" style={{ width: "100%", justifyContent: "center", padding: "19px 28px", fontSize: "0.95rem" }}>
            Download &amp; post →
          </Pill>
          <div className="flex gap-5 mt-5">
            <Link to="/gallery" className="lux-eyebrow" style={{ color: "var(--lux-ink)", fontSize: "0.58rem" }}>MY GALLERY →</Link>
            <button onClick={onRestart} className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.58rem", background: "none", border: "none", cursor: "pointer" }}>
              BUILD ANOTHER →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── SCREEN 4 · BRAND KIT ─────────────────────── */

function BrandScreen({ onDone }: { onDone: () => void }) {
  const { kit, save, saving, uploadAsset } = useBrandKit();
  const [form, setForm] = useState<BrandKit>(EMPTY_KIT);
  useEffect(() => { if (kit) setForm(kit); }, [kit]);

  const set = (k: keyof BrandKit, v: string | null) => setForm((f) => ({ ...f, [k]: v } as BrandKit));

  const pick = async (kind: "logo" | "headshot", file?: File | null) => {
    if (!file) return;
    const url = await uploadAsset(file, kind);
    if (url) set(kind === "logo" ? "logo_url" : "headshot_url", url);
    else toast.error("Upload failed — try a smaller image.");
  };

  const fields: { k: keyof BrandKit; label: string; ph: string }[] = [
    { k: "full_name", label: "Name", ph: "Levi Sumbela" },
    { k: "brokerage", label: "Brokerage", ph: "The Vantage Realty" },
    { k: "phone", label: "Phone", ph: "(555) 010-2233" },
    { k: "email", label: "Email", ph: "you@brokerage.com" },
    { k: "website", label: "Website", ph: "yoursite.com" },
  ];

  return (
    <div className="lux-container" style={{ paddingTop: 46, paddingBottom: 110, maxWidth: 920 }}>
      <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-rust)" }}>BRAND KIT · ONE TIME</div>
      <h1 className="lux-display" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1 }}>
        Your brand, on every reel <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>from now on.</span>
      </h1>

      <div className="grid lg:grid-cols-12 gap-10 mt-10">
        <div className="lg:col-span-7">
          {fields.map((f) => (
            <div key={f.k} className="mb-4">
              <label className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.55rem" }}>{f.label}</label>
              <input
                value={(form[f.k] as string) || ""}
                onChange={(e) => set(f.k, e.target.value)}
                placeholder={f.ph}
                className="w-full mt-1.5"
                style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)", padding: "13px 14px", fontFamily: "Inter, sans-serif", color: "var(--lux-ink)", outline: "none" }}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4 mt-5">
            {(["logo", "headshot"] as const).map((kind) => (
              <div key={kind}>
                <label className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.55rem" }}>{kind}</label>
                <input type="file" accept="image/*" className="w-full mt-1.5" style={{ fontSize: "0.75rem" }}
                  onChange={(e) => pick(kind, e.target.files?.[0])} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div>
              <label className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.55rem" }}>Primary colour</label>
              <input type="color" value={form.color_primary} onChange={(e) => set("color_primary", e.target.value)}
                className="w-full mt-1.5" style={{ height: 44, border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-cream)" }} />
            </div>
            <div>
              <label className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.55rem" }}>Secondary colour</label>
              <input type="color" value={form.color_secondary} onChange={(e) => set("color_secondary", e.target.value)}
                className="w-full mt-1.5" style={{ height: 44, border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-cream)" }} />
            </div>
          </div>

          <button
            onClick={async () => {
              const ok = await save(form);
              toast[ok ? "success" : "error"](ok ? "Brand Kit saved — it's on every reel now." : "Could not save. Apply the brand_kits migration?");
              if (ok) onDone();
            }}
            disabled={saving}
            className="lux-btn mt-8"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "18px 30px", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "SAVING…" : "SAVE BRAND KIT →"}
          </button>
        </div>

        {/* Live end card */}
        <div className="lg:col-span-5">
          <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-ash)", fontSize: "0.55rem" }}>LIVE END CARD</div>
          <div style={{ aspectRatio: "9/16", background: form.color_secondary, border: "1px solid var(--lux-hairline-strong)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 26, textAlign: "center" }}>
            {form.headshot_url && (
              <img src={form.headshot_url} alt="" style={{ width: 74, height: 74, borderRadius: 999, objectFit: "cover", marginBottom: 16, border: `2px solid ${form.color_primary}` }} />
            )}
            {form.logo_url && <img src={form.logo_url} alt="" style={{ maxWidth: 130, marginBottom: 14 }} />}
            <div className="lux-display" style={{ color: "#F4EFE6", fontSize: "1.5rem", lineHeight: 1.1 }}>
              {form.full_name || "Your Name"}
            </div>
            <div className="lux-eyebrow mt-2" style={{ color: form.color_primary, fontSize: "0.58rem" }}>
              {form.brokerage || "YOUR BROKERAGE"}
            </div>
            <div style={{ width: 40, height: 1, background: "rgba(244,239,230,.35)", margin: "14px 0" }} />
            <div style={{ ...Mono, color: "rgba(244,239,230,.8)", fontSize: "0.7rem", lineHeight: 1.9 }}>
              {form.phone || "(555) 000-0000"}<br />
              {form.website || "yoursite.com"}
            </div>
          </div>
          <button onClick={onDone} className="lux-eyebrow mt-4" style={{ color: "var(--lux-ash)", fontSize: "0.58rem", background: "none", border: "none", cursor: "pointer" }}>
            SKIP FOR NOW →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── the flow ─────────────────────────── */

export default function Create() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { credits } = useCredits();
  const { kit } = useBrandKit();
  const { log, shots, running, run, reset } = useListingPipeline();
  const [screen, setScreen] = useState<Screen>("input");
  const [result, setResult] = useState<PipelineResult | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth?returnUrl=%2Fcreate&next=/create"); }, [loading, user, navigate]);

  const start = useCallback(async (input: { url?: string; files?: File[] }) => {
    if (credits !== null && credits < 50) {
      toast.error("You need 50 credits for a reel. Top up to continue.");
      navigate("/pricing");
      return;
    }
    setScreen("processing");
    const res = await run(input);
    if (res) { setResult(res); setScreen("review"); }
  }, [credits, navigate, run]);

  return (
    <>
      <Helmet>
        <title>Create · Give us the listing. We make the content. — The Vantage</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Shell>
        {screen === "input" && <InputScreen onStart={start} />}
        {screen === "processing" && <ProcessingScreen log={log} shots={shots} />}
        {screen === "review" && result && (
          <ReviewScreen
            result={result}
            kit={kit}
            onBrand={() => setScreen("brand")}
            onRestart={() => { reset(); setResult(null); setScreen("input"); }}
          />
        )}
        {screen === "brand" && <BrandScreen onDone={() => setScreen(result ? "review" : "input")} />}
        {screen === "processing" && !running && log.some((l) => l.kind === "warn") && (
          <div className="lux-container" style={{ paddingBottom: 80 }}>
            <button onClick={() => { reset(); setScreen("input"); }} className="lux-btn" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}>
              ← START OVER
            </button>
          </div>
        )}
      </Shell>
    </>
  );
}
