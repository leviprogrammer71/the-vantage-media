import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";

// Columns fetched from the blog_posts table (CMS-authored posts).
const SELECT =
  "slug,title,description,category,cover,cover_video,read_time,keywords,sections,published_at";

interface DbRow {
  slug: string;
  title: string;
  description: string;
  category: string | null;
  cover: string | null;
  cover_video: string | null;
  read_time: number | null;
  keywords: string[] | null;
  sections: BlogPost["sections"] | null;
  published_at: string | null;
}

function rowToPost(r: DbRow): BlogPost {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description || "",
    publishedAt: r.published_at || new Date().toISOString().slice(0, 10),
    readTime: r.read_time || 5,
    cover: r.cover || "/hero-still.jpg",
    coverVideo: r.cover_video || undefined,
    category: r.category || "JOURNAL",
    sections: Array.isArray(r.sections) ? r.sections : [],
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
  };
}

/** All posts: CMS (DB) posts merged with the built-in static posts, newest first. */
export function useBlogPosts(): { posts: BlogPost[]; loading: boolean } {
  const [posts, setPosts] = useState<BlogPost[]>(BLOG_POSTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("blog_posts")
          .select(SELECT)
          .eq("published", true)
          .order("published_at", { ascending: false });
        const db = ((data as DbRow[] | null) ?? []).map(rowToPost);
        // DB wins on slug clash; then sort by date desc.
        const bySlug = new Map<string, BlogPost>();
        for (const p of BLOG_POSTS) bySlug.set(p.slug, p);
        for (const p of db) bySlug.set(p.slug, p);
        const merged = Array.from(bySlug.values()).sort((a, b) =>
          a.publishedAt < b.publishedAt ? 1 : -1,
        );
        if (active) setPosts(merged);
      } catch {
        /* keep static posts on failure */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { posts, loading };
}

/** Whether the current user has the admin role (gates the CMS). */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
      if (active) setIsAdmin(data === true);
    })();
    return () => {
      active = false;
    };
  }, []);
  return isAdmin;
}

/** A single post by slug — static first (instant + SEO), else the DB. */
export function useBlogPost(slug: string | undefined): { post: BlogPost | null; loading: boolean } {
  const staticPost = slug ? BLOG_POSTS.find((p) => p.slug === slug) : undefined;
  const [post, setPost] = useState<BlogPost | null>(staticPost ?? null);
  const [loading, setLoading] = useState(!staticPost);

  useEffect(() => {
    if (staticPost || !slug) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("blog_posts")
          .select(SELECT)
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        if (active) setPost(data ? rowToPost(data as DbRow) : null);
      } catch {
        if (active) setPost(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, staticPost]);

  return { post, loading };
}
