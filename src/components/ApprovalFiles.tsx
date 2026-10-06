import { CheckCircle2, Clock, ImageIcon, PencilLine } from "lucide-react";
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
    <div className="space-y-8">
      <Group title="Aguardando aprovação" icon={<Clock className="h-4 w-4 text-warning" />} items={pending} onOpen={onOpen}
        meta={(c) => <>Enviado em {fmtDate(c.sent_at)} · expira em {timeLeft(c.expires_at)}</>} />
      <Group title="Salvos para continuar edição" icon={<PencilLine className="h-4 w-4 text-neon-blue" />} items={editing} onOpen={onOpen}
        meta={(c) => <>Atualizado em {fmtDate(c.updated_at)}{c.status === "rejected" ? " · ajustes pedidos pelo cliente" : ""}</>} />
      <Group title="Aprovados" icon={<CheckCircle2 className="h-4 w-4 text-success" />} items={approved} onOpen={onOpen}
        meta={(c) => <>Aprovado em {fmtDate(c.decided_at)}{c.auto_approved ? " (automático)" : ""}</>} />
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
