import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Link2, Mail, Plus, Send, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchContents, FORMAT_LABEL, timeLeft, type Content } from "@/lib/content";
import { ContentEditor } from "@/components/ContentEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { FeedbackCard } from "@/components/FeedbackCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalFiles } from "@/components/ApprovalFiles";

export const Route = createFileRoute("/_authenticated/aprovacao")({
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
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [tab, setTab] = useState("geral");
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
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
        </TabsList>
        <TabsContent value="arquivos" className="mt-6"><ApprovalFiles data={data} onOpen={open} /></TabsContent>
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
  const link = typeof window !== "undefined" ? `${window.location.origin}/aprovar/${content.share_token}` : "";

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
