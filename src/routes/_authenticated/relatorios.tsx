import { useSubTabs } from "@/lib/access";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, FileBarChart, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isStaff, useAccess } from "@/lib/access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Contatus AI" },
      { name: "description", content: "Relatórios de métricas das redes sociais dos clientes." },
      { property: "og:title", content: "Relatórios — Contatus AI" },
      { property: "og:description", content: "Relatórios de métricas das redes sociais dos clientes." },
    ],
  }),
  component: Relatorios,
});

const METRICS: { key: string; label: string; suffix?: string; color?: string; short?: string; w?: number }[] = [
  { key: "alcanceFb", label: "Alcance do Facebook", short: "FB Ads", color: "#1877f2", w: 0.10 },
  { key: "alcanceIg", label: "Alcance do Instagram", short: "IG Ads", color: "#e1306c", w: 0.40 },
  { key: "maps", label: "Buscas no Google Maps", short: "Google Maps", color: "#ea4335", w: 0.15 },
  { key: "visualizacoes", label: "Visualizações totais", short: "Totais", color: "#2cb574", w: 0.12 },
  { key: "visualizadores", label: "Visualizadores únicos", short: "Únicos", color: "#4c5fd7", w: 0.09 },
  { key: "cliques", label: "Cliques no link", short: "Cliques link", color: "#f4b400", w: 0.03 },
  { key: "linktree", label: "Visitas aos Contatos", short: "Contatos", color: "#39e587", w: 0.025 },
  { key: "visitas", label: "Visitas ao perfil", short: "Visitas", color: "#1098ad", w: 0.04 },
  { key: "seguidores", label: "Novos seguidores", short: "Seguidores", color: "#6f42c1", w: 0.03 },
  { key: "interacoes", label: "Interações com o conteúdo", short: "Interações", color: "#fd7e14", w: 0.015 },
];
const GROUPS = [
  { title: "1. Canais de alcance e descoberta", keys: ["alcanceFb", "alcanceIg", "maps"] },
  { title: "2. Volume de visualizações", keys: ["visualizacoes", "visualizadores"] },
  { title: "3. Cliques e direcionamento", keys: ["cliques", "linktree"] },
  { title: "4. Engajamento e crescimento", keys: ["visitas", "seguidores", "interacoes"] },
];
const LEGACY: Record<string, string> = { followers: "Seguidores", new_followers: "Novos seguidores", reach: "Alcance", impressions: "Impressões", engagement: "Engajamento", likes: "Curtidas", comments: "Comentários", shares: "Compartilhamentos", saves: "Salvamentos", profile_visits: "Visitas ao perfil", link_clicks: "Cliques no link", posts: "Publicações" };
const mByKey = Object.fromEntries(METRICS.map((m) => [m.key, m]));

function distribute(total: number): Record<string, string> {
  const ws = METRICS.map((m) => m.w! * (1 + (Math.random() * 0.4 - 0.2)));
  const sum = ws.reduce((a, b) => a + b, 0);
  let rest = total; const out: Record<string, string> = {};
  METRICS.forEach((m, i) => {
    let v = i === METRICS.length - 1 ? rest : Math.floor((total * ws[i]) / sum);
    if (i < METRICS.length - 1 && v === 0 && total > 80) v = 1;
    if (i < METRICS.length - 1) rest -= v;
    out[m.key] = String(Math.max(0, v));
  });
  return out;
}
function redistribute(total: number, key: string, value: number, cur: Record<string, string>): Record<string, string> {
  const v = Math.min(Math.max(0, value), total);
  const others = METRICS.filter((m) => m.key !== key);
  const wsum = others.reduce((a, m) => a + m.w!, 0);
  let rest = total - v; const out: Record<string, string> = { ...cur, [key]: String(v) };
  others.forEach((m, i) => {
    const n = i === others.length - 1 ? rest : Math.floor(((total - v) * m.w!) / wsum);
    if (i < others.length - 1) rest -= n;
    out[m.key] = String(Math.max(0, n));
  });
  return out;
}

