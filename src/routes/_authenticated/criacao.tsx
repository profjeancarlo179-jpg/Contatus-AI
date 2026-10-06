import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clapperboard, ImageIcon, Settings, Wand2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoEditor } from "@/components/VideoEditor";

export const Route = createFileRoute("/_authenticated/criacao")({
  head: () => ({
    meta: [
      { title: "Criação Vídeo & Imagem — Contatus AI" },
      { name: "description", content: "Gere imagens e vídeos com IA e edite vídeos para Reels e feed." },
      { property: "og:title", content: "Criação Vídeo & Imagem — Contatus AI" },
      { property: "og:description", content: "Gere imagens e vídeos com IA e edite vídeos para Reels e feed." },
    ],
  }),
  component: Criacao,
});

function Criacao() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Criação de vídeo e imagem</h1>
        <p className="text-muted-foreground">Gere mídias com IA ou edite seus vídeos para o Instagram.</p>
      </div>
      <Tabs defaultValue="imagem">
        <TabsList>
          <TabsTrigger value="imagem">Imagem</TabsTrigger>
          <TabsTrigger value="video">Vídeo</TabsTrigger>
          <TabsTrigger value="edicao">Edição de vídeo</TabsTrigger>
        </TabsList>
        <TabsContent value="imagem" className="mt-6">
          <Generator kind="imagem" formats={["Post 1:1", "Carrossel 4:5", "Stories 9:16"]} />
        </TabsContent>
        <TabsContent value="video" className="mt-6">
          <Generator kind="vídeo" formats={["Reels 9:16", "Stories 9:16", "Feed 1:1"]} />
        </TabsContent>
        <TabsContent value="edicao" className="mt-6"><VideoEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

function Generator({ kind, formats }: { kind: string; formats: string[] }) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState(formats[0]);
  const Icon = kind === "imagem" ? ImageIcon : Clapperboard;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="glass space-y-5 rounded-xl p-6">
        <div className="space-y-1.5">
          <Label>Descreva {kind === "imagem" ? "a imagem" : "o vídeo"}</Label>
          <Textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={kind === "imagem" ? "Ex: Xícara de café sobre mesa de madeira, luz da manhã, estilo editorial" : "Ex: Câmera lenta de café sendo servido, fumaça subindo, tons quentes"} />
        </div>
        <div className="space-y-1.5">
          <Label>Formato</Label>
          <div className="flex flex-wrap gap-2">
            {formats.map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-3 py-2 text-sm ${format === f ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          A geração de {kind} por IA ainda não está conectada. Configure a integração em <Link to="/configuracoes" className="font-semibold underline">Configurações</Link>.
        </div>
        <Button variant="neon" disabled><Wand2 /> Gerar {kind}</Button>
      </div>
      <div className="glass grid min-h-[420px] place-items-center rounded-xl p-6 text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-center">
          <Icon className="h-10 w-10" />
          <span className="text-sm">O resultado aparecerá aqui</span>
          <Button asChild variant="ghost" size="sm"><Link to="/configuracoes"><Settings /> Ir para Configurações</Link></Button>
        </div>
      </div>
    </div>
  );
}
