import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import ConnectClaudePanel from "@/components/lux/ConnectClaudePanel";

/**
 * /connect — the Connect-to-Claude page. Signed-in agents mint a connector
 * token and follow the 3-step setup. Signed-out visitors are nudged to sign in.
 */
export default function ConnectClaude() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/connect");
  }, [loading, user, navigate]);

  return (
    <div style={{ background: "var(--lux-bone)", minHeight: "100vh" }}>
      <Helmet>
        <title>Connect The Vantage to Claude · Make Real Estate Reels From a Chat</title>
        <meta
          name="description"
          content="Connect The Vantage to Claude and make listing reels by chatting. Paste a Zillow or Airbnb link, get a cinematic captioned reel back in minutes — no dashboard, no editing."
        />
        <meta name="keywords" content="connect vantage to claude, ai assistant real estate video, make real estate videos in claude, mcp real estate video, listing reel from chat" />
        <link rel="canonical" href="https://thevantage.media/connect" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://thevantage.media/connect" />
        <meta property="og:title" content="Connect The Vantage to Claude · Make Reels From a Chat" />
        <meta property="og:description" content="Paste a Zillow or Airbnb link into Claude and get a finished, captioned listing reel back in minutes. No dashboard, no editing." />
        <meta property="og:image" content="https://thevantage.media/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Connect The Vantage to Claude" />
        <meta name="twitter:description" content="Make listing reels by chatting — paste a link, get a reel." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://thevantage.media/" },
            { "@type": "ListItem", position: 2, name: "Connect to Claude", item: "https://thevantage.media/connect" },
          ],
        })}</script>
      </Helmet>
      <LuxuryHeader />
      <main className="mx-auto px-5 sm:px-8" style={{ maxWidth: 820, paddingTop: 48, paddingBottom: 80 }}>
        <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>
          <Link to="/dashboard" style={{ color: "var(--lux-ash)" }}>← DASHBOARD</Link>
        </div>
        <ConnectClaudePanel />
      </main>
      <LuxuryFooter />
    </div>
  );
}
