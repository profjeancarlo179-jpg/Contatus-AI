import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InstagramPreview } from "@/components/InstagramPreview";
import { FORMAT_LABEL, fitImageToRatio, uploadMedia, useMediaUrls, type Content } from "@/lib/content";

type ClientOption = { id: string; name: string; socials: Record<string, string> | null };

const KIND_BY_FORMAT: Record<string, string> = { feed: "post", carousel: "carousel", reels: "video", stories: "post" };

type Draft = Pick<Content, "title" | "format" | "caption" | "hashtags" | "image_urls" | "audio" | "location" | "client_name">;

export function ContentEditor({
  initial,
  onSaved,
  saveLabel = "Salvar conteúdo",
}: {
  initial?: Partial<Content>;
  onSaved?: (c: Content) => void;
  saveLabel?: string;
}) {
  const [d, setD] = useState<Draft>({
    title: initial?.title ?? "",
    format: initial?.format ?? "feed",
    caption: initial?.caption ?? "",
    hashtags: initial?.hashtags ?? "",
    image_urls: initial?.image_urls ?? [],
    audio: initial?.audio ?? "",
    location: initial?.location ?? "",
    client_name: initial?.client_name ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const thumbs = useMediaUrls(d.image_urls);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const multi = d.format === "carousel" || d.format === "stories";
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,name,socials").order("name");
      if (error) throw error;
      return (data ?? []) as ClientOption[];
    },
  });
  const selClient = clients.find((c) => c.name === d.client_name);
  const igHandle = (selClient?.socials?.instagram ?? "").trim().replace(/^@+/, "").replace(/\s+/g, "");
  const previewHandle = igHandle || (d.client_name || "seu.perfil").toLowerCase().replace(/\s+/g, ".");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      // Ajusta a imagem automaticamente ao formato do mockup (1:1, 4:5 ou 9:16).
      const adapted = await Promise.all(Array.from(files).map((f) => fitImageToRatio(f, d.format)));
      const paths = await Promise.all(adapted.map(uploadMedia));
      set("image_urls", multi ? [...d.image_urls, ...paths].slice(0, 10) : [paths[0]]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...d,
      title: d.title || "Sem título",
      kind: KIND_BY_FORMAT[d.format] ?? "post",
      audio: d.audio || null,
      location: d.location || null,
      client_name: d.client_name || null,
      updated_at: new Date().toISOString(),
    };
    const q = initial?.id
      ? supabase.from("contents").update(payload).eq("id", initial.id).select().single()
      : supabase.from("contents").insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conteúdo salvo");
    onSaved?.(data as Content);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Título interno</Label><Input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Lançamento coleção verão" /></div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select
              value={selClient?.id ?? ""}
              onValueChange={(id) => {
                const c = clients.find((x) => x.id === id);
                set("client_name", c ? c.name : "");
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar cliente cadastrado" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={d.client_name ?? ""} onChange={(e) => set("client_name", e.target.value)} placeholder="Ou digite o nome do cliente" />
            {igHandle && (
              <p className="flex items-center gap-1 text-xs text-primary"><Instagram className="h-3.5 w-3.5" /> Instagram do cliente: @{igHandle}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Formato</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(FORMAT_LABEL).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => set("format", k)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${d.format === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Mídia {multi ? "(até 10 arquivos)" : ""}</Label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground hover:border-primary">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando…" : "Clique para enviar imagem ou vídeo"}
            <input type="file" accept="image/*,video/*" multiple={multi} className="hidden" onChange={(e) => onFiles(e.target.files)} />
          </label>
          {d.image_urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {d.image_urls.map((p, k) => (
                <div key={p} className="group relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted">
                  {thumbs[k] && <img src={thumbs[k]} alt="" className="h-full w-full object-cover" />}
                  <button onClick={() => set("image_urls", d.image_urls.filter((x) => x !== p))} className="absolute inset-0 hidden place-items-center bg-background/70 group-hover:grid">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1.5"><Label>Legenda</Label><Textarea rows={6} value={d.caption} onChange={(e) => set("caption", e.target.value)} placeholder="Escreva a legenda do post…" /></div>
        <div className="space-y-1.5"><Label>Hashtags</Label><Input value={d.hashtags} onChange={(e) => set("hashtags", e.target.value)} placeholder="#marketing #instagram" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Áudio</Label><Input value={d.audio ?? ""} onChange={(e) => set("audio", e.target.value)} placeholder="Artista · Música" /></div>
          <div className="space-y-1.5"><Label>Localização</Label><Input value={d.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Cuiabá, MT" /></div>
        </div>
        <Button variant="neon" onClick={save} disabled={saving || uploading}>
          {saving && <Loader2 className="animate-spin" />} {saveLabel}
        </Button>
      </div>
      <div className="lg:sticky lg:top-36 lg:self-start">
        <InstagramPreview format={d.format} media={d.image_urls} caption={d.caption} hashtags={d.hashtags} audio={d.audio} location={d.location} handle={previewHandle} />
      </div>
    </div>
  );
}
