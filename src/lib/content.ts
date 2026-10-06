import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Content = {
  id: string;
  user_id: string;
  title: string;
  kind: string;
  caption: string;
  hashtags: string;
  image_urls: string[];
  batch_id: string | null;
  batch_label: string | null;
  day_number: number | null;
  client_name: string | null;
  status: string;
  art_approved: boolean | null;
  caption_approved: boolean | null;
  feedback: string | null;
  share_token: string;
  created_at: string;
  updated_at: string;
};

export const KIND_LABEL: Record<string, string> = {
  post: "Post",
  carousel: "Carrossel",
  video: "Vídeo",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending: "Aguardando cliente",
  approved: "Aprovado",
  rejected: "Reprovado",
};

export const STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

export async function fetchContents(): Promise<Content[]> {
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Content[];
}

export async function uploadMedia(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

/** Resolves stored media paths (or full URLs) into displayable signed URLs. */
export function useMediaUrls(paths: string[]) {
  const [urls, setUrls] = useState<string[]>([]);
  const key = paths.join("|");
  useEffect(() => {
    let alive = true;
    const storagePaths = paths.filter((p) => !p.startsWith("http") && !p.startsWith("blob:"));
    if (storagePaths.length === 0) {
      setUrls(paths);
      return;
    }
    supabase.storage
      .from("media")
      .createSignedUrls(storagePaths, 60 * 60 * 24)
      .then(({ data }) => {
        if (!alive) return;
        const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
        setUrls(paths.map((p) => map.get(p) ?? p));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

export function isVideo(path: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(path);
}
