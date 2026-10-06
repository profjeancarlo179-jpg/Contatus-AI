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
  if (access && access.role !== "master") return <p className="text-muted-foreground">Somente o Adm Master acessa o Financeiro.</p>;
  const sub = useSubTabs("/financeiro");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Gere faturas para os clientes e libere quando estiverem prontas.</p>
      </div>
      <Tabs defaultValue={sub.first("gerar")} key={String(sub.ready)}>
        <TabsList>{sub.can("gerar") && <TabsTrigger value="gerar">Gerar fatura</TabsTrigger>}{sub.can("servicos") && <TabsTrigger value="servicos">Serviços</TabsTrigger>}</TabsList>
        <TabsContent value="gerar" className="mt-6"><GerarFatura /></TabsContent>
        <TabsContent value="servicos" className="mt-6"><ServicesCatalog /></TabsContent>
      </Tabs>
    </div>
  );
}

function GerarFatura() {
  const qc = useQueryClient();
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
  const nameOf = (id: string) => { const c = clients.find((x) => x.id === id); return c?.full_name || c?.email || "Cliente"; };

  async function create(release: boolean) {
    const value = Number(amount.replace(",", "."));
    if (!clientId) return toast.error("Escolha o cliente");
    if (!description.trim()) return toast.error("Informe a descrição");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Informe um valor válido");
    setSaving(true);
    const { error } = await supabase.from("invoices").insert({
      client_id: clientId, description: description.trim(), amount: value,
      due_date: due || null, notes: notes.trim() || null, released: release,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(release ? "Fatura gerada e liberada" : "Fatura salva como rascunho");
    setDescription(""); setAmount(""); setDue(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  async function toggle(i: Invoice) {
    const { error } = await supabase.from("invoices").update({ released: !i.released }).eq("id", i.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  async function setStatus(i: Invoice, status: string) {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", i.id);
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
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Escolha o cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
            </SelectContent>
          </Select>
          {clients.length === 0 && <p className="text-xs text-muted-foreground">Nenhum usuário com perfil Cliente ainda.</p>}
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Gestão de Instagram — Outubro" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Valor (R$)</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
          <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
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
