import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useBlog";
import { type BlogPost } from "@/lib/blog-posts";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, ArrowUp, ArrowDown, Upload } from "lucide-react";

type Block = BlogPost["sections"][number];
type BlockType = Block["type"];

const BLOCK_TYPES: BlockType[] = ["lede", "p", "h2", "ul", "ol", "quote", "cta", "image", "video"];

interface Draft {
  id?: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  cover: string;
  cover_video: string;
  read_time: number;
  keywords: string; // comma-separated in the form
  sections: Block[];
  published: boolean;
  published_at: string;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const emptyDraft = (): Draft => ({
  slug: "",
  title: "",
  description: "",
  category: "JOURNAL",
  cover: "",
  cover_video: "",
  read_time: 5,
  keywords: "",
  sections: [{ type: "lede", text: "" }],
  published: false,
  published_at: new Date().toISOString().slice(0, 10),
});

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--lux-hairline-strong)",
  background: "var(--lux-bone)",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.9rem",
  color: "var(--lux-ink)",
};

export default function BlogAdmin() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [list, setList] = useState<{ id: string; slug: string; title: string; published: boolean }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Allow the admin check a moment to resolve before deciding access.
  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (isAdmin) loadList();
  }, [isAdmin]);

  const loadList = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, published")
      .order("created_at", { ascending: false });
    setList((data as typeof list) || []);
  };

  const startEdit = async (id: string) => {
    const { data } = await supabase.from("blog_posts").select("*").eq("id", id).single();
    if (!data) return;
    setDraft({
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description || "",
      category: data.category || "JOURNAL",
      cover: data.cover || "",
      cover_video: data.cover_video || "",
      read_time: data.read_time || 5,
      keywords: (data.keywords || []).join(", "),
      sections: Array.isArray(data.sections) ? data.sections : [],
      published: data.published,
      published_at: data.published_at || new Date().toISOString().slice(0, 10),
    });
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const path = `posts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("blog-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-media").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      toast.error("Upload failed: " + (e instanceof Error ? e.message : "unknown"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) return toast.error("Title is required.");
    const slug = draft.slug.trim() || slugify(draft.title);
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const row = {
        slug,
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category.trim() || "JOURNAL",
        cover: draft.cover.trim() || null,
        cover_video: draft.cover_video.trim() || null,
        read_time: Number(draft.read_time) || 5,
        keywords: draft.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        sections: draft.sections,
        published: draft.published,
        published_at: draft.published_at,
        author_id: auth?.user?.id ?? null,
      };
      const { error } = draft.id
        ? await supabase.from("blog_posts").update(row).eq("id", draft.id)
        : await supabase.from("blog_posts").upsert(row, { onConflict: "slug" });
      if (error) throw error;
      toast.success(draft.published ? "Published." : "Saved as draft.");
      setDraft(null);
      loadList();
    } catch (e) {
      toast.error("Save failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error("Delete failed.");
    toast.success("Deleted.");
    loadList();
  };

  // ── Section editing helpers ──
  const setBlock = (i: number, patch: Partial<Block>) =>
    setDraft((d) => (d ? { ...d, sections: d.sections.map((b, j) => (j === i ? ({ ...b, ...patch } as Block) : b)) } : d));
  const addBlock = (type: BlockType) => {
    const base: Record<BlockType, Block> = {
      lede: { type: "lede", text: "" }, p: { type: "p", text: "" }, h2: { type: "h2", text: "" },
      ul: { type: "ul", items: [] }, ol: { type: "ol", items: [] },
      quote: { type: "quote", text: "" }, cta: { type: "cta", label: "", href: "/" },
      image: { type: "image", url: "" }, video: { type: "video", url: "" },
    };
    setDraft((d) => (d ? { ...d, sections: [...d.sections, base[type]] } : d));
  };
  const moveBlock = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const j = i + dir;
      if (j < 0 || j >= d.sections.length) return d;
      const s = [...d.sections];
      [s[i], s[j]] = [s[j], s[i]];
      return { ...d, sections: s };
    });
  const removeBlock = (i: number) =>
    setDraft((d) => (d ? { ...d, sections: d.sections.filter((_, j) => j !== i) } : d));

  const previewUrl = useMemo(() => (draft?.slug ? `/blog/${draft.slug}` : "/blog"), [draft?.slug]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen lux-bg-bone">
        <LuxuryHeader variant="bone" />
        <main className="lux-container py-32 text-center">
          {!checked ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: "var(--lux-rust)" }} />
          ) : (
            <>
              <h1 className="lux-display" style={{ fontSize: "2rem" }}>Admins only.</h1>
              <button onClick={() => navigate("/")} className="lux-btn mt-6">← HOME</button>
            </>
          )}
        </main>
        <LuxuryFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen lux-bg-bone">
      <LuxuryHeader variant="bone" />
      <main className="mx-auto px-5 sm:px-8" style={{ maxWidth: 860, paddingTop: 40, paddingBottom: 80 }}>
        {!draft ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="lux-display" style={{ fontSize: "2.2rem", color: "var(--lux-ink)" }}>Blog posts</h1>
              <button onClick={() => setDraft(emptyDraft())} className="lux-btn inline-flex items-center gap-2" style={{ background: "var(--lux-rust)", color: "var(--lux-bone)" }}>
                <Plus size={15} /> NEW POST
              </button>
            </div>
            <div className="divide-y" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
              {list.length === 0 && <p className="lux-prose py-6" style={{ color: "var(--lux-ash)" }}>No CMS posts yet. Click “New Post”.</p>}
              {list.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
                  <div>
                    <div className="lux-prose" style={{ fontWeight: 600, color: "var(--lux-ink)" }}>{p.title}</div>
                    <div className="lux-eyebrow" style={{ color: p.published ? "var(--lux-brass)" : "var(--lux-ash)", fontSize: "0.6rem" }}>
                      {p.published ? "PUBLISHED" : "DRAFT"} · /blog/{p.slug}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(p.id)} className="lux-eyebrow" style={{ color: "var(--lux-ink)" }}>EDIT</button>
                    <button onClick={() => remove(p.id)} className="lux-eyebrow inline-flex items-center gap-1" style={{ color: "var(--lux-rust)" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setDraft(null)} className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>← ALL POSTS</button>
              <div className="flex items-center gap-3">
                <a href={previewUrl} target="_blank" rel="noreferrer" className="lux-eyebrow" style={{ color: "var(--lux-ink)", opacity: 0.7 }}>PREVIEW</a>
                <button onClick={save} disabled={saving} className="lux-btn inline-flex items-center gap-2" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", opacity: saving ? 0.6 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} SAVE
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>TITLE</label>
                <input style={input} value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: draft.slug || slugify(e.target.value) })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>SLUG</label>
                  <input style={input} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
                </div>
                <div>
                  <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>CATEGORY</label>
                  <input style={input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>DESCRIPTION (meta / preview)</label>
                <textarea style={{ ...input, minHeight: 64 }} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>KEYWORDS (comma-separated)</label>
                  <input style={input} value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} />
                </div>
                <div>
                  <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>READ TIME (min)</label>
                  <input style={input} type="number" value={draft.read_time} onChange={(e) => setDraft({ ...draft, read_time: Number(e.target.value) })} />
                </div>
              </div>

              {/* Cover media */}
              <div className="grid sm:grid-cols-2 gap-4">
                <MediaField label="COVER IMAGE" value={draft.cover} accept="image/*"
                  onUrl={(u) => setDraft({ ...draft, cover: u })} upload={uploadMedia} uploading={uploading} />
                <MediaField label="COVER VIDEO (optional)" value={draft.cover_video} accept="video/*"
                  onUrl={(u) => setDraft({ ...draft, cover_video: u })} upload={uploadMedia} uploading={uploading} />
              </div>

              {/* Body blocks */}
              <div className="pt-2">
                <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>BODY</div>
                <div className="space-y-3">
                  {draft.sections.map((b, i) => (
                    <div key={i} className="p-4" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="lux-eyebrow" style={{ color: "var(--lux-brass)", fontSize: "0.6rem" }}>{b.type.toUpperCase()}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => moveBlock(i, -1)} className="opacity-60 hover:opacity-100"><ArrowUp size={13} /></button>
                          <button onClick={() => moveBlock(i, 1)} className="opacity-60 hover:opacity-100"><ArrowDown size={13} /></button>
                          <button onClick={() => removeBlock(i)} style={{ color: "var(--lux-rust)" }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <BlockEditor block={b} onChange={(patch) => setBlock(i, patch)} upload={uploadMedia} uploading={uploading} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {BLOCK_TYPES.map((t) => (
                    <button key={t} onClick={() => addBlock(t)} className="lux-eyebrow px-3 py-2" style={{ border: "1px solid var(--lux-hairline-strong)", background: "var(--lux-bone)", fontSize: "0.6rem" }}>
                      + {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Publish */}
              <label className="flex items-center gap-3 pt-4 cursor-pointer">
                <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
                <span className="lux-prose" style={{ color: "var(--lux-ink)" }}>Published (visible on /blog)</span>
              </label>
            </div>
          </>
        )}
      </main>
      <LuxuryFooter />
    </div>
  );
}

function MediaField({ label, value, accept, onUrl, upload, uploading }: {
  label: string; value: string; accept: string; onUrl: (u: string) => void;
  upload: (f: File) => Promise<string | null>; uploading: boolean;
}) {
  return (
    <div>
      <label className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>{label}</label>
      <input style={input} placeholder="paste URL or upload →" value={value} onChange={(e) => onUrl(e.target.value)} />
      <label className="lux-eyebrow inline-flex items-center gap-1.5 mt-2 cursor-pointer" style={{ color: "var(--lux-ink)", opacity: 0.75 }}>
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} UPLOAD
        <input type="file" accept={accept} className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (f) { const u = await upload(f); if (u) onUrl(u); }
        }} />
      </label>
    </div>
  );
}

function BlockEditor({ block, onChange, upload, uploading }: {
  block: Block; onChange: (patch: Partial<Block>) => void;
  upload: (f: File) => Promise<string | null>; uploading: boolean;
}) {
  if (block.type === "ul" || block.type === "ol") {
    return (
      <textarea style={{ ...input, minHeight: 90 }} placeholder="One item per line"
        value={(block.items || []).join("\n")}
        onChange={(e) => onChange({ items: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) } as Partial<Block>)} />
    );
  }
  if (block.type === "cta") {
    return (
      <div className="space-y-2">
        <input style={input} placeholder="Button label" value={(block as { label: string }).label}
          onChange={(e) => onChange({ label: e.target.value } as Partial<Block>)} />
        <input style={input} placeholder="Link (e.g. /connect)" value={(block as { href: string }).href}
          onChange={(e) => onChange({ href: e.target.value } as Partial<Block>)} />
        <input style={input} placeholder="Subhead (optional)" value={(block as { subhead?: string }).subhead || ""}
          onChange={(e) => onChange({ subhead: e.target.value } as Partial<Block>)} />
      </div>
    );
  }
  if (block.type === "image" || block.type === "video") {
    const accept = block.type === "image" ? "image/*" : "video/*";
    return (
      <div className="space-y-2">
        <input style={input} placeholder="Media URL or upload →" value={(block as { url: string }).url}
          onChange={(e) => onChange({ url: e.target.value } as Partial<Block>)} />
        <label className="lux-eyebrow inline-flex items-center gap-1.5 cursor-pointer" style={{ color: "var(--lux-ink)", opacity: 0.75 }}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} UPLOAD
          <input type="file" accept={accept} className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (f) { const u = await upload(f); if (u) onChange({ url: u } as Partial<Block>); }
          }} />
        </label>
        {block.type === "image" && (
          <input style={input} placeholder="Caption (optional)" value={(block as { caption?: string }).caption || ""}
            onChange={(e) => onChange({ caption: e.target.value } as Partial<Block>)} />
        )}
      </div>
    );
  }
  // lede / p / h2 / quote → text (+ quote attribution)
  return (
    <div className="space-y-2">
      <textarea style={{ ...input, minHeight: block.type === "h2" ? 44 : 80 }} placeholder="Text"
        value={(block as { text?: string }).text || ""}
        onChange={(e) => onChange({ text: e.target.value } as Partial<Block>)} />
      {block.type === "quote" && (
        <input style={input} placeholder="Attribution (optional)" value={(block as { attribution?: string }).attribution || ""}
          onChange={(e) => onChange({ attribution: e.target.value } as Partial<Block>)} />
      )}
    </div>
  );
}
