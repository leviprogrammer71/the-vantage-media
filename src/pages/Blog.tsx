import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";
import { BLOG_POSTS } from "@/lib/blog-posts";

const Blog = () => {
  return (
    <>
      <Helmet>
        <title>Blog · AI Real Estate Video Workflow & Listing Reel Guides — The Vantage</title>
        <meta
          name="description"
          content="Long-form guides on AI listing videos, virtual staging, real estate cinematography, music selection, and the workflows luxury studios are shipping with in 2026."
        />
        <link rel="canonical" href="https://thevantage.media/blog" />
        <meta property="og:title" content="The Vantage Blog · AI Listing Video Workflow Guides" />
        <meta property="og:description" content="Working playbooks for AI listing videos, virtual staging, music, and real estate cinematography." />
        <meta property="og:url" content="https://thevantage.media/blog" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "The Vantage Blog",
          url: "https://thevantage.media/blog",
          description: "AI real estate video workflow + listing reel guides.",
          publisher: { "@type": "Organization", name: "The Vantage Media", url: "https://thevantage.media" },
          blogPost: BLOG_POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            datePublished: p.publishedAt,
            url: `https://thevantage.media/blog/${p.slug}`,
            keywords: p.keywords.join(", "),
            image: `https://thevantage.media${p.cover}`,
          })),
        })}</script>
      </Helmet>

      <div className="min-h-screen lux-bg-bone lux-grain">
        <LuxuryHeader variant="bone" />
        <main id="main-content" className="lux-container py-16 pt-32 md:pt-40">
          <SectionHeading
            eyebrow="THE FIELD NOTES · AI VIDEO + LISTING WORKFLOW"
            title="The studio journal."
            italic="Working playbooks."
            lede="Long-form guides on AI listing videos, virtual staging, real estate cinematography, music selection, and the workflows luxury studios are shipping with in 2026. Updated weekly."
            align="center"
            className="mb-16"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {BLOG_POSTS.map((post, i) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group lux-bg-bone overflow-hidden flex flex-col transition-all"
                style={{
                  border: "1px solid var(--lux-hairline-strong)",
                  boxShadow: i === 0 ? "0 24px 48px -28px rgba(140,63,46,0.25)" : "0 16px 32px -24px rgba(14,14,12,0.18)",
                }}
              >
                <div
                  className="relative w-full overflow-hidden lux-bg-ink"
                  style={{ aspectRatio: "16/10" }}
                >
                  <img
                    src={post.cover}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(to top, rgba(14,14,12,0.55) 0%, rgba(14,14,12,0) 50%)",
                    }}
                  />
                  <span
                    className="lux-eyebrow absolute top-4 left-4 px-2.5 py-1.5"
                    style={{
                      background: "var(--lux-bone)",
                      color: "var(--lux-rust)",
                      fontSize: "0.55rem",
                      letterSpacing: "0.2em",
                      fontWeight: 700,
                    }}
                  >
                    {post.category}
                  </span>
                </div>
                <div className="p-6 lg:p-7 flex-1 flex flex-col">
                  <h2
                    className="lux-display mb-3"
                    style={{
                      fontSize: "1.45rem",
                      lineHeight: 1.15,
                      letterSpacing: "-0.015em",
                      color: "var(--lux-ink)",
                    }}
                  >
                    {post.title}
                  </h2>
                  <p
                    className="lux-prose flex-1"
                    style={{ fontSize: "0.92rem", lineHeight: 1.55, color: "var(--lux-ink)", opacity: 0.85 }}
                  >
                    {post.description}
                  </p>
                  <div
                    className="mt-5 pt-4 flex items-center justify-between"
                    style={{ borderTop: "1px solid var(--lux-hairline)" }}
                  >
                    <span
                      className="lux-eyebrow"
                      style={{ color: "var(--lux-ink)", opacity: 0.65, fontSize: "0.6rem", letterSpacing: "0.18em", fontWeight: 600 }}
                    >
                      {post.readTime} MIN READ
                    </span>
                    <span
                      className="lux-eyebrow inline-flex items-center gap-2 transition-transform group-hover:translate-x-1"
                      style={{ color: "var(--lux-rust)", fontSize: "0.65rem", letterSpacing: "0.22em", fontWeight: 700 }}
                    >
                      READ →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
        <LuxuryFooter />
      </div>
    </>
  );
};

export default Blog;
