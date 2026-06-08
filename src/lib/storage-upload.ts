import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(bucket: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function ensureUploaded(bucket: string, src: string | undefined): Promise<string | undefined> {
  if (!src) return src;
  if (!src.startsWith("data:")) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  const ext = blob.type.split("/")[1] || "jpg";
  const file = new File([blob], `upload.${ext}`, { type: blob.type });
  return uploadImage(bucket, file);
}
