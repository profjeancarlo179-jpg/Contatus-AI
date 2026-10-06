import { useSubTabs } from "@/lib/access";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, FileBarChart, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isStaff, useAccess } from "@/lib/access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { METRICS, GROUPS, mByKey, getExtra, emptyExtra, num, type ReportExtra, type PctRow } from "@/lib/report-metrics";
import { ReportPreviewButton } from "@/components/ReportPreview";
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

const LEGACY: Record<string, string> = { followers: "Seguidores", new_followers: "Novos seguidores", reach: "Alcance", impressions: "Impressões", engagement: "Engajamento", likes: "Curtidas", comments: "Comentários", shares: "Compartilhamentos", saves: "Salvamentos", profile_visits: "Visitas ao perfil", link_clicks: "Cliques no link", posts: "Publicações" };

function distribute(total: number): Record<string, string> {
  const ws = METRICS.map((m) => m.w * (1 + (Math.random() * 0.4 - 0.2)));
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
  const wsum = others.reduce((a, m) => a + m.w, 0);
  let rest = total - v; const out: Record<string, string> = { ...cur, [key]: String(v) };
  others.forEach((m, i) => {
    const n = i === others.length - 1 ? rest : Math.floor(((total - v) * m.w) / wsum);
    if (i < others.length - 1) rest -= n;
    out[m.key] = String(Math.max(0, n));
  });
  return out;
}

