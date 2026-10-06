import { useSubTabs } from "@/lib/access";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContentEditor } from "@/components/ContentEditor";

export const Route = createFileRoute("/_authenticated/criar")({
  head: () => ({
    meta: [
      { title: "Criar Conteúdo — Contatus AI" },
      { name: "description", content: "Crie posts individuais ou lotes de 7 e 30 dias." },
      { property: "og:title", content: "Criar Conteúdo — Contatus AI" },
      { property: "og:description", content: "Crie posts individuais ou lotes de 7 e 30 dias." },
    ],
  }),
  component: Criar,
});

const PRESETS = [
  { id: "post7", label: "Post 7 dias", days: 7, format: "feed" },
  { id: "car7", label: "Carrossel 7 dias", days: 7, format: "carousel" },
  { id: "post30", label: "Post 30 dias", days: 30, format: "feed" },
  { id: "car30", label: "Carrossel 30 dias", days: 30, format: "carousel" },
];

function Criar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [key, setKey] = useState(0);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [client, setClient] = useState("");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);

  async function createBatch() {
    setCreating(true);
    const batch_id = crypto.randomUUID();
    const batch_label = label || `${preset.label}${client ? ` · ${client}` : ""}`;
    const rows = Array.from({ length: preset.days }, (_, i) => ({
      title: `${batch_label} — Dia ${i + 1}`,
      kind: preset.format === "carousel" ? "carousel" : "post",
      format: preset.format,
      batch_id,
      batch_label,
      day_number: i + 1,
      client_name: client || null,
    }));
    const { error } = await supabase.from("contents").insert(rows);
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success(`Lote com ${preset.days} conteúdos criado. Preencha cada dia em Arquivos.`);
    qc.invalidateQueries({ queryKey: ["contents"] });
    navigate({ to: "/arquivos" });
  }

  const sub = useSubTabs("/criar");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Criar conteúdo</h1>
        <p className="text-muted-foreground">Insira suas artes e legendas e veja como ficam no Instagram.</p>
      </div>
      <Tabs defaultValue={sub.first("single")} key={String(sub.ready)}>
        <TabsList>
          {sub.can("single") && <TabsTrigger value="single">Post individual</TabsTrigger>}
          {sub.can("batch") && <TabsTrigger value="batch">Gerador em lote</TabsTrigger>}
        </TabsList>
        <TabsContent value="single" className="mt-6">
          <ContentEditor
            key={key}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["contents"] });
              setKey((k) => k + 1);
            }}
          />
        </TabsContent>
        <TabsContent value="batch" className="mt-6">
          <div className="glass max-w-3xl space-y-6 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p)}
                  className={`rounded-xl border p-4 text-left transition-colors ${preset.id === p.id ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/50"}`}
                >
                  <Layers className="h-5 w-5 text-primary" />
                  <div className="mt-2 font-semibold">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.days} conteúdos</div>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Cliente</Label><Input value={client} onChange={(e) => setClient(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Nome do lote (opcional)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Campanha Outubro" /></div>
            </div>
            <p className="text-sm text-muted-foreground">
              Serão criados {preset.days} rascunhos numerados por dia. Depois é só abrir cada um em Arquivos para enviar a arte e a legenda.
            </p>
            <Button variant="neon" onClick={createBatch} disabled={creating}>
              {creating && <Loader2 className="animate-spin" />} Criar lote
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
