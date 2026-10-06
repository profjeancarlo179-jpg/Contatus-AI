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
import { contractTemplate, EMPTY_CONTRACT, type ContractFields } from "@/lib/contract-template";

type Client = { id: string; name: string; resp_name: string | null; resp_email: string | null; resp_phone: string | null; resp_document: string | null; segment: string | null };
type Contract = { id: string; client_name: string; title: string; status: string; share_token: string; signed_name: string | null; signed_at: string | null; created_at: string };
type Item = { id: string; kind: string; name: string; price: number; item_ids: string[] };

export const contractUrl = (token: string) => `https://contatus-ai.lovable.app/c/${token}`;

export function ContractsTab() {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-contract"],
    queryFn: async () => ((await supabase.from("clients").select("id,name,resp_name,resp_email,resp_phone,resp_document,segment").order("name")).data ?? []) as Client[],
  });
  const { data: catalog = [] } = useQuery({
    queryKey: ["catalog_items"],
    queryFn: async () => ((await supabase.from("catalog_items").select("*")).data ?? []) as Item[],
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
  const [f, setF] = useState<ContractFields>(EMPTY_CONTRACT);
  const [title, setTitle] = useState("Contrato de Prestação de Serviços");
  const [body, setBody] = useState(contractTemplate(EMPTY_CONTRACT));
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<ContractFields>) {
    const next = { ...f, ...patch };
    setF(next);
    setBody(contractTemplate(next));
  }
  function pickClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) update({ name: c.resp_name || c.name, company: c.name, document: c.resp_document || "", email: c.resp_email || "", phone: c.resp_phone || "" });
  }
  function pickPackage(id: string) {
    const p = catalog.find((x) => x.id === id);
    if (!p) return;
    const names = p.kind === "pacote" ? catalog.filter((x) => p.item_ids?.includes(x.id)).map((x) => x.name).join(", ") : p.name;
    const amt = Number(p.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const pen = (Number(p.price) * 0.1).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    update({ packageName: p.name, amount: amt, items: names, penalty: pen });
  }

  async function create() {
    if (!f.name.trim()) return toast.error("Informe o nome do contratante");
    if (!title.trim() || !body.trim()) return toast.error("Preencha título e texto");
    setSaving(true);
    const { data, error } = await (supabase as any).from("contracts").insert({
      client_id: null, client_name: f.name.trim(), client_email: f.email.trim() || null, title: title.trim(), body,
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
  const field = (k: keyof ContractFields, label: string, ph = "") => (
    <div className="space-y-1.5"><Label>{label}</Label><Input placeholder={ph} value={f[k]} onChange={(e) => update({ [k]: e.target.value })} /></div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="glass space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><FileSignature className="h-5 w-5 text-primary" /> Gerar contrato</h2>
        <div className="space-y-1.5">
          <Label>Cliente cadastrado (preenche os dados)</Label>
          <Select value={clientId} onValueChange={pickClient}>
            <SelectTrigger><SelectValue placeholder="Escolha o cliente" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <p className="text-sm font-semibold text-primary">Contratante</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Nome", "Anderson Gonçalves")}
          {field("company", "Razão social")}
          {field("document", "CPF/CNPJ")}
          {field("phone", "Telefone")}
          {field("email", "E-mail")}
          {field("qualification", "Nacionalidade • Profissão")}
        </div>
        {field("address", "Endereço", "Rua, nº, bairro, cidade, UF")}
        <p className="text-sm font-semibold text-primary">Objeto do contrato</p>
        <div className="space-y-1.5">
          <Label>Pacote / serviço do catálogo</Label>
          <Select onValueChange={pickPackage}>
            <SelectTrigger><SelectValue placeholder="Escolha (opcional)" /></SelectTrigger>
            <SelectContent>{catalog.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {field("packageName", "Pacote")}
          {field("amount", "Valor total (R$)", "550,00")}
          {field("penalty", "Multa rescisória (R$)", "55,00")}
        </div>
        <div className="space-y-1.5"><Label>Itens inclusos</Label><Textarea rows={2} value={f.items} onChange={(e) => update({ items: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Texto completo (pode ajustar)</Label><Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} /></div>
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
