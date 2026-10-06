import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock, Copy, ExternalLink, ImageIcon, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchContents, FORMAT_LABEL, isVideo, timeLeft, useMediaUrls, type Content } from "@/lib/content";
import { StatusBadge } from "@/components/StatusBadge";
import { FeedbackCard } from "@/components/FeedbackCard";
import { ContentEditor } from "@/components/ContentEditor";
import { InstagramPreview } from "@/components/InstagramPreview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Tabs defaultValue="arquivos">
        <TabsList>
          <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          <TabsTrigger value="pendentes">Arte pendente de aprovação</TabsTrigger>
          <TabsTrigger value="aprovadas">Artes aprovadas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="mt-6"><PendingTab data={data} /></TabsContent>
        <TabsContent value="aprovadas" className="mt-6"><Approved data={data} /></TabsContent>
        <TabsContent value="arquivos" className="mt-6 space-y-6">
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
        </TabsContent>
      </Tabs>
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

function PendingTab({ data }: { data: Content[] }) {
  const pending = data
    .filter((c) => c.status === "pending")
    .sort((a, b) => (b.sent_at ?? b.updated_at).localeCompare(a.sent_at ?? a.updated_at));
  if (pending.length === 0)
    return (
      <div className="glass rounded-xl border-dashed p-10 text-center text-muted-foreground">
        Nenhuma arte pendente de aprovação. Artes enviadas pelo link em Pré-visualizar &amp; Aprovação aparecem aqui.
      </div>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pending.map((c) => <PendingCard key={c.id} c={c} />)}
    </div>
  );
}

function PendingCard({ c }: { c: Content }) {
  const navigate = useNavigate();
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  const link = `https://contatus-ai.lovable.app/a/${c.share_token}`;
  return (
    <div className="glass overflow-hidden rounded-xl">
      <button
        onClick={() => navigate({ to: "/aprovacao", search: { id: c.id } })}
        className="relative block aspect-square w-full bg-muted"
        title="Abrir em Pré-visualizar & Aprovação"
      >
        {thumb ? (
          isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-cover" muted /> : <img src={thumb} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
        )}
        <div className="absolute top-2 left-2"><StatusBadge status={c.status} auto={c.auto_approved} /></div>
      </button>
      <div className="space-y-1.5 p-3">
        <div className="truncate text-sm font-medium">{c.title}</div>
        <div className="text-xs text-muted-foreground">
          {FORMAT_LABEL[c.format]}{c.client_name ? ` · ${c.client_name}` : ""}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-warning">
          <Clock className="h-3.5 w-3.5" />
          {c.sent_at ? `Enviada em ${new Date(c.sent_at).toLocaleDateString("pt-BR")} · ` : ""}
          {c.expires_at ? `decide em ${timeLeft(c.expires_at)}` : "aguardando cliente"}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="neon" className="flex-1" onClick={() => navigate({ to: "/aprovacao", search: { id: c.id } })}>
            <ExternalLink /> Abrir no editor
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }} title="Copiar link de aprovação">
            <Copy />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Approved({ data }: { data: Content[] }) {
  const list = data
    .filter((c) => c.status === "approved")
    .sort((a, b) => (b.decided_at ?? b.updated_at).localeCompare(a.decided_at ?? a.updated_at));
  if (list.length === 0) return <div className="glass rounded-xl p-10 text-center text-muted-foreground">Nenhuma arte aprovada ainda.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((c) => <ApprovedCard key={c.id} c={c} />)}
    </div>
  );
}

function ApprovedCard({ c }: { c: Content }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  async function repost() {
    setBusy(true);
    const { error } = await supabase.from("contents").insert({
      title: `${c.title} (postar novamente)`, kind: c.kind, format: c.format, caption: c.caption, hashtags: c.hashtags,
      image_urls: c.image_urls, audio: c.audio, location: c.location, client_name: c.client_name, client_email: c.client_email,
      status: "draft",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido criado: a arte foi para a aba Postar em Pré-visualizar & Aprovação");
    qc.invalidateQueries({ queryKey: ["contents"] });
    setOpen(false);
  }
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  const when = c.decided_at ?? c.updated_at;
  return (
    <div className="glass overflow-hidden rounded-xl">
      <button onClick={() => setOpen(true)} className="relative block aspect-square w-full bg-muted">
        {thumb ? (
          isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-cover" muted /> : <img src={thumb} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
        )}
      </button>
      <div className="p-3 text-sm">
        <div className="truncate font-medium">{c.title}{c.client_name ? ` · ${c.client_name}` : ""}</div>
        <div className="text-xs text-success">
          Aprovada em {new Date(when).toLocaleDateString("pt-BR")}{c.auto_approved ? " (automática)" : ""}
        </div>
        <Button size="sm" variant="outline" className="mt-2 w-full" disabled={busy} onClick={repost}><Repeat /> Postar novamente</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>{c.title}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Assim o cliente viu a arte no link de aprovação.</p>
          <InstagramPreview
            format={c.format}
            media={c.image_urls}
            caption={c.caption}
            hashtags={c.hashtags}
            audio={c.audio}
            location={c.location}
            handle={(c.client_name || "seu.perfil").toLowerCase().replace(/\s+/g, ".")}
          />
          <Button variant="neon" className="w-full" disabled={busy} onClick={repost}><Repeat /> Postar novamente</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
