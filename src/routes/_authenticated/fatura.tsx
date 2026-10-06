import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      <div className="space-y-3">{invoices.map((i) => <InvoiceCard key={i.id} i={i} />)}</div>
    </div>
  );
}
