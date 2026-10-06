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
  format: string;
  audio: string | null;
  location: string | null;
  client_email: string | null;
  sent_at: string | null;
  expires_at: string | null;
  rejection_reasons: string[];
  decided_at: string | null;
  auto_approved: boolean;
};

export const FORMAT_LABEL: Record<string, string> = {
  feed: "Post único (1:1)",
  carousel: "Carrossel (4:5)",
  reels: "Reels (9:16)",
  stories: "Stories (9:16)",
};

export const REJECTION_REASONS = [
  "Não gostei das cores",
  "Texto muito longo",
  "Muito simples",
  "Imagem de baixa qualidade",
  "Fora da identidade da marca",
  "Outro",
];

export function timeLeft(expires: string | null) {
  if (!expires) return null;
  const ms = new Date(expires).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

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
  await supabase.rpc("auto_approve_expired");
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Content[];
}

export const RATIO_BY_FORMAT: Record<string, number> = { feed: 1, carousel: 4 / 5, reels: 9 / 16, stories: 9 / 16 };

/** Center-crops an image to the selected format's ratio so it fills the phone mockup exactly. */
export async function fitImageToRatio(file: File, format: string): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const ratio = RATIO_BY_FORMAT[format] ?? 1;
  try {
    const bitmap = await createImageBitmap(file);
    const cropW = Math.min(bitmap.width, bitmap.height * ratio);
    const cropH = Math.min(bitmap.height, bitmap.width / ratio);
    const scale = Math.min(1, 1440 / Math.max(cropW, cropH));
    const w = Math.max(1, Math.round(cropW * scale));
    const h = Math.max(1, Math.round(cropH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2, cropW, cropH, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
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
