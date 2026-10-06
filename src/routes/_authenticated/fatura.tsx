import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceCard, type Invoice } from "@/components/InvoiceCard";

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
  document.body.dataset.printInvoice = id;
  const el = document.querySelector(`[data-invoice="${id}"]`);
  el?.classList.add("printing");
  const done = () => { el?.classList.remove("printing"); delete document.body.dataset.printInvoice; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}

function Fatura() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", "mine"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("invoices").select("*")
        .eq("client_id", u.user!.id).eq("released", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fatura</h1>
        <p className="text-muted-foreground">Faturas liberadas para você pelo Adm Master.</p>
      </div>
      {!isLoading && invoices.length === 0 && <div className="glass rounded-xl p-8 text-center text-muted-foreground">Nenhuma fatura liberada.</div>}
      <div className="space-y-3">{invoices.map((i) => <div key={i.id} data-invoice={i.id}><InvoiceCard i={i} actions={<Button variant="outline" size="sm" className="no-print" onClick={() => printInvoice(i.id)}><Printer /> Reimprimir fatura</Button>} /></div>)}</div>
    </div>
  );
}
