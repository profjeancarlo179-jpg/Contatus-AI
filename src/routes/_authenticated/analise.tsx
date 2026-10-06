import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Instagram, Loader2, Plug, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditProfile } from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/analise")({
  head: () => ({
    meta: [
      { title: "Análise & Conexão — Contatus AI" },
      { name: "description", content: "Auditoria estratégica de perfis do Instagram com IA." },
      { property: "og:title", content: "Análise & Conexão — Contatus AI" },
      { property: "og:description", content: "Auditoria estratégica de perfis do Instagram com IA." },
    ],
  }),
  component: Analise,
});

type Result = {
  score: number; summary: string; strengths: string[]; weaknesses: string[]; bio_suggestion: string;
  content_pillars: string[]; posting_plan: string; quick_wins: string[];
};
type Audit = { id: string; handle: string; niche: string | null; created_at: string; result: Result | null };

function Analise() {
  const qc = useQueryClient();
  const run = useServerFn(auditProfile);
  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data } = await supabase.from("audits").select("*").order("created_at", { ascending: false });
      return (data ?? []) as unknown as Audit[];
    },
  });
  const [f, setF] = useState({ handle: "", niche: "", bio: "", followers: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const current = audits.find((a) => a.id === currentId) ?? audits[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await run({
      data: { handle: f.handle, niche: f.niche, bio: f.bio, notes: f.notes, followers: f.followers ? Number(f.followers) : null },
    }).catch(() => ({ error: "Falha na análise" }) as const);
    setLoading(false);
    if ("error" in res && res.error) return toast.error(res.error);
    await qc.invalidateQueries({ queryKey: ["audits"] });
    if ("audit" in res && res.audit) setCurrentId(res.audit.id);
    toast.success("Análise pronta!");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise & Conexão</h1>
        <p className="text-muted-foreground">Auditoria estratégica do perfil com IA e conexão com a Meta.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <form onSubmit={submit} className="glass space-y-4 rounded-xl p-6">
            <div className="space-y-1.5"><Label>@ do perfil</Label><Input required value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} placeholder="@marca" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nicho</Label><Input value={f.niche} onChange={(e) => setF({ ...f, niche: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Seguidores</Label><Input type="number" value={f.followers} onChange={(e) => setF({ ...f, followers: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Bio atual</Label><Textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Objetivos, público, frequência atual…" /></div>
            <Button variant="neon" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} {loading ? "Analisando…" : "Gerar auditoria"}
            </Button>
          </form>
          <div className="glass space-y-3 rounded-xl p-6">
            <div className="flex items-center gap-2 font-semibold"><Plug className="h-4 w-4 text-neon-blue" /> Conexão com a API da Meta</div>
            <p className="text-sm text-muted-foreground">
              A ponte está preparada. Para puxar métricas reais e publicar direto, é preciso um app de desenvolvedor aprovado pela Meta.
            </p>
            <Button variant="outline" className="w-full" disabled><Instagram /> Conectar Instagram (em breve)</Button>
          </div>
          {audits.length > 0 && (
            <div className="glass rounded-xl p-2">
              {audits.map((a) => (
                <button key={a.id} onClick={() => setCurrentId(a.id)} className={`flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm ${current?.id === a.id ? "bg-primary/15" : "hover:bg-muted"}`}>
                  <span>@{a.handle}</span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {current?.result ? <Report a={current} /> : (
          <div className="glass grid min-h-80 place-items-center rounded-xl p-10 text-center text-muted-foreground">Preencha o perfil para gerar a primeira auditoria.</div>
        )}
      </div>
    </div>
  );
}

function List({ title, items, cls }: { title: string; items: string[]; cls: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className={`font-semibold ${cls}`}>{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">{items.map((i) => <li key={i} className="flex gap-2"><span className={cls}>•</span>{i}</li>)}</ul>
    </div>
  );
}

function Report({ a }: { a: Audit }) {
  const r = a.result!;
  return (
    <div className="space-y-4">
      <div className="glass flex items-center gap-6 rounded-xl p-6">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gradient-neon p-1">
          <div className="grid h-full w-full place-items-center rounded-full bg-card font-display text-3xl font-bold">{Math.round(r.score)}</div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">@{a.handle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <List title="Pontos fortes" items={r.strengths} cls="text-success" />
        <List title="Pontos fracos" items={r.weaknesses} cls="text-destructive" />
      </div>
      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold text-neon-blue">Sugestão de bio</h3>
        <p className="mt-2 whitespace-pre-line text-sm">{r.bio_suggestion}</p>
      </div>
      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold text-neon">Pilares de conteúdo</h3>
        <div className="mt-3 flex flex-wrap gap-2">{r.content_pillars.map((p) => <span key={p} className="rounded-full bg-primary/15 px-3 py-1 text-sm">{p}</span>)}</div>
      </div>
      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold">Plano de postagem</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.posting_plan}</p>
      </div>
      <List title="Ações rápidas" items={r.quick_wins} cls="text-warning" />
    </div>
  );
}
