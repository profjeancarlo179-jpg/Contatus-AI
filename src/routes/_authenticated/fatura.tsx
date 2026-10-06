import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceCard, refLabels, type Invoice } from "@/components/InvoiceCard";
import { InvoicePrint, printInvoicePaper, usePaymentSettings } from "@/components/InvoicePrint";

export const Route = createFileRoute("/_authenticated/fatura")({
  head: () => ({
    meta: [
      { title: "Fatura — Contatus AI" },
      { name: "description", content: "Suas faturas liberadas pelo Adm Master." },
      { property: "og:title", content: "Fatura — Contatus AI" },
      { property: "og:description", content: "Suas faturas liberadas pelo Adm Master." },
    ],
  }),
  component: Fatura,
});

function printInvoice(id: string) {
  const el = document.querySelector(`[data-invoice="${id}"]`);
  printInvoicePaper(el as HTMLElement | null);
}

function Fatura() {
  const { data: settings } = usePaymentSettings();
  const { data: me } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("full_name, agency_name, email").eq("id", u.user!.id).maybeSingle();
      return data;
    },
  });
  const clientName = me?.agency_name || me?.full_name || me?.email || "Cliente";
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", "mine"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("invoices").select("*")
        .eq("client_id", u.user!.id).eq("released", true).order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  const [month, setMonth] = useState("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invoiceDate = (i: Invoice) => (i.due_date ? i.due_date.slice(0, 10) : (i.paid_at || i.created_at || "").slice(0, 10));
  const monthOptions = Array.from(new Set(invoices.map(invoiceDate).filter(Boolean).map((d) => d.slice(0, 7)))).sort();
  const filtered = invoices.filter((i) => {
    if (month !== "todos" && invoiceDate(i).slice(0, 7) !== month) return false;
    if (from && invoiceDate(i) < from) return false;
    if (to && invoiceDate(i) > to) return false;
    return true;
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fatura</h1>
        <p className="text-muted-foreground">Faturas liberadas para você pelo Adm Master.</p>
      </div>
      <div className="glass flex flex-wrap items-center gap-2 rounded-xl p-3 no-print">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por mês ref ou vencimento…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {monthOptions.map((m) => {
              const [y, mm] = m.split("-");
              return <SelectItem key={m} value={m}>{new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" />
        {(month !== "todos" || from || to || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setMonth("todos"); setFrom(""); setTo(""); setSearch(""); }}>Limpar</Button>
        )}
      </div>
      {!isLoading && filtered.length === 0 && <div className="glass rounded-xl p-8 text-center text-muted-foreground">{invoices.length === 0 ? "Nenhuma fatura liberada." : "Nenhuma fatura encontrada com os filtros atuais."}</div>}
      <div className="space-y-3">{filtered.map((i) => <div key={i.id} data-invoice={i.id}><InvoiceCard i={i} refLabel={refLabels(invoices)[i.id]} actions={<Button variant="outline" size="sm" className="no-print" onClick={() => printInvoice(i.id)}><Printer /> Reimprimir fatura</Button>} /><InvoicePrint i={i} s={settings} clientName={clientName} refLabel={refLabels(invoices)[i.id]} /></div>)}</div>
    </div>
  );
}
