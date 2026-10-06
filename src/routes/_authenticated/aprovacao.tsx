import { useSubTabs } from "@/lib/access";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ImageIcon, Link2, Mail, Pencil, Plus, Send, Timer, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchContents, FORMAT_LABEL, isVideo, timeLeft, useMediaUrls, type Content } from "@/lib/content";
import { ContentEditor } from "@/components/ContentEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { FeedbackCard } from "@/components/FeedbackCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalFiles } from "@/components/ApprovalFiles";

export const Route = createFileRoute("/_authenticated/aprovacao")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" && search.id ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pré-visualizar & Aprovação — Contatus AI" },
      { name: "description", content: "Simule o post no Instagram e envie um link de aprovação ao cliente." },
      { property: "og:title", content: "Pré-visualizar & Aprovação — Contatus AI" },
      { property: "og:description", content: "Simule o post no Instagram e envie um link de aprovação ao cliente." },
    ],
  }),
  component: Aprovacao,
});

function Aprovacao() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["contents"], queryFn: fetchContents });
  const { id: initialId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<string | "new">(initialId ?? "new");
  const [tab, setTab] = useState("geral");
  const sub = useSubTabs("/aprovacao");
  useEffect(() => { if (sub.ready && !sub.can(tab)) setTab(sub.first("geral")); }, [sub.ready]);
  const selected = data.find((c) => c.id === selectedId);
  const open = (id: string) => { setSelectedId(id); setTab("geral"); window.scrollTo({ top: 0 }); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pré-visualizar & Aprovação</h1>
        <p className="text-muted-foreground">Monte o mockup, gere o link e o cliente aprova a arte como ela ficará no Instagram.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {sub.can("geral") && <TabsTrigger value="geral">Geral</TabsTrigger>}
          {sub.can("arquivos") && <TabsTrigger value="arquivos">Arquivos</TabsTrigger>}
          {sub.can("postar") && <TabsTrigger value="postar">Postar</TabsTrigger>}
          {sub.can("reprovado") && <TabsTrigger value="reprovado">Reprovado</TabsTrigger>}
        </TabsList>
        <TabsContent value="arquivos" className="mt-6"><ApprovalFiles data={data} onOpen={open} /></TabsContent>
        <TabsContent value="postar" className="mt-6"><PostarTab data={data} /></TabsContent>
        <TabsContent value="reprovado" className="mt-6"><ReprovadoTab data={data} onOpen={open} /></TabsContent>
        <TabsContent value="geral" className="mt-6">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="glass h-fit max-h-[75vh] overflow-y-auto rounded-xl p-2">
          <button
            onClick={() => setSelectedId("new")}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${selectedId === "new" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Plus className="h-4 w-4" /> Nova arte
          </button>
          {data.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full rounded-lg px-3 py-2 text-left ${selectedId === c.id ? "bg-primary/15" : "hover:bg-muted"}`}
            >
              <div className="truncate text-sm font-medium">{c.title}</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={c.status} auto={c.auto_approved} />
              </div>
            </button>
          ))}
        </aside>
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <ContentEditor
              key={selectedId}
              initial={selected}
              saveLabel={selected ? "Salvar alterações" : "Salvar e continuar"}
              onSaved={(c) => {
                qc.invalidateQueries({ queryKey: ["contents"] });
                setSelectedId(c.id);
              }}
            />
          </div>
          {selected ? (
            <SendCard content={selected} />
          ) : (
            <div className="glass rounded-xl border-dashed p-6 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Link público de aprovação:</span> salve a arte acima para gerar o link que o cliente abre sem precisar de login.
            </div>
          )}
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SendCard({ content }: { content: Content }) {
  const qc = useQueryClient();
  const [name, setName] = useState(content.client_name ?? "");
  const [email, setEmail] = useState(content.client_email ?? "");
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const link = `https://contatus-ai.lovable.app/a/${content.share_token}`;

  async function sendEmail() {
    const to = email.trim();
    if (!to) return toast.error("Preencha o e-mail do cliente para enviar");
    if (to !== (content.client_email ?? "")) {
      await supabase.from("contents").update({ client_email: to }).eq("id", content.id);
      qc.invalidateQueries({ queryKey: ["contents"] });
    }
    const subject = `Aprovação de arte: ${content.title}`;
    const body = `Olá${name ? `, ${name}` : ""}!\n\nSua arte "${content.title}" está pronta para aprovação. Veja como ela ficará no Instagram e aprove ou peça ajustes pelo link abaixo:\n\n${link}\n\nVocê tem até 3 dias para responder; sem resposta, a arte será aprovada automaticamente.`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function send() {
    if (!name.trim()) return toast.error("Preencha o nome do cliente");
    if (content.image_urls.length === 0) return toast.error("Envie a arte antes de gerar o link");
    const now = new Date();
    const { error } = await supabase
      .from("contents")
      .update({
        client_name: name,
        client_email: email.trim() || null,
        status: "pending",
        sent_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 3 * 86400000).toISOString(),
        rejection_reasons: [],
        feedback: null,
        decided_at: null,
        auto_approved: false,
      })
      .eq("id", content.id);
    if (error) return toast.error(error.message);
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success("Link gerado e copiado! Prazo de 3 dias iniciado.");
    qc.invalidateQueries({ queryKey: ["contents"] });
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Enviar para o cliente</h2>
        <StatusBadge status={content.status} auto={content.auto_approved} />
        <span className="text-xs text-muted-foreground">{FORMAT_LABEL[content.format]}</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5"><Label>Nome do cliente</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>E-mail do cliente <span className="text-muted-foreground">(opcional)</span></Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Button variant="neon" onClick={send}><Send /> {content.status === "pending" ? "Reenviar" : "Gerar link"}</Button>
      </div>
      {content.status !== "draft" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 pl-3">
            <Link2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm">{link}</span>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>
              <Copy /> Copiar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => sendEmail()}>
              <Mail /> Enviar por e-mail
            </Button>
          </div>
          {content.status === "pending" && (
            <p className="flex items-center gap-2 text-sm text-warning">
              <Timer className="h-4 w-4" /> Aprovação automática em {timeLeft(content.expires_at)}
            </p>
          )}
          {content.status === "rejected" && <FeedbackCard content={content} />}
        </div>
      )}
    </div>
  );
}

function ReprovadoTab({ data, onOpen }: { data: Content[]; onOpen: (id: string) => void }) {
  const rejected = data
    .filter((c) => c.status === "rejected")
    .sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? ""));
  if (rejected.length === 0)
    return (
      <div className="glass rounded-xl border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma arte reprovada ainda. Quando o cliente reprovar uma arte, ela aparece aqui com os motivos apontados.
      </div>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rejected.map((c) => <ReprovadoCard key={c.id} c={c} onOpen={onOpen} />)}
    </div>
  );
}

