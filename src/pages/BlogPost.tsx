import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import PreviewVideo from "@/components/lux/PreviewVideo";
import { BLOG_POSTS, getPostBySlug, type BlogPost } from "@/lib/blog-posts";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : null;

  if (!post) {
    return (
      <>
        <Helmet>
          <title>Post not found — The Vantage</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen lux-bg-bone">
          <LuxuryHeader variant="bone" />
          <main className="lux-container py-32 pt-40 text-center">
            <h1 className="lux-display" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
              Post not found.
            </h1>
            <Link to="/blog" className="lux-btn mt-8 inline-block">
              ← BACK TO THE JOURNAL
            </Link>
          </main>
          <LuxuryFooter />
        </div>
      </>
    );
  }

  const url = `https://thevantage.media/blog/${post.slug}`;
  const ogImage = `https://thevantage.media${post.cover}`;
  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <Helmet>
        <title>{`${post.title} — The Vantage`}</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.keywords.join(", ")} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={ogImage} />

        {/* Article schema for rich result eligibility */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          image: [ogImage],
          datePublished: post.publishedAt,
          dateModified: post.publishedAt,
          author: { "@type": "Organization", name: "The Vantage Media", url: "https://thevantage.media" },
          publisher: {
            "@type": "Organization",
            name: "The Vantage Media",
            url: "https://thevantage.media",
            logo: { "@type": "ImageObject", url: "https://thevantage.media/icons/icon-512.png" },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          keywords: post.keywords.join(", "),
        })}</script>
      </Helmet>

      <div className="min-h-screen lux-bg-bone lux-grain">
        <LuxuryHeader variant="bone" />
        <main id="main-content" className="pt-28 md:pt-32">
          {/* Hero */}
          <article>
            <header className="lux-container max-w-4xl mx-auto pt-12 pb-10 text-center">
              <div className="lux-eyebrow mb-5" style={{ color: "var(--lux-rust)", fontSize: "0.65rem", letterSpacing: "0.22em", fontWeight: 700 }}>
                {post.category} · {post.readTime} MIN READ
              </div>
              <h1
                className="lux-display"
                style={{
                  fontSize: "clamp(2.2rem, 5.5vw, 4.2rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.022em",
                  color: "var(--lux-ink)",
                }}
              >
                {post.title}
              </h1>
              <p
                className="lux-prose mt-6 mx-auto"
                style={{ maxWidth: 640, fontSize: "1.05rem", color: "var(--lux-ink)", opacity: 0.85 }}
              >
                {post.description}
              </p>
              <div
                className="lux-eyebrow mt-8"
                style={{ color: "var(--lux-ink)", opacity: 0.6, fontSize: "0.6rem", letterSpacing: "0.2em" }}
              >
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </header>

            {/* Hero media */}
            <div className="lux-container max-w-5xl mx-auto mb-12">
              {post.coverVideo ? (
                <PreviewVideo
                  src={post.coverVideo}
                  poster={post.cover}
                  alt={post.title}
                  containerClassName="w-full lux-bg-ink"
                  containerStyle={{ aspectRatio: "16/9", border: "1px solid var(--lux-hairline-strong)", boxShadow: "0 28px 60px -32px rgba(14,14,12,0.45)" }}
                />
              ) : (
                <div
                  className="w-full lux-bg-ink"
                  style={{
                    aspectRatio: "16/9",
                    background: `url(${post.cover}) center/cover`,
                    border: "1px solid var(--lux-hairline-strong)",
                    boxShadow: "0 28px 60px -32px rgba(14,14,12,0.45)",
                  }}
                />
              )}
            </div>

            {/* Body */}
            <div className="lux-container max-w-3xl mx-auto pb-20">
              {post.sections.map((s, i) => {
                if (s.type === "lede") {
                  return (
                    <p
                      key={i}
                      className="lux-prose mb-10"
                      style={{
                        fontSize: "1.25rem",
                        lineHeight: 1.55,
                        color: "var(--lux-ink)",
                        fontStyle: "italic",
                      }}
                    >
                      {s.text}
                    </p>
                  );
                }
                if (s.type === "h2") {
                  return (
                    <h2
                      key={i}
                      className="lux-display mt-12 mb-5"
                      style={{
                        fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.015em",
                        color: "var(--lux-ink)",
                      }}
                    >
                      {s.text}
                    </h2>
                  );
                }
                if (s.type === "p") {
                  return (
                    <p
                      key={i}
                      className="lux-prose mb-6"
                      style={{ fontSize: "1.05rem", lineHeight: 1.7, color: "var(--lux-ink)" }}
                    >
                      {s.text}
                    </p>
                  );
                }
                if (s.type === "ul") {
                  return (
                    <ul key={i} className="mb-8 space-y-3 lux-prose" style={{ paddingLeft: 0 }}>
                      {s.items.map((it, j) => (
                        <li
                          key={j}
                          className="flex gap-3 items-start"
                          style={{ fontSize: "1.02rem", lineHeight: 1.65, color: "var(--lux-ink)" }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              marginTop: 12,
                              width: 6,
                              height: 6,
                              borderRadius: 9999,
                              background: "var(--lux-rust)",
                            }}
                          />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (s.type === "ol") {
                  return (
                    <ol key={i} className="mb-8 space-y-4 lux-prose" style={{ paddingLeft: 0, counterReset: "step" }}>
                      {s.items.map((it, j) => (
                        <li
                          key={j}
                          className="flex gap-4 items-start"
                          style={{ fontSize: "1.02rem", lineHeight: 1.65, color: "var(--lux-ink)" }}
                        >
                          <span
                            className="lux-display"
                            style={{
                              flexShrink: 0,
                              fontStyle: "italic",
                              color: "var(--lux-rust)",
                              fontSize: "1.4rem",
                              lineHeight: 1,
                              minWidth: 28,
                            }}
                          >
                            {String(j + 1).padStart(2, "0")}.
                          </span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ol>
                  );
                }
                if (s.type === "quote") {
                  return (
                    <blockquote
                      key={i}
                      className="lux-display-italic my-10 pl-6"
                      style={{
                        fontSize: "1.55rem",
                        lineHeight: 1.4,
                        color: "var(--lux-ink)",
                        borderLeft: "2px solid var(--lux-rust)",
                      }}
                    >
                      “{s.text}”
                      {s.attribution && (
                        <footer
                          className="lux-eyebrow mt-3"
                          style={{ color: "var(--lux-ash)", fontSize: "0.65rem", letterSpacing: "0.2em", fontStyle: "normal" }}
                        >
                          — {s.attribution}
                        </footer>
                      )}
                    </blockquote>
                  );
                }
                if (s.type === "cta") {
                  return (
                    <div
                      key={i}
                      className="my-10 p-6 lg:p-8 text-center"
                      style={{
                        background: "var(--lux-cream)",
                        border: "1px solid var(--lux-hairline-strong)",
                      }}
                    >
                      {s.subhead && (
                        <p
                          className="lux-prose mb-4"
                          style={{ fontSize: "0.95rem", color: "var(--lux-ink)", opacity: 0.8 }}
                        >
                          {s.subhead}
                        </p>
                      )}
                      <Link to={s.href} className="lux-btn">
                        {s.label} →
                      </Link>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Related posts */}
            <section className="lux-container max-w-5xl mx-auto pb-20" style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: 48 }}>
              <div
                className="lux-eyebrow mb-8"
                style={{ color: "var(--lux-brass)", fontSize: "0.7rem", letterSpacing: "0.22em", fontWeight: 700 }}
              >
                CONTINUE READING
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {otherPosts.map((p: BlogPost) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group block lux-bg-bone overflow-hidden"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  >
                    <div
                      className="relative overflow-hidden"
                      style={{
                        aspectRatio: "16/10",
                        background: `url(${p.cover}) center/cover`,
                      }}
                    />
                    <div className="p-5">
                      <div
                        className="lux-eyebrow mb-2"
                        style={{ color: "var(--lux-rust)", fontSize: "0.55rem", letterSpacing: "0.2em", fontWeight: 700 }}
                      >
                        {p.category}
                      </div>
                      <h3
                        className="lux-display"
                        style={{ fontSize: "1.05rem", lineHeight: 1.2, color: "var(--lux-ink)" }}
                      >
                        {p.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </article>
        </main>
        <LuxuryFooter />
      </div>
    </>
  );
};

export default BlogPostPage;
