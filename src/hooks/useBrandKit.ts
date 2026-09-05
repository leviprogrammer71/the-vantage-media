import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BrandKit {
  full_name: string;
  brokerage: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
  headshot_url: string | null;
  color_primary: string;
  color_secondary: string;
}

export const EMPTY_KIT: BrandKit = {
  full_name: "",
  brokerage: "",
  phone: "",
  email: "",
  website: "",
  logo_url: null,
  headshot_url: null,
  color_primary: "#8C3F2E",
  color_secondary: "#1A1714",
};

/** Load + save the signed-in user's Brand Kit (the retention mechanism). */
export function useBrandKit() {
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setKit(null); return; }
      const { data } = await supabase
        .from("brand_kits")
        .select("full_name,brokerage,phone,email,website,logo_url,headshot_url,color_primary,color_secondary")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setKit((data as BrandKit) ?? null);
    } catch {
      setKit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: BrandKit) => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("brand_kits")
        .upsert({ ...next, user_id: auth.user.id }, { onConflict: "user_id" });
      if (error) throw error;
      setKit(next);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  /** Upload a logo/headshot into the public brand-assets bucket. */
  const uploadAsset = useCallback(async (file: File, kind: "logo" | "headshot") => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${auth.user.id}/${kind}.${ext}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
    return data.publicUrl ?? null;
  }, []);

  return { kit, loading, saving, save, uploadAsset, reload: load };
}
