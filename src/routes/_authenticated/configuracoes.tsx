import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard, ImageIcon, Instagram, KeyRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail } from "lucide-react";
import { isStaff, useAccess } from "@/lib/access";
import { PaymentSettingsForm } from "@/components/PaymentSettingsForm";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Contatus AI" },
      { name: "description", content: "Integrações de IA e APIs do Contatus AI." },
      { property: "og:title", content: "Configurações — Contatus AI" },
      { property: "og:description", content: "Integrações de IA e APIs do Contatus AI." },
    ],
  }),
  component: Configuracoes,
});

const INTEGRATIONS = [
  { icon: Sparkles, name: "IA de texto (análise de perfil)", desc: "Usada na auditoria de perfis.", connected: true },
  { icon: ImageIcon, name: "IA de imagem", desc: "Gera artes a partir de uma descrição na aba Criação.", connected: false },
  { icon: Clapperboard, name: "IA de vídeo", desc: "Gera vídeos curtos (Reels/Stories) a partir de texto.", connected: false },
  { icon: Instagram, name: "API da Meta (Instagram)", desc: "Métricas reais e publicação direta.", connected: false },
];

function Configuracoes() {
  const { data: access } = useAccess();
  if (!isStaff(access?.role)) return <div className="glass rounded-xl p-8 text-center text-muted-foreground">Apenas Adm pode acessar.</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Integrações de IA e chaves de acesso. As chaves ficam guardadas com segurança, nunca no navegador.</p>
      </div>
      <Tabs defaultValue="ia">
      <TabsList>
        <TabsTrigger value="ia">Configurações de IA</TabsTrigger>
        {access?.role === "master" && <TabsTrigger value="pagamento">Configurações de pagamento</TabsTrigger>}
        <TabsTrigger value="email">Configurações de e-mail</TabsTrigger>
      </TabsList>
      <TabsContent value="ia" className="mt-4">
      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="glass flex flex-col gap-4 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><i.icon className="h-5 w-5 text-primary" /></span>
              <div className="flex-1">
                <div className="font-semibold">{i.name}</div>
                <div className="text-sm text-muted-foreground">{i.desc}</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${i.connected ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                {i.connected ? "Ativa" : "Pendente"}
              </span>
            </div>
            {!i.connected && <Button variant="outline" disabled><KeyRound /> Configurar chave (em breve)</Button>}
          </div>
        ))}
      </div>
      </TabsContent>
      {access?.role === "master" && <TabsContent value="pagamento" className="mt-4"><PaymentSettingsForm /></TabsContent>}
      <TabsContent value="email" className="mt-4">
        <div className="glass flex items-start gap-3 rounded-xl p-6">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15"><Mail className="h-5 w-5 text-primary" /></span>
          <div className="flex-1">
            <div className="font-semibold">Envio de e-mails</div>
            <div className="text-sm text-muted-foreground">Hoje o "Enviar por e-mail" abre o seu programa de e-mail com a mensagem pronta. O envio automático (links de aprovação, faturas, contratos) pode ser configurado aqui.</div>
          </div>
          <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs text-warning">Pendente</span>
        </div>
      </TabsContent>
      </Tabs>
    </div>
  );
}