function ReprovadoCard({ c, onOpen }: { c: Content; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    const { error } = await supabase.from("contents").delete().eq("id", c.id);
    if (error) return toast.error("Não foi possível excluir: " + error.message);
    toast.success("Arte reprovada excluída");
    qc.invalidateQueries({ queryKey: ["contents"] });
  }

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="aspect-square bg-muted/40">
        {thumb ? (
          isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-cover" muted /> : <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{c.title}</span>
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        </div>
        <p className="text-xs text-muted-foreground">
          {FORMAT_LABEL[c.format]}{c.client_name ? ` · ${c.client_name}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Reprovada em {c.decided_at ? new Date(c.decided_at).toLocaleDateString("pt-BR") : "—"}
        </p>
        {c.rejection_reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {c.rejection_reasons.map((r) => (
              <span key={r} className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">{r}</span>
            ))}
          </div>
        )}
        {c.feedback && <p className="text-xs text-muted-foreground">“{c.feedback}”</p>}
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <Button size="sm" variant="secondary" onClick={() => onOpen(c.id)}>
            <Pencil /> Abrir no editor
          </Button>
          {confirming ? (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" onClick={remove}>
                <Trash2 /> Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir arte reprovada" onClick={() => setConfirming(true)}>
              <Trash2 /> Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PostarTab({ data }: { data: Content[] }) {
  const approved = data
    .filter((c) => c.status === "approved")
    .sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? ""));
  if (approved.length === 0)
    return (
      <div className="glass rounded-xl border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma arte aprovada ainda. Quando o cliente aprovar — ou pedir para postar de novo — a arte aparece aqui pronta para postagem.
      </div>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {approved.map((c) => <PostarCard key={c.id} c={c} />)}
    </div>
  );
}

function PostarCard({ c }: { c: Content }) {
  const [thumb] = useMediaUrls(c.image_urls.slice(0, 1));
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="aspect-square bg-muted/40">
        {thumb ? (
          isVideo(c.image_urls[0]) ? <video src={thumb} className="h-full w-full object-cover" muted /> : <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{c.title}</span>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        </div>
        <p className="text-xs text-muted-foreground">
          {FORMAT_LABEL[c.format]}{c.client_name ? ` · ${c.client_name}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Aprovada em {c.decided_at ? new Date(c.decided_at).toLocaleDateString("pt-BR") : "—"}
          {c.auto_approved ? " (automática)" : ""}
        </p>
      </div>
    </div>
  );
}