function GroupCharts({ metrics }: { metrics: Record<string, number | string> }) {
  const groups = GROUPS.filter((g) => g.keys.some((k) => Number(metrics[k]) > 0));
  if (!groups.length) return null;
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {groups.map((g) => {
        const max = Math.max(1, ...g.keys.map((k) => Number(metrics[k]) || 0));
        return (
          <div key={g.title} className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-3 text-sm font-semibold">{g.title}</div>
            <div className="flex h-40 items-end justify-around gap-3">
              {g.keys.map((k) => { const n = Number(metrics[k]) || 0; const m = mByKey[k]; return (
                <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-semibold">{n.toLocaleString("pt-BR")}</span>
                  <div className="w-full max-w-14 rounded-t" style={{ height: `${(n / max) * 100}%`, minHeight: 2, background: m.color }} />
                  <span className="text-center text-[11px] text-muted-foreground">{m.short}</span>
                </div>
              ); })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Report = {
  id: string; client_id: string; title: string; period: string | null; network: string;
  metrics: Record<string, number | string>; notes: string | null; released: boolean; created_at: string;
};
type Client = { id: string; email: string | null; full_name: string | null; agency_name: string | null };

function Relatorios() {
  const { data: access } = useAccess();
  const staff = isStaff(access?.role);
  const sub = useSubTabs("/relatorios");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Métricas das redes sociais, liberadas pelo Adm para cada cliente.</p>
      </div>
      <Tabs defaultValue={sub.first(staff ? "adm" : "cliente")} key={String(staff) + sub.ready}>
        <TabsList>
          {sub.can("cliente") && <TabsTrigger value="cliente">Cliente</TabsTrigger>}
          {staff && sub.can("adm") && <TabsTrigger value="adm">Adm</TabsTrigger>}
        </TabsList>
        <TabsContent value="cliente" className="mt-6"><ClientView /></TabsContent>
        {staff && <TabsContent value="adm" className="mt-6"><AdmView /></TabsContent>}
      </Tabs>
    </div>
  );
}

function fmt(v: unknown, suffix?: string) {
  if (v === undefined || v === null || v === "") return "—";
  const n = Number(v);
  return (Number.isFinite(n) ? n.toLocaleString("pt-BR") : String(v)) + (suffix ?? "");
}

function ReportCard({ r, clientName, actions }: { r: Report; clientName?: string; actions?: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex flex-wrap items-start gap-3">
        <FileBarChart className="mt-1 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{r.title}</h3>
          <p className="text-sm text-muted-foreground">
            {r.network}{r.period ? ` · ${r.period}` : ""}{clientName ? ` · ${clientName}` : ""}
          </p>
        </div>
        {actions}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[...METRICS, ...Object.entries(LEGACY).map(([key, label]) => ({ key, label, suffix: key === "engagement" ? "%" : undefined }))].filter((m) => r.metrics[m.key] !== undefined && r.metrics[m.key] !== "").map((m) => (
          <div key={m.key} className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="mt-1 font-display text-xl font-semibold">{fmt(r.metrics[m.key], m.suffix)}</div>
          </div>
        ))}
      </div>
      <GroupCharts metrics={r.metrics} />
      {r.notes && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{r.notes}</p>}
    </div>
  );
}

function ClientView() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id });
  const { data = [] } = useQuery({
    queryKey: ["reports", "mine", me],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("client_id", me!).eq("released", true).order("created_at", { ascending: false });
      return (data ?? []) as unknown as Report[];
    },
  });
  if (data.length === 0) return <div className="glass rounded-xl p-10 text-center text-muted-foreground">Nenhum relatório liberado para você ainda.</div>;
  return <div className="space-y-4">{data.map((r) => <ReportCard key={r.id} r={r} />)}</div>;
}

function AdmView() {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => ((await supabase.rpc("list_clients")).data ?? []) as Client[],
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["reports", "all"],
    queryFn: async () => ((await supabase.from("reports").select("*").order("created_at", { ascending: false })).data ?? []) as unknown as Report[],
  });
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [network, setNetwork] = useState("Instagram");
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const nameOf = (id: string) => { const c = clients.find((x) => x.id === id); return c ? c.full_name || c.email || "" : ""; };

  async function save(release: boolean) {
    if (!clientId || !title.trim()) return toast.error("Escolha o cliente e dê um título");
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
    const { error } = await supabase.from("reports").insert({ client_id: clientId, title, period: period || null, network, metrics: clean, notes: notes || null, released: release });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(release ? "Relatório liberado para o cliente" : "Relatório salvo como rascunho");
    setTitle(""); setPeriod(""); setMetrics({}); setNotes(""); setTotal("");
    qc.invalidateQueries({ queryKey: ["reports"] });
  }

  async function toggle(r: Report) {
    const { error } = await supabase.from("reports").update({ released: !r.released, updated_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["reports"] });
  }
  async function remove(r: Report) {
    if (!confirm("Excluir relatório?")) return;
    await supabase.from("reports").delete().eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["reports"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="glass h-fit space-y-4 rounded-xl p-6">
        <h2 className="font-semibold">Novo relatório</h2>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder={clients.length ? "Selecione" : "Nenhum cliente liberado"} /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Relatório mensal — Setembro" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Período</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="01/09 a 30/09" /></div>
          <div className="space-y-1.5">
            <Label>Rede social</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
          <Label>Número total geral da campanha</Label>
          <div className="flex gap-2">
            <Input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} placeholder="Ex: 25000" />
            <Button type="button" variant="secondary" onClick={() => { const t = Number(total); if (!t) return toast.error("Insira um total válido"); setMetrics(distribute(t)); }}>Distribuir tudo</Button>
          </div>
          <p className="text-xs text-muted-foreground">Ao alterar um campo, o restante do total é redistribuído entre os outros.</p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title} className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">{g.title}</div>
            <div className="grid grid-cols-2 gap-3">
              {g.keys.map((k) => { const m = mByKey[k]; return (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{m.label}</Label>
                  <Input inputMode="numeric" value={metrics[k] ?? ""} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ""); const t = Number(total); setMetrics(t && raw !== "" ? redistribute(t, k, Number(raw), metrics) : { ...metrics, [k]: raw }); }} />
                </div>
              ); })}
            </div>
          </div>
        ))}
        {Object.keys(metrics).length > 0 && <GroupCharts metrics={metrics} />}
        <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Destaques, conclusões e próximos passos" /></div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => save(false)}>Salvar rascunho</Button>
          <Button variant="neon" disabled={saving} onClick={() => save(true)}>{saving && <Loader2 className="animate-spin" />} Liberar para cliente</Button>
        </div>
      </div>
      <div className="space-y-4">
        {reports.length === 0 && <div className="glass rounded-xl p-10 text-center text-muted-foreground">Nenhum relatório criado.</div>}
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            r={r}
            clientName={nameOf(r.client_id)}
            actions={
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.released ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{r.released ? "Liberado" : "Rascunho"}</span>
                <Button size="sm" variant="secondary" onClick={() => toggle(r)}>{r.released ? <><EyeOff /> Ocultar</> : <><Eye /> Liberar</>}</Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 /></Button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
