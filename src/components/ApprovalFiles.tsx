import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, ImageIcon, PencilLine, Repeat, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FORMAT_LABEL, isVideo, timeLeft, useMediaUrls, type Content } from "@/lib/content";
import { StatusBadge } from "@/components/StatusBadge";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export function ApprovalFiles({ data, onOpen }: { data: Content[]; onOpen: (id: string) => void }) {
  const pending = data.filter((c) => c.status === "pending");
  const editing = data.filter((c) => c.status === "draft" || c.status === "rejected");
  const approved = data
    .filter((c) => c.status === "approved")
    .sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? ""));

  return (
    <Tabs defaultValue="geral">
      <TabsList>
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
        <TabsTrigger value="reprovados">Reprovados</TabsTrigger>
      </TabsList>
      <TabsContent value="aprovados" className="mt-6"><Decided data={data} status="approved" /></TabsContent>
      <TabsContent value="reprovados" className="mt-6"><Decided data={data} status="rejected" /></TabsContent>
      <TabsContent value="geral" className="mt-6">
    <div className="space-y-8">
      <Group title="Aguardando aprovação" icon={<Clock className="h-4 w-4 text-warning" />} items={pending} onOpen={onOpen}
        meta={(c) => <>Enviado em {fmtDate(c.sent_at)} · expira em {timeLeft(c.expires_at)}</>} />
      <Group title="Salvos para continuar edição" icon={<PencilLine className="h-4 w-4 text-neon-blue" />} items={editing} onOpen={onOpen}
        meta={(c) => <>Atualizado em {fmtDate(c.updated_at)}{c.status === "rejected" ? " · ajustes pedidos pelo cliente" : ""}</>} />
      <Group title="Aprovados" icon={<CheckCircle2 className="h-4 w-4 text-success" />} items={approved} onOpen={onOpen}
        meta={(c) => <>Aprovado em {fmtDate(c.decided_at)}{c.auto_approved ? " (automático)" : ""}</>} />
    </div>
      </TabsContent>
    </Tabs>
  );
}

type Row = { id: string; title: string; client_name: string | null; format: string; image_urls: string[]; status: string;
  decided_at: string | null; auto_approved: boolean; rejection_reasons: string[] | null; feedback: string | null };

function Decided({ data, status }: { data: Content[]; status: "approved" | "rejected" }) {
  const { data: mine = [] } = useQuery({
    queryKey: ["my-decided"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("my_decided_contents");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const map = new Map<string, Row>();
  for (const c of data) map.set(c.id, c as unknown as Row);
  for (const r of mine) if (!map.has(r.id)) map.set(r.id, r);
  const list = [...map.values()].filter((c) => c.status === status)
    .sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? ""));
  if (!list.length) return <div className="glass rounded-xl p-10 text-center text-muted-foreground">{status === "approved" ? "Nenhuma arte aprovada." : "Nenhuma arte reprovada."}</div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((c) => <DecidedCard key={c.id} c={c} />)}</div>;
}

function DecidedCard({ c }: { c: Row }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  const ok = c.status === "approved";
  async function repost() {
    setBusy(true);
    const { error } = await (supabase.rpc as any)("request_repost", { _id: c.id });
    setBusy(false);
    if (error) return toast.error("Não foi possível enviar o pedido.");
    toast.success("Pedido enviado: a arte foi para a aba Postar.");
    qc.invalidateQueries({ queryKey: ["contents"] });
    qc.invalidateQueries({ queryKey: ["my-decided"] });
  }
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="aspect-square w-full bg-muted">
        {thumb ? (isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-contain" muted controls /> : <img src={thumb} alt={c.title} className="h-full w-full object-contain" />)
          : <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>}
      </div>
      <div className="space-y-1 p-3 text-sm">
        <div className="truncate font-medium">{c.title}{c.client_name ? ` · ${c.client_name}` : ""}</div>
        <div className={`flex items-center gap-1 text-xs ${ok ? "text-success" : "text-destructive"}`}>
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {ok ? "Aprovada" : "Reprovada"} em {fmtDate(c.decided_at)}{ok && c.auto_approved ? " (automática)" : ""}
        </div>
        {!ok && !!c.rejection_reasons?.length && <div className="text-xs text-muted-foreground">Motivos: {c.rejection_reasons.join(", ")}</div>}
        {!ok && c.feedback && <div className="text-xs text-muted-foreground">“{c.feedback}”</div>}
        <Button size="sm" variant="outline" className="mt-2 w-full" disabled={busy} onClick={repost}><Repeat /> Pedir para postar novamente</Button>
      </div>
    </div>
  );
}

function Group({ title, icon, items, onOpen, meta }: {
  title: string; icon: React.ReactNode; items: Content[]; onOpen: (id: string) => void; meta: (c: Content) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">{icon}{title}<span className="text-sm font-normal text-muted-foreground">({items.length})</span></h2>
      {items.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Nada aqui.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => <Item key={c.id} c={c} onOpen={() => onOpen(c.id)} meta={meta(c)} />)}
        </div>
      )}
    </section>
  );
}

function Item({ c, onOpen, meta }: { c: Content; onOpen: () => void; meta: React.ReactNode }) {
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  return (
    <button onClick={onOpen} className="glass flex gap-3 rounded-xl p-3 text-left transition-shadow hover:shadow-glow">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumb ? (isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-cover" muted /> : <img src={thumb} alt="" className="h-full w-full object-cover" />)
          : <ImageIcon className="m-5 h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="truncate text-sm font-medium">{c.title}</div>
        <div className="text-xs text-muted-foreground">{FORMAT_LABEL[c.format]}{c.client_name ? ` · ${c.client_name}` : ""}</div>
        <div className="text-xs text-muted-foreground">{meta}</div>
        <StatusBadge status={c.status} auto={c.auto_approved} />
      </div>
    </button>
  );
}