function GroupCharts({ metrics }: { metrics: Record<string, unknown> }) {
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
  metrics: Record<string, unknown>; notes: string | null; released: boolean; created_at: string;
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
      <Tabs defaultValue={sub.first(staff ? "dashboard" : "cliente")} key={String(staff) + sub.ready}>
        <TabsList>
          {staff && sub.can("dashboard") && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
          {sub.can("cliente") && <TabsTrigger value="cliente">Cliente</TabsTrigger>}
          {staff && sub.can("adm") && <TabsTrigger value="adm">Adm</TabsTrigger>}
        </TabsList>
        {staff && <TabsContent value="dashboard" className="mt-6"><DashboardView /></TabsContent>}
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
  const x = getExtra(r.metrics);
  const hasNew = METRICS.some((m) => r.metrics[m.key] !== undefined);
  const total = METRICS.reduce((a, m) => a + num(r.metrics[m.key]), 0) || 1;
  const legacy = Object.entries(LEGACY).filter(([k]) => r.metrics[k] !== undefined && r.metrics[k] !== "");
  const cities = (x.cities ?? []).filter((c) => c.name);
  const ages = (x.ages ?? []).filter((a) => a.f || a.m);
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex flex-wrap items-start gap-3">
        <FileBarChart className="mt-1 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{r.title}</h3>
          <p className="text-sm text-muted-foreground">
            {r.network}{r.period ? ` · ${r.period}` : ""}{clientName ? ` · ${clientName}` : ""} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportPreviewButton r={r} clientName={clientName} />
          {actions}
        </div>
      </div>
      {hasNew && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {METRICS.filter((m) => r.metrics[m.key] !== undefined).map((m) => {
            const v = num(r.metrics[m.key]); const g = x.growth?.[m.key];
            return (
              <div key={m.key} className="rounded-lg border border-border bg-muted/30 p-3" style={{ borderLeft: `3px solid ${m.color}` }}>
                <div className="text-xs text-muted-foreground">{m.icon} {m.label}</div>
                <div className="mt-1 font-display text-xl font-semibold">{v.toLocaleString("pt-BR")}</div>
                {g && <div className={`text-xs font-semibold ${num(g) < 0 ? "text-destructive" : "text-success"}`}>{num(g) < 0 ? "↓" : "↑"} {g.replace("-", "")}%</div>}
                <div className="mt-2 h-1 rounded bg-muted"><div className="h-1 rounded" style={{ width: `${Math.min(100, (v / total) * 200)}%`, background: m.color }} /></div>
              </div>
            );
          })}
        </div>
      )}
      {legacy.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {legacy.map(([k, label]) => <div key={k} className="rounded-lg border border-border bg-muted/30 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-display text-xl font-semibold">{fmt(r.metrics[k], k === "engagement" ? "%" : undefined)}</div></div>)}
        </div>
      )}
      <GroupCharts metrics={r.metrics} />
      {(x.stories || x.posts || cities.length > 0 || ages.length > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(x.stories || x.posts) && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-2 text-sm font-semibold">Conteúdo publicado: {num(x.stories) + num(x.posts)}</div>
              {x.contentCompare && <div className="mb-2 inline-block rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">{x.contentCompare}</div>}
              {[["Stories", num(x.stories)], ["Posts", num(x.posts)]].map(([l, v]) => (
                <div key={l} className="mb-2 text-xs">{l} <b className="float-right">{v}</b>
                  <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(Number(v) / Math.max(1, num(x.stories), num(x.posts))) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          {cities.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-2 text-sm font-semibold">Principais cidades</div>
              {cities.slice(0, 10).map((c) => (
                <div key={c.name} className="mb-1.5 text-xs">{c.name} <b className="float-right">{c.pct}%</b>
                  <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-accent" style={{ width: `${Math.min(100, num(c.pct))}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          {ages.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-2 text-sm font-semibold">Faixa etária e gênero</div>
              <div className="mb-2 flex gap-3 text-[11px] text-muted-foreground"><span className="text-primary">■ Mulheres</span><span className="text-accent">■ Homens</span></div>
              <div className="flex h-32 items-end gap-2">
                {ages.map((a) => { const mx = Math.max(1, ...ages.flatMap((z) => [num(z.f), num(z.m)])); return (
                  <div key={a.range} className="flex h-full flex-1 flex-col justify-end">
                    <div className="flex h-full items-end justify-center gap-0.5">
                      <div className="w-1/2 rounded-t bg-primary" style={{ height: `${(num(a.f) / mx) * 100}%`, minHeight: 1 }} title={`${a.f}%`} />
                      <div className="w-1/2 rounded-t bg-accent" style={{ height: `${(num(a.m) / mx) * 100}%`, minHeight: 1 }} title={`${a.m}%`} />
                    </div>
                    <span className="mt-1 text-center text-[10px] text-muted-foreground">{a.range}</span>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
      )}
      {r.notes && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{r.notes}</p>}
    </div>
  );
}

function ClientSummary({ reports }: { reports: Report[] }) {
  const last = reports[0]; const prev = reports[1];
  if (!last) return null;
  const items = [["alcanceIg", "Alcance Instagram"], ["visualizacoes", "Visualizações"], ["seguidores", "Novos seguidores"], ["interacoes", "Interações"]] as const;
  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-1 text-sm text-muted-foreground">Último relatório</div>
      <h2 className="mb-4 text-xl font-semibold">{last.title}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(([k, label]) => {
          const v = num(last.metrics[k]); const p = prev ? num(prev.metrics[k]) : 0;
          const diff = p ? Math.round(((v - p) / p) * 100) : null;
          return (
            <div key={k} className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-display text-3xl font-bold">{v.toLocaleString("pt-BR")}</div>
              {diff !== null && <div className={`text-xs font-semibold ${diff < 0 ? "text-destructive" : "text-success"}`}>{diff < 0 ? "↓" : "↑"} {Math.abs(diff)}% vs. relatório anterior</div>}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{reports.length} relatório(s) disponível(is). Use "Visualizar relatório" para imprimir ou salvar em PDF.</p>
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
  return <div className="space-y-4"><ClientSummary reports={data} />{data.map((r) => <ReportCard key={r.id} r={r} />)}</div>;
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
  const DEFAULT_NETWORKS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube"];
  const [customNetworks, setCustomNetworks] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("report-networks") ?? "[]"); } catch { return []; }
  });
  const [networks, setNetworks] = useState<string[]>(["Instagram"]);
  const [newNetwork, setNewNetwork] = useState("");
  const allNetworks = [...DEFAULT_NETWORKS, ...customNetworks.filter((n) => !DEFAULT_NETWORKS.includes(n))];
  function toggleNetwork(n: string) {
    setNetworks((cur) => cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]);
  }
  function addNetwork() {
    const n = newNetwork.trim();
    if (!n) return;
    if (allNetworks.some((x) => x.toLowerCase() === n.toLowerCase())) { setNetworks((cur) => cur.includes(n) ? cur : [...cur, n]); setNewNetwork(""); return; }
    const next = [...customNetworks, n];
    setCustomNetworks(next);
    localStorage.setItem("report-networks", JSON.stringify(next));
    setNetworks((cur) => [...cur, n]);
    setNewNetwork("");
  }
  function removeCustomNetwork(n: string) {
    const next = customNetworks.filter((x) => x !== n);
    setCustomNetworks(next);
    localStorage.setItem("report-networks", JSON.stringify(next));
    setNetworks((cur) => cur.filter((x) => x !== n));
  }
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [extra, setExtra] = useState<ReportExtra>(emptyExtra);
  const setX = (p: Partial<ReportExtra>) => setExtra((e) => ({ ...e, ...p }));
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const nameOf = (id: string) => { const c = clients.find((x) => x.id === id); return c ? c.full_name || c.email || "" : ""; };

  async function save(release: boolean) {
    if (!clientId || !title.trim()) return toast.error("Escolha o cliente e dê um título");
    if (networks.length === 0) return toast.error("Escolha pelo menos uma rede social");
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(metrics).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
    const x: ReportExtra = { ...extra, cities: extra.cities?.filter((c) => c.name.trim()), countries: extra.countries?.filter((c) => c.name.trim()), ages: extra.ages?.filter((a) => a.f || a.m) };
    const { error } = await supabase.from("reports").insert({ client_id: clientId, title, period: period || null, network: networks.join(", "), metrics: { ...clean, _x: x } as never, notes: notes || null, released: release });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(release ? "Relatório liberado para o cliente" : "Relatório salvo como rascunho");
    setTitle(""); setPeriod(""); setMetrics({}); setNotes(""); setTotal(""); setExtra(emptyExtra()); setNetworks(["Instagram"]);
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
        </div>
        <div className="space-y-1.5">
          <Label>Redes sociais (marque uma ou mais)</Label>
          <div className="flex flex-wrap gap-2">
            {allNetworks.map((n) => {
              const on = networks.includes(n);
              const custom = !DEFAULT_NETWORKS.includes(n);
              return (
                <div key={n} className="flex items-center">
                  <button type="button" onClick={() => toggleNetwork(n)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {n}
                  </button>
                  {custom && (
                    <button type="button" onClick={() => removeCustomNetwork(n)} title="Remover rede" className="-ml-1.5 rounded-full p-0.5 text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input value={newNetwork} onChange={(e) => setNewNetwork(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNetwork(); } }} placeholder="Adicionar outra rede (ex: Pinterest)" />
            <Button type="button" variant="secondary" onClick={addNetwork}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
          <Label>Número total geral da campanha</Label>
          <div className="flex gap-2">
            <Input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} placeholder="Ex: 25000" />
            <Button type="button" variant="secondary" onClick={() => { const t = Number(total); if (!t) return toast.error("Insira um total válido"); setMetrics(distribute(t)); setX({ ages: genAges(60) }); toast.success("Métricas e faixa etária geradas (60% homens / 40% mulheres — ajuste a divisão na seção 6. Público)"); }}>Distribuir tudo</Button>
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
                  <div className="flex gap-1"><Input className="flex-1" inputMode="numeric" value={metrics[k] ?? ""} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ""); const t = Number(total); setMetrics(t && raw !== "" ? redistribute(t, k, Number(raw), metrics) : { ...metrics, [k]: raw }); }} />
                    <Input className="w-16 px-2 text-xs" placeholder="↑ %" title="Variação em % (ex: 100 ou -5)" value={extra.growth?.[k] ?? ""} onChange={(e) => setX({ growth: { ...extra.growth, [k]: e.target.value.replace(/[^\d,.-]/g, "") } })} /></div>
                </div>
              ); })}
            </div>
          </div>
        ))}
        {Object.keys(metrics).length > 0 && <GroupCharts metrics={metrics} />}
        <ExtraFields extra={extra} setX={setX} />
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

function PctList({ label, rows, onChange, placeholder }: { label: string; rows: PctRow[]; onChange: (r: PctRow[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {rows.map((c, i) => (
        <div key={i} className="flex gap-1">
          <Input className="flex-1" value={c.name} placeholder={placeholder} onChange={(e) => onChange(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
          <Input className="w-20" value={c.pct} placeholder="%" onChange={(e) => onChange(rows.map((x, j) => j === i ? { ...x, pct: e.target.value.replace(/[^\d,.]/g, "") } : x))} />
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...rows, { name: "", pct: "" }])}><Plus className="h-3 w-3" /> Adicionar</Button>
    </div>
  );
}

function countriesFromCities(cities: { name: string; pct: string }[]) {
  const named = cities.filter((c) => c.name.trim());
  if (!named.length) return [{ name: "Brasil", pct: "" }];
  const toNum = (s: string) => Number(String(s).replace(",", ".")) || 0;
  const total = named.reduce((s, c) => s + toNum(c.pct), 0);
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  const br = Math.min(100, total > 0 ? total : 100);
  const rows = [{ name: "Brasil", pct: fmt(br) }];
  if (br < 100) rows.push({ name: "Outros", pct: fmt(100 - br) });
  return rows;
}

function ExtraFields({ extra, setX }: { extra: ReportExtra; setX: (p: Partial<ReportExtra>) => void }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-xs font-semibold text-muted-foreground">5. Conteúdo publicado</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Stories</Label><Input inputMode="numeric" value={extra.stories ?? ""} onChange={(e) => setX({ stories: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="space-y-1"><Label className="text-xs">Posts</Label><Input inputMode="numeric" value={extra.posts ?? ""} onChange={(e) => setX({ posts: e.target.value.replace(/\D/g, "") })} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Comparação (selo verde)</Label><Input value={extra.contentCompare ?? ""} placeholder="+100,0% x 24 de nov a 21 de fev" onChange={(e) => setX({ contentCompare: e.target.value })} /></div>
      <div className="space-y-1">
        <Label className="text-xs">Comparação com outras empresas (percentis)</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["p25", "p50", "p75"] as const).map((k) => <Input key={k} inputMode="numeric" placeholder={`${k.slice(1)}° percentil`} value={extra[k] ?? ""} onChange={(e) => setX({ [k]: e.target.value.replace(/\D/g, "") })} />)}
        </div>
      </div>
      <div className="text-xs font-semibold text-muted-foreground">6. Público</div>
      <CitySearch rows={extra.cities ?? []} onChange={(cities) => setX({ cities, countries: countriesFromCities(cities) })} />
      <PctList label="Cidades escolhidas (ajuste o %)" placeholder="Cáceres, MT" rows={extra.cities ?? []} onChange={(cities) => setX({ cities, countries: countriesFromCities(cities) })} />
      <PctList label="Principais países" placeholder="Brasil" rows={extra.countries ?? []} onChange={(countries) => setX({ countries })} />
      <GenderAges extra={extra} setX={setX} />
      <div className="space-y-1"><Label className="text-xs">Gerado por (usuário)</Label><Input value={extra.generatedBy ?? ""} placeholder="JEAN CARLO" onChange={(e) => setX({ generatedBy: e.target.value })} /></div>
    </div>
  );
}

const AGE_W = [0.06, 0.28, 0.38, 0.2, 0.06, 0.02];
function genAges(malePct = 60) {
  const mTotal = Math.max(0, Math.min(100, malePct));
  const r = (total: number) => {
    if (total <= 0) return AGE_W.map(() => 0);
    const ws = AGE_W.map((w) => w * (1 + (Math.random() * 0.3 - 0.15)));
    const sum = ws.reduce((a, b) => a + b, 0);
    const out = ws.map((w) => Math.round((total * w) / sum));
    out[2] += total - out.reduce((a, b) => a + b, 0);
    return out;
  };
  const m = r(mTotal), f = r(100 - mTotal);
  return ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((range, i) => ({ range, f: String(f[i]), m: String(m[i]) }));
}

function GenderAges({ extra, setX }: { extra: ReportExtra; setX: (p: Partial<ReportExtra>) => void }) {
  const [malePct, setMalePct] = useState("60");
  const generate = () => {
    const m = Math.max(0, Math.min(100, Number(malePct) || 0));
    setX({ ages: genAges(m) });
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Faixa etária e gênero (%) — escolha a divisão e gere</Label>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1"><Label className="text-[11px]">Homens</Label><Input inputMode="numeric" value={malePct} onChange={(e) => setMalePct(e.target.value.replace(/\D/g, ""))} placeholder="60" /></div>
        <div className="flex-1 space-y-1"><Label className="text-[11px]">Mulheres</Label><Input readOnly tabIndex={-1} className="text-muted-foreground" value={Math.max(0, 100 - (Number(malePct) || 0)) + "%"} /></div>
        <Button type="button" size="sm" variant="secondary" onClick={generate}>Gerar</Button>
      </div>
      <div className="grid grid-cols-[60px_1fr_1fr] gap-1 text-[11px] text-muted-foreground"><span>Idade</span><span>Mulheres</span><span>Homens</span></div>
      {(extra.ages ?? []).map((a, i) => (
        <div key={a.range} className="grid grid-cols-[60px_1fr_1fr] items-center gap-1">
          <span className="text-xs">{a.range}</span>
          {(["f", "m"] as const).map((g) => <Input key={g} className="h-8" value={a[g]} onChange={(e) => setX({ ages: (extra.ages ?? []).map((z, j) => j === i ? { ...z, [g]: e.target.value.replace(/[^\d,.]/g, "") } : z) })} />)}
        </div>
      ))}
    </div>
  );
}

type City = { n: string; uf: string };
let cityCache: Promise<City[]> | null = null;
function loadCities() {
  cityCache ??= fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado")
    .then((r) => r.json())
    .then((d: Record<string, string>[]) => d.map((c) => ({ n: c["municipio-nome"], uf: c["UF-sigla"] })))
    .catch(() => { cityCache = null; return []; });
  return cityCache;
}
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const AUTO_PCT = [48.4, 8.6, 3.9, 2.3, 2.3, 2.3, 1.6, 1.6, 1.6, 1.6];

function CitySearch({ rows, onChange }: { rows: PctRow[]; onChange: (r: PctRow[]) => void }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const chosen = rows.filter((r) => r.name.trim());
  const base = chosen[0]?.name.split(", ")[1];
  async function ensure() { if (all.length) return; setLoading(true); setAll(await loadCities()); setLoading(false); }
  const has = (c: City) => chosen.some((r) => r.name === `${c.n}, ${c.uf}`);
  const list = q.trim().length >= 2
    ? all.filter((c) => norm(c.n).includes(norm(q.trim())) && !has(c)).slice(0, 8)
    : base ? all.filter((c) => c.uf === base && !has(c)).slice(0, 12) : [];
  function add(c: City) {
    const next = [...chosen, { name: `${c.n}, ${c.uf}`, pct: String(AUTO_PCT[chosen.length] ?? 1).replace(".", ",") }];
    onChange(next); setQ("");
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Buscar cidades</Label>
      <Input value={q} onFocus={ensure} onChange={(e) => { setQ(e.target.value); ensure(); }} placeholder="Digite o nome da cidade (ex: Cáceres)" />
      {loading && <p className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> Carregando cidades…</p>}
      {list.length > 0 && (
        <div>
          {!q.trim() && base && <p className="mb-1 text-[11px] text-muted-foreground">Cidades próximas ({base}) — clique para adicionar:</p>}
          <div className="flex flex-wrap gap-1.5">
            {list.map((c) => (
              <button key={c.n + c.uf} type="button" onClick={() => add(c)} className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-primary hover:text-primary">
                + {c.n}, {c.uf}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
