import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import PreviewVideo from "@/components/lux/PreviewVideo";
import { useSmartCTA } from "@/hooks/useSmartCTA";

/**
 * RedditLanding — /reddit
 *
 * Lands traffic from Reddit posts (r/SideProject, r/aivideo, r/Entrepreneur,
 * r/realtors with disclosure). Voice must match the platform or it gets
 * downvoted to dust:
 *   - First person ("I built this because…")
 *   - Self-deprecating
 *   - Technical transparency (which models, which fps, which prompt pattern)
 *   - No "revolutionary AI", no "unlock", no "transform your workflow"
 *   - Dense info, FAQ-heavy
 *   - "Try it, judge for yourself" tone
 *
 * Conversion levers:
 *   - 60 free credits (the trial = the proof)
 *   - Show the actual model + prompt pattern (Redditors are skeptical)
 *   - Real customer reel inline
 *   - Pricing transparency
 *   - Direct link to the GitHub-style writeup if asked (placeholder)
 */
const RedditLanding = () => {
  const { destination, isLoggedIn } = useSmartCTA("agent");

  return (
    <>
      <Helmet>
        <title>I built an AI tool that turns one listing photo into a vertical reel — The Vantage</title>
        <meta
          name="description"
          content="One photo in, one cinematic 1080p vertical MP4 out. Built on Seedance 2.0 + Kling 2.5 Turbo Pro. 60 free credits — your first reel is free. Technical writeup inside."
        />
        <link rel="canonical" href="https://thevantage.media/reddit" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* ═══════════ THE WRITEUP-STYLE HERO ═══════════ */}
          <section className="lux-section">
            <div className="lux-container max-w-3xl">
              <div
                className="lux-eyebrow mb-6"
                style={{ color: "var(--lux-rust)" }}
              >
                FROM THE POST · MAY 13, 2026
              </div>

              <h1
                className="lux-display mb-8"
                style={{
                  fontSize: "clamp(2.2rem, 5vw, 4.2rem)",
                  lineHeight: 1.05,
                }}
              >
                I A/B tested AI video prompts for real estate and the{" "}
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-rust)" }}
                >
                  "best practice" was completely wrong.
                </span>
              </h1>

              <p
                className="lux-prose mb-6"
                style={{ fontSize: "1.05rem", lineHeight: 1.7 }}
              >
                Spent the last month building a tool that turns listing
                photos into cinematic real estate reels. Hit a wall I didn't
                expect: detailed cinematography prompts (~150 words — lens
                choice, Kelvin temp, named materials, atmospheric vocab,
                anti-AI caps) consistently produced glitchy output with
                random frame-pauses mid-shot.
              </p>

              <p
                className="lux-prose mb-6"
                style={{ fontSize: "1.05rem", lineHeight: 1.7 }}
              >
                So I tried the opposite. Six-word prompts:
              </p>

              <pre
                className="lux-prose mb-6 p-5 overflow-x-auto"
                style={{
                  background: "var(--lux-cream)",
                  border: "1px solid var(--lux-hairline-strong)",
                  fontFamily: "'Space Mono', ui-monospace, monospace",
                  fontSize: "0.85rem",
                  lineHeight: 1.7,
                  color: "var(--lux-ink)",
                }}
              >
{`slow camera roll of still house              → clean cinematic roll
slow camera pedestal on still house          → buttery vertical rise
slow camera dolly towards still house        → magazine push-in`}
              </pre>

              <p
                className="lux-prose mb-6"
                style={{ fontSize: "1.05rem", lineHeight: 1.7 }}
              >
                Every minimal prompt produced dramatically cleaner output
                than the rich one on the same source image. ByteDance's own
                Seedance docs actually call this out:{" "}
                <em>
                  "Simple and direct — the model will expand the prompt word
                  according to our expression."
                </em>{" "}
                The auto-expansion is the magic. Over-prompting fights it.
              </p>

              <p
                className="lux-prose mb-10"
                style={{ fontSize: "1.05rem", lineHeight: 1.7 }}
              >
                I shipped this finding into a product. It's free to try with
                60 credits (one full reel). Open-source-style writeup
                continues below if you want the technical details. If you
                just want to see the output, here it is:
              </p>

              {/* Real output reel */}
              <div
                className="relative w-full mb-10 overflow-hidden"
                style={{
                  aspectRatio: "9/16",
                  maxWidth: 380,
                  margin: "0 auto",
                  background: "var(--lux-ink)",
                  border: "1px solid var(--lux-hairline-strong)",
                }}
              >
                <PreviewVideo
                  src="/vantage/done-for-you/result.mp4"
                  poster="/vantage/listing-bundle/1.webp"
                  alt="Real output reel from The Vantage"
                  containerClassName="absolute inset-0 w-full h-full"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={destination}
                  className="lux-btn"
                  style={{
                    background: "var(--lux-ink)",
                    color: "var(--lux-bone)",
                    padding: "18px 28px",
                    fontSize: "0.8rem",
                  }}
                >
                  {isLoggedIn ? "OPEN STUDIO →" : "TRY IT FREE · 60 CREDITS →"}
                </Link>
                <span
                  className="lux-eyebrow"
                  style={{ color: "var(--lux-ash)", fontSize: "0.7rem" }}
                >
                  NO CARD · NO MAILING LIST · CANCEL ANYTIME
                </span>
              </div>
            </div>
          </section>

          {/* ═══════════ TECHNICAL STACK — REDDIT LOVES THIS ═══════════ */}
          <section
            className="lux-section"
            style={{ background: "var(--lux-cream)" }}
          >
            <div className="lux-container max-w-3xl">
              <div
                className="lux-eyebrow mb-4"
                style={{ color: "var(--lux-rust)" }}
              >
                THE STACK · NO SECRETS
              </div>
              <h2
                className="lux-display mb-8"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                }}
              >
                What's actually running.
              </h2>

              <ul
                className="lux-prose space-y-4"
                style={{ fontSize: "1rem", lineHeight: 1.7 }}
              >
                <li>
                  <strong>Video model:</strong>{" "}
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem" }}>
                    bytedance/seedance-1-pro
                  </code>{" "}
                  at 1080p, fps:24, aspect_ratio:9:16. We force fps:24 for the
                  "shot on film" cadence — fps:30 reads as soap-opera.
                </li>
                <li>
                  <strong>Image edit model:</strong>{" "}
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem" }}>
                    openai/gpt-image-2
                  </code>{" "}
                  with{" "}
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem" }}>
                    output_format: "jpeg"
                  </code>
                  . (Yes, "jpg" was breaking last week.)
                </li>
                <li>
                  <strong>Start-frame to end-frame transitions:</strong>{" "}
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem" }}>
                    kwaivgi/kling-v2.5-turbo-pro
                  </code>{" "}
                  with{" "}
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem" }}>
                    cfg_scale: 0.7
                  </code>{" "}
                  for tighter prompt adherence.
                </li>
                <li>
                  <strong>Stitch:</strong> ffmpeg.wasm v0.12 with the
                  TS-intermediate concat technique{" "}
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem" }}>
                    (h264_mp4toannexb → concat protocol → mp4 remux)
                  </code>
                  . Lossless. No re-encode. Runs entirely in the browser via
                  SharedArrayBuffer.
                </li>
                <li>
                  <strong>Infra:</strong> Supabase (auth, storage, edge
                  functions), Vercel (hosting), Replicate (model inference),
                  Stripe (subscriptions, $30/$39/$79/$149 tiers).
                </li>
              </ul>

              <p
                className="lux-prose mt-8"
                style={{
                  fontSize: "0.95rem",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                  color: "var(--lux-ash)",
                }}
              >
                If you want to see a specific edge function or prompt, ping
                me in the thread. Most of the prompt grammar is open in
                comments inside the code.
              </p>
            </div>
          </section>

          {/* ═══════════ THE FAQ — REDDITORS LIVE IN COMMENTS ═══════════ */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container max-w-3xl">
              <div
                className="lux-eyebrow mb-4"
                style={{ color: "var(--lux-rust)" }}
              >
                ANTICIPATED OBJECTIONS · ANSWERED
              </div>
              <h2
                className="lux-display mb-10"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                }}
              >
                Stuff you'd ask{" "}
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-rust)" }}
                >
                  in the comments.
                </span>
              </h2>

              <div className="space-y-8">
                {[
                  {
                    q: "Is this just another wrapper around Sora / Runway?",
                    a: "No Sora, no Runway. We use bytedance/seedance-1-pro (still photo → video) and kwaivgi/kling-v2.5-turbo-pro (start frame → end frame). Both via Replicate. The proprietary bit isn't the model — it's the prompt grammar tuned for real-estate motion, and the stitch pipeline that preserves source quality lossless via ffmpeg.wasm.",
                  },
                  {
                    q: "Why not just use ChatGPT's Sora?",
                    a: "Sora is great. It's also $20/mo on top of ChatGPT Plus, doesn't burn the address into the frame, and doesn't auto-stitch six clips. The Vantage is purpose-built for the listing-reel workflow, not general video.",
                  },
                  {
                    q: "60 free credits is one full reel — what's the catch?",
                    a: "No catch. 60 credits = one Done-For-You Reel OR two Animate Single videos OR one Virtual Staging. If you like it, the lowest paid tier is $30/mo for 300 credits. If you don't, you don't pay. The free tier costs us ~$1.50 per signup in Replicate fees and we're fine with that.",
                  },
                  {
                    q: "What if my photo is bad?",
                    a: "Bad photo in, bad film out. Seedance is faithful to the source — if the input is dim/blurry/poorly composed, the output will be too. We don't auto-enhance because every enhancer I tested produced worse results than the source. Use your sharpest, brightest, best-composed listing shot.",
                  },
                  {
                    q: "Can I see the actual prompt that gets sent to Seedance?",
                    a: "Yes. For a slow push-in shot, we send literally: " +
                      "\"slow camera dolly as if cameraman stepping towards still house\". " +
                      "That's the whole prompt. No vibes, no lighting talk, no materials. A/B testing showed simple prompts beat rich ones every time.",
                  },
                  {
                    q: "Is the output watermarked?",
                    a: "Free tier and $30 STARTER: subtle bone-paper watermark in the bottom-right corner. $39 BUILDER and above: removed. The watermark is small and on-brand, not Wish.com-style.",
                  },
                  {
                    q: "Where does the output live?",
                    a: "Each generation gets a row in Supabase + the MP4 lives in Supabase storage permanently. Your gallery shows every video you've made. We don't delete generations even if your subscription lapses — they're yours.",
                  },
                  {
                    q: "Is this a regulated industry — do I need NMLS / a license?",
                    a: "You're generating marketing content from your own listing photos. No license required for that. If you're using AI-generated imagery to misrepresent the property (interior staging that doesn't exist, etc.), check your state's real-estate code — some require disclosure. We don't fake the listing itself, only the camera move.",
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="pb-6 border-b" style={{ borderColor: "var(--lux-hairline)" }}>
                    <h3
                      className="lux-display mb-3"
                      style={{ fontSize: "1.3rem", lineHeight: 1.2 }}
                    >
                      {q}
                    </h3>
                    <p
                      className="lux-prose"
                      style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
                    >
                      {a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════ FINAL CTA ═══════════ */}
          <section
            className="lux-section"
            style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}
          >
            <div className="lux-container max-w-3xl text-center py-12">
              <div
                className="lux-eyebrow mb-6"
                style={{ color: "var(--lux-champagne)" }}
              >
                THAT'S THE PITCH · GO MAKE ONE
              </div>
              <h2
                className="lux-display"
                style={{
                  fontSize: "clamp(2.2rem, 5vw, 4rem)",
                  lineHeight: 1,
                  color: "var(--lux-bone)",
                }}
              >
                Try it,{" "}
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-champagne)" }}
                >
                  judge for yourself.
                </span>
              </h2>
              <div className="mt-10">
                <Link
                  to={destination}
                  className="lux-btn lux-btn-bone"
                  style={{ padding: "18px 32px", fontSize: "0.8rem" }}
                >
                  {isLoggedIn ? "OPEN STUDIO →" : "GENERATE ONE FREE →"}
                </Link>
              </div>
              <div
                className="lux-eyebrow mt-6"
                style={{
                  color: "var(--lux-champagne)",
                  fontSize: "0.7rem",
                }}
              >
                60 CREDITS · NO CARD · NO MAILING LIST
              </div>
            </div>
          </section>

          {/* Sticky Bottom CTA */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 lux-bg-ink"
            style={{
              borderTop: "1px solid var(--lux-hairline-strong)",
              color: "var(--lux-bone)",
            }}
          >
            <div className="lux-container flex items-center justify-between gap-4 py-4">
              <span
                className="lux-eyebrow hidden sm:inline"
                style={{ color: "var(--lux-champagne)" }}
              >
                60 free credits · No card · No mailing list
              </span>
              <Link
                to={destination}
                className="lux-btn lux-btn-bone"
                style={{ padding: "12px 22px", fontSize: "0.7rem" }}
              >
                {isLoggedIn ? "ENTER STUDIO →" : "TRY ONE →"}
              </Link>
            </div>
          </div>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default RedditLanding;
