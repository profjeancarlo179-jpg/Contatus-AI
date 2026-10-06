import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Package, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Kind = "servico" | "produto" | "pacote";
export type CatalogItem = {
  id: string; kind: Kind; name: string; description: string | null; price: number; item_ids: string[]; active: boolean;
};
const KIND_LABEL: Record<Kind, string> = { servico: "Serviço", produto: "Produto", pacote: "Pacote" };
const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ServicesCatalog() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["catalog_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("servico");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const singles = items.filter((i) => i.kind !== "pacote");
  const sum = singles.filter((i) => picked.includes(i.id)).reduce((a, i) => a + Number(i.price), 0);

  function reset() { setEditId(null); setKind("servico"); setName(""); setDescription(""); setPrice(""); setPicked([]); }
  function edit(i: CatalogItem) {
    setEditId(i.id); setKind(i.kind); setName(i.name); setDescription(i.description ?? "");
    setPrice(String(i.price).replace(".", ",")); setPicked(i.item_ids);
  }

  async function save() {
    const value = Number(price.replace(",", ".") || (kind === "pacote" ? String(sum) : "0"));
    if (!name.trim()) return toast.error("Informe o nome");
    if (!Number.isFinite(value) || value < 0) return toast.error("Informe um preço válido");
    if (kind === "pacote" && picked.length < 2) return toast.error("Escolha pelo menos 2 itens para o pacote");
    setSaving(true);
    const row = { kind, name: name.trim(), description: description.trim() || null, price: value, item_ids: kind === "pacote" ? picked : [] };
    const { error } = editId
      ? await supabase.from("catalog_items").update(row).eq("id", editId)
      : await supabase.from("catalog_items").insert(row);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Atualizado" : "Cadastrado");
    reset();
    qc.invalidateQueries({ queryKey: ["catalog_items"] });
  }
  async function remove(i: CatalogItem) {
    if (!confirm(`Excluir "${i.name}"?`)) return;
    const { error } = await supabase.from("catalog_items").delete().eq("id", i.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["catalog_items"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="glass space-y-4 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Package className="h-5 w-5 text-primary" /> {editId ? "Editar item" : "Novo cadastro"}</h2>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm ${kind === k ? "bg-primary/20 text-foreground ring-1 ring-primary/40" : "text-muted-foreground"}`}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "pacote" ? "Ex.: Pacote Completo" : "Ex.: Gestão de Instagram"} /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        {kind === "pacote" && (
          <div className="space-y-1.5">
            <Label>Itens do pacote</Label>
            {singles.length === 0 && <p className="text-xs text-muted-foreground">Cadastre serviços ou produtos primeiro.</p>}
            <div className="max-h-56 space-y-1 overflow-auto">
              {singles.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox checked={picked.includes(i.id)} onCheckedChange={(c) => setPicked((p) => c ? [...p, i.id] : p.filter((x) => x !== i.id))} />
                  <span className="flex-1">{i.name} <span className="text-xs text-muted-foreground">({KIND_LABEL[i.kind]})</span></span>
                  <span className="text-muted-foreground">{brl(i.price)}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Soma dos itens: {brl(sum)}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Preço (R$)</Label>
          <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={kind === "pacote" ? `Vazio = ${brl(sum)}` : "0,00"} />
        </div>
        <div className="flex gap-2">
          {editId && <Button variant="outline" onClick={reset}>Cancelar</Button>}
          <Button variant="neon" disabled={saving} onClick={save}>{saving && <Loader2 className="animate-spin" />} {editId ? "Salvar alterações" : "Cadastrar"}</Button>
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Cadastrados</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço, produto ou pacote ainda.</p>}
        {items.map((i) => (
          <div key={i.id} className="glass rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{KIND_LABEL[i.kind]}</span>
                <p className="mt-1 font-semibold">{i.name}</p>
                {i.description && <p className="text-sm text-muted-foreground">{i.description}</p>}
              </div>
              <p className="font-display text-xl font-bold">{brl(i.price)}</p>
            </div>
            {i.kind === "pacote" && (
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {i.item_ids.map((id) => { const s = items.find((x) => x.id === id); return s ? <li key={id}>{s.name}</li> : null; })}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(i)}><Pencil /> Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
