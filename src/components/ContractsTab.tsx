import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, ExternalLink, FileSignature, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Client = { id: string; email: string | null; full_name: string | null };
type Contract = { id: string; client_name: string; title: string; status: string; share_token: string; signed_name: string | null; signed_at: string | null; created_at: string };

const TEMPLATE = (name: string) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: ${name || "[nome do cliente]"}, CPF/CNPJ: [documento].
CONTRATADA: Contatus AI.

1. OBJETO
A CONTRATADA prestará serviços de [descreva os serviços].

2. VALOR E PAGAMENTO
O valor mensal é de R$ [valor], com vencimento todo dia [dia].

3. PRAZO
Este contrato tem vigência de [prazo] a partir da assinatura.

4. RESCISÃO
Qualquer parte pode rescindir com aviso prévio de 30 dias.

Ao assinar digitalmente, as partes concordam com todos os termos acima.`;

export const contractUrl = (token: string) => `https://contatus-ai.lovable.app/c/${token}`;

export function ContractsTab() {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({
    queryKey: ["list_clients"],
    queryFn: async () => ((await supabase.rpc("list_clients")).data ?? []) as Client[],
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contracts").select("id,client_name,title,status,share_token,signed_name,signed_at,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contract[];
    },
  });
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("Contrato de prestação de serviços");
  const [body, setBody] = useState(TEMPLATE(""));
  const [saving, setSaving] = useState(false);

  function pickClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    const n = c?.full_name || c?.email || "";
    setClientName(n);
    setBody((b) => b.replace(/CONTRATANTE: [^,]*,/, `CONTRATANTE: ${n},`));
  }

  async function create() {
    if (!clientName.trim()) return toast.error("Informe o nome do cliente");
    if (!title.trim() || !body.trim()) return toast.error("Preencha título e texto");
    setSaving(true);
    const c = clients.find((x) => x.id === clientId);
    const { data, error } = await (supabase as any).from("contracts").insert({
      client_id: clientId || null, client_name: clientName.trim(), client_email: c?.email ?? null, title: title.trim(), body,
    }).select("share_token").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    await navigator.clipboard?.writeText(contractUrl(data.share_token)).catch(() => {});
    toast.success("Contrato gerado! Link copiado.");
    qc.invalidateQueries({ queryKey: ["contracts"] });
  }
  async function remove(c: Contract) {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await (supabase as any).from("contracts").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contracts"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
      <div className="glass space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><FileSignature className="h-5 w-5 text-primary" /> Gerar contrato</h2>
        <div className="space-y-1.5">
          <Label>Cliente cadastrado (opcional)</Label>
          <Select value={clientId} onValueChange={pickClient}>
            <SelectTrigger><SelectValue placeholder="Escolha o cliente" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Nome do cliente</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Texto do contrato</Label><Textarea rows={16} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <Button variant="neon" disabled={saving} onClick={create}>{saving && <Loader2 className="animate-spin" />} Gerar link de assinatura</Button>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Contratos</h2>
        {contracts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contrato ainda.</p>}
        {contracts.map((c) => (
          <div key={c.id} className="glass rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.client_name} · Gerado em {new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                {c.signed_at && <p className="mt-1 text-xs text-success">Assinado por {c.signed_name} em {new Date(c.signed_at).toLocaleString("pt-BR")}</p>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "assinado" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{c.status === "assinado" ? "Assinado" : "Aguardando assinatura"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(contractUrl(c.share_token)); toast.success("Link copiado"); }}><Copy /> Copiar link</Button>
              <Button size="sm" variant="outline" asChild><a href={`/c/${c.share_token}`} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(c)}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
