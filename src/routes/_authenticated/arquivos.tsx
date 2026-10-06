import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchContents, FORMAT_LABEL, isVideo, useMediaUrls, type Content } from "@/lib/content";
import { StatusBadge } from "@/components/StatusBadge";
import { FeedbackCard } from "@/components/FeedbackCard";
import { ContentEditor } from "@/components/ContentEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/arquivos")({
  head: () => ({
    meta: [
      { title: "Arquivos — Contatus AI" },
      { name: "description", content: "Histórico de posts, carrosséis, lotes e vídeos com status de aprovação." },
      { property: "og:title", content: "Arquivos — Contatus AI" },
      { property: "og:description", content: "Histórico de conteúdos com status de aprovação." },
    ],
  }),
  component: Arquivos,
});

const FILTERS: { id: string; label: string; fn: (c: Content) => boolean }[] = [
  { id: "all", label: "Todos", fn: () => true },
  { id: "posts", label: "Posts", fn: (c) => c.format === "feed" || c.format === "stories" },
  { id: "carousel", label: "Carrosséis", fn: (c) => c.format === "carousel" },
  { id: "batch", label: "Lotes", fn: (c) => !!c.batch_id },
  { id: "video", label: "Vídeos", fn: (c) => c.format === "reels" || c.image_urls.some(isVideo) },
  { id: "approved", label: "Aprovados", fn: (c) => c.status === "approved" },
  { id: "rejected", label: "Reprovados", fn: (c) => c.status === "rejected" },
];

function Arquivos() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["contents"], queryFn: fetchContents });
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Content | null>(null);
  const list = useMemo(() => data.filter(FILTERS.find((f) => f.id === filter)!.fn), [data, filter]);

  async function remove(id: string) {
    if (!confirm("Excluir este conteúdo?")) return;
    const { error } = await supabase.from("contents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contents"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Arquivos</h1>
        <p className="text-muted-foreground">Todo o histórico, com o status de aprovação de cada arte.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${filter === f.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f.label} <span className="ml-1 text-xs opacity-60">{data.filter(f.fn).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-muted-foreground">Nada por aqui ainda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <Card key={c.id} c={c} onOpen={() => setEditing(c)} onDelete={() => remove(c.id)} />
          ))}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.title}</DialogTitle></DialogHeader>
          {editing?.status === "rejected" && <FeedbackCard content={editing} />}
          {editing && (
            <ContentEditor
              initial={editing}
              saveLabel="Salvar alterações"
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["contents"] });
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ c, onOpen, onDelete }: { c: Content; onOpen: () => void; onDelete: () => void }) {
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  return (
    <div className="glass group overflow-hidden rounded-xl">
      <button onClick={onOpen} className="relative block aspect-square w-full bg-muted">
        {thumb ? (
          isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-cover" muted /> : <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
        )}
        <div className="absolute top-2 left-2"><StatusBadge status={c.status} auto={c.auto_approved} /></div>
      </button>
      <div className="space-y-1 p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{c.title}</div>
            <div className="text-xs text-muted-foreground">
              {FORMAT_LABEL[c.format]}{c.client_name ? ` · ${c.client_name}` : ""}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 /></Button>
        </div>
        {c.status === "rejected" && (c.rejection_reasons.length > 0 || c.feedback) && (
          <p className="line-clamp-2 text-xs text-destructive">
            {[c.rejection_reasons.join(", "), c.feedback].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>
    </div>
  );
}
