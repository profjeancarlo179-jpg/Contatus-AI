import { useSubTabs } from "@/lib/access";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServicesCatalog } from "@/components/ServicesCatalog";
import { InvoiceCard, type Invoice } from "@/components/InvoiceCard";
import { ContractsTab } from "@/components/ContractsTab";
import { InvoicePreviewButton } from "@/components/InvoicePreview";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Contatus AI" },
      { name: "description", content: "Geração e liberação de faturas para clientes." },
      { property: "og:title", content: "Financeiro — Contatus AI" },
      { property: "og:description", content: "Geração e liberação de faturas para clientes." },
    ],
  }),
  component: Financeiro,
});

type Client = { id: string; email: string | null; full_name: string | null; agency_name: string | null };

function Financeiro() {
  const { data: access } = useAccess();
  const sub = useSubTabs("/financeiro");
  if (access && access.role !== "master") return <p className="text-muted-foreground">Somente o Adm Master acessa o Financeiro.</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Gere faturas para os clientes e libere quando estiverem prontas.</p>
      </div>
      <Tabs defaultValue={sub.first("gerar")} key={String(sub.ready)}>
        <TabsList>{sub.can("gerar") && <TabsTrigger value="gerar">Gerar fatura</TabsTrigger>}{sub.can("baixa") && <TabsTrigger value="baixa">Baixa de fatura</TabsTrigger>}{sub.can("servicos") && <TabsTrigger value="servicos">Serviços</TabsTrigger>}{sub.can("contrato") && <TabsTrigger value="contrato">Contrato</TabsTrigger>}</TabsList>
        <TabsContent value="gerar" className="mt-6"><GerarFatura /></TabsContent>
        <TabsContent value="baixa" className="mt-6"><BaixaFatura /></TabsContent>
        <TabsContent value="servicos" className="mt-6"><ServicesCatalog /></TabsContent>
        <TabsContent value="contrato" className="mt-6"><ContractsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

type Reg = { id: string; name: string; company_name: string | null; company_cnpj: string | null; resp_document: string | null; user_id: string | null; user_ids: string[] };
function useRegClients() {
  return useQuery({
    queryKey: ["clients", "registered"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,name,company_name,company_cnpj,resp_document,user_id,user_ids").order("name");
      if (error) throw error;
      return (data ?? []) as Reg[];
    },
  });
}
const regUser = (r: Reg) => r.user_ids?.[0] ?? r.user_id ?? null;
const regOfUser = (regs: Reg[], uid: string) => regs.find((r) => r.user_id === uid || r.user_ids?.includes(uid));

function GerarFatura() {
  const qc = useQueryClient();
  const { data: regs = [] } = useRegClients();
  const [regId, setRegId] = useState("");
  const { data: clients = [] } = useQuery({
    queryKey: ["list_clients"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_clients");
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [batch, setBatch] = useState(false);
  const [startMonth, setStartMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [months, setMonths] = useState("12");
  const [dueDay, setDueDay] = useState("5");
  const nameOf = (id: string) => { const r = regOfUser(regs, id); if (r) return r.company_name || r.name; const c = clients.find((x) => x.id === id); return c?.full_name || c?.email || "Cliente"; };
  const docOf = (id: string) => { const r = regOfUser(regs, id); return r?.company_cnpj || r?.resp_document || undefined; };
  const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  function batchDates(): string[] {
    const [y, m] = startMonth.split("-").map(Number);
    const n = Math.min(36, Math.max(0, Math.floor(Number(months) || 0)));
    const day = Math.min(31, Math.max(1, Math.floor(Number(dueDay) || 1)));
    if (!y || !m) return [];
    return Array.from({ length: n }, (_, k) => {
      const yy = y + Math.floor((m - 1 + k) / 12), mm = ((m - 1 + k) % 12) + 1;
      const last = new Date(yy, mm, 0).getDate();
      return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
    });
  }

  async function create(release: boolean) {
    const value = Number(amount.replace(",", "."));
    if (!regId) return toast.error("Escolha o cliente");
    if (!clientId) return toast.error("Este cliente não tem usuário vinculado. Vincule em Clientes → Acesso ao app.");
    if (!description.trim()) return toast.error("Informe a descrição");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Informe um valor válido");
    const base = { client_id: clientId, amount: value, notes: notes.trim() || null, released: release };
    let rows;
    if (batch) {
      const dates = batchDates();
      if (!dates.length) return toast.error("Informe mês inicial e quantidade de meses");
      rows = dates.map((d) => {
        const [yy, mm] = d.split("-").map(Number);
        return { ...base, description: `${description.trim()} — ${MONTHS[mm - 1]}/${yy}`, due_date: d };
      });
    } else {
      rows = [{ ...base, description: description.trim(), due_date: due || null }];
    }
    setSaving(true);
    const { error } = await supabase.from("invoices").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(batch ? `${rows.length} faturas geradas${release ? " e liberadas" : " como rascunho"}` : release ? "Fatura gerada e liberada" : "Fatura salva como rascunho");
    setDescription(""); setAmount(""); setDue(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  async function toggle(i: Invoice) {
    const { error } = await supabase.from("invoices").update({ released: !i.released }).eq("id", i.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  async function setStatus(i: Invoice, status: string) {
    const { error } = await supabase.from("invoices").update({ status, paid_at: status === "paga" ? new Date().toISOString() : null } as never).eq("id", i.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  async function remove(i: Invoice) {
    if (!confirm("Excluir esta fatura?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", i.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="glass space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Receipt className="h-5 w-5 text-primary" /> Nova fatura</h2>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={regId} onValueChange={(v) => { setRegId(v); const r = regs.find((x) => x.id === v); setClientId(r ? regUser(r) ?? "" : ""); }}>
            <SelectTrigger><SelectValue placeholder="Escolha o cliente" /></SelectTrigger>
            <SelectContent>
              {regs.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}{r.company_name ? ` — ${r.company_name}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          {regs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado ainda.</p>}
          {regId && !clientId && <p className="text-xs text-destructive">Sem usuário vinculado — vincule em Clientes → Acesso ao app para o cliente ver a fatura.</p>}
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Gestão de Instagram — Outubro" /></div>
        <div className="flex gap-1 rounded-lg bg-muted/40 p-1 text-sm">
          <button type="button" onClick={() => setBatch(false)} className={`flex-1 rounded-md px-3 py-1.5 ${!batch ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Fatura única</button>
          <button type="button" onClick={() => setBatch(true)} className={`flex-1 rounded-md px-3 py-1.5 ${batch ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Em lote (mensal)</button>
        </div>
        {!batch ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Valor (R$)</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Valor mensal (R$)</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
              <div className="space-y-1.5"><Label>Dia do vencimento</Label><Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Mês inicial</Label><Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Quantidade de meses</Label><Input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} /></div>
            </div>
            {batchDates().length > 0 && (
              <p className="text-xs text-muted-foreground">Vencimentos: {batchDates().map((d) => d.split("-").reverse().join("/")).join(", ")}</p>
            )}
            <p className="text-xs text-muted-foreground">O nome do mês é adicionado à descrição de cada fatura.</p>
          </div>
        )}
        <div className="space-y-1.5"><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Chave Pix, dados bancários, detalhes…" /></div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => create(false)}>Salvar rascunho</Button>
          <Button variant="neon" disabled={saving} onClick={() => create(true)}>{saving && <Loader2 className="animate-spin" />} Gerar e liberar</Button>
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Faturas geradas</h2>
        {invoices.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fatura ainda.</p>}
        {invoices.map((i) => (
          <InvoiceCard key={i.id} i={i} clientName={nameOf(i.client_id)} actions={
            <>
              <InvoicePreviewButton i={i} clientName={nameOf(i.client_id)} clientDoc={docOf(i.client_id)} />
              <Select value={i.status} onValueChange={(v) => setStatus(i, v)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => toggle(i)}>{i.released ? <><EyeOff /> Esconder</> : <><Eye /> Liberar</>}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 /></Button>
            </>
          } />
        ))}
      </div>
    </div>
  );
}

function BaixaFatura() {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({
    queryKey: ["list_clients"],
    queryFn: async () => ((await supabase.rpc("list_clients")).data ?? []) as Client[],
  });
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  const [dates, setDates] = useState<Record<string, string>>({});
  const name = (id: string) => { const c = clients.find((x) => x.id === id); return c?.full_name || c?.email || "Cliente"; };
  const today = new Date().toISOString().slice(0, 10);
  async function pay(i: Invoice, undo = false) {
    const d = dates[i.id] || today;
    const { error } = await supabase.from("invoices").update({ status: undo ? "pendente" : "paga", paid_at: undo ? null : new Date(d + "T12:00").toISOString() } as never).eq("id", i.id);
    if (error) return toast.error("Não foi possível atualizar.");
    toast.success(undo ? "Baixa desfeita" : "Pagamento registrado");
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  const open = invoices.filter((i) => i.status === "pendente");
  const paid = invoices.filter((i) => i.status === "paga");
  if (isLoading) return <Loader2 className="animate-spin" />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="font-semibold">Aguardando pagamento ({open.length})</h2>
        {open.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fatura em aberto.</p>}
        {open.map((i) => (
          <InvoiceCard key={i.id} i={i} clientName={name(i.client_id)} actions={<>
            <Label className="text-xs">Data do pagamento</Label>
            <Input type="date" className="w-40" value={dates[i.id] || today} onChange={(e) => setDates({ ...dates, [i.id]: e.target.value })} />
            <Button variant="neon" size="sm" onClick={() => pay(i)}>Dar baixa</Button>
          </>} />
        ))}
      </div>
      <div className="space-y-3">
        <h2 className="font-semibold">Pagas ({paid.length})</h2>
        {paid.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fatura paga ainda.</p>}
        {paid.map((i) => (
          <InvoiceCard key={i.id} i={i} clientName={name(i.client_id)} actions={<Button variant="ghost" size="sm" onClick={() => pay(i, true)}>Desfazer baixa</Button>} />
        ))}
      </div>
    </div>
  );
}
