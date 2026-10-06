import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, Layers, PenSquare, Smartphone, XCircle, LineChart } from "lucide-react";
import { fetchContents, FORMAT_LABEL } from "@/lib/content";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Início — Contatus AI" },
      { name: "description", content: "Visão geral dos seus conteúdos e aprovações." },
      { property: "og:title", content: "Início — Contatus AI" },
      { property: "og:description", content: "Visão geral dos seus conteúdos e aprovações." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data = [] } = useQuery({ queryKey: ["contents"], queryFn: fetchContents });
  const count = (s: string) => data.filter((c) => c.status === s).length;
  const batches = new Set(data.filter((c) => c.batch_id).map((c) => c.batch_id)).size;
  const stats = [
    { label: "Conteúdos", value: data.length, icon: FileText, cls: "text-neon-blue" },
    { label: "Aguardando cliente", value: count("pending"), icon: Clock, cls: "text-warning" },
    { label: "Aprovados", value: count("approved"), icon: CheckCircle2, cls: "text-success" },
    { label: "Reprovados", value: count("rejected"), icon: XCircle, cls: "text-destructive" },
    { label: "Lotes", value: batches, icon: Layers, cls: "text-neon" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Visão geral</h1>
        <p className="text-muted-foreground">Acompanhe sua produção e as aprovações dos clientes.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-xl p-5">
            <s.icon className={`h-5 w-5 ${s.cls}`} />
            <div className="mt-3 font-display text-3xl font-semibold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { to: "/criar", t: "Criar conteúdo", d: "Post individual ou lote de 7/30 dias", i: PenSquare },
          { to: "/aprovacao", t: "Enviar para aprovação", d: "Simule no Instagram e gere o link", i: Smartphone },
          { to: "/analise", t: "Auditar perfil", d: "Análise estratégica com IA", i: LineChart },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="glass group rounded-xl p-5 transition-shadow hover:shadow-glow">
            <a.i className="h-5 w-5 text-primary" />
            <div className="mt-3 font-semibold">{a.t}</div>
            <div className="text-sm text-muted-foreground">{a.d}</div>
          </Link>
        ))}
      </div>
      <div className="glass rounded-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Conteúdos recentes</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/arquivos">Ver todos</Link></Button>
        </div>
        {data.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum conteúdo ainda. Comece em “Criar Conteúdo”.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{FORMAT_LABEL[c.format]}{c.client_name ? ` · ${c.client_name}` : ""}</div>
                </div>
                <StatusBadge status={c.status} auto={c.auto_approved} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
