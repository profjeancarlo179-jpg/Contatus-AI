import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePaymentSettings, type PaymentSettings } from "@/components/InvoicePrint";

const EMPTY: PaymentSettings = { company_name: "", address: "", phone: "", whatsapp: "", email: "", website: "", logo: null, pix_qr: null, instructions: "", pix_code: "", footer: "" };

function resizeLogo(file: File, max = 300): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/png"));
    };
    img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}

export function PaymentSettingsForm() {
  const { data } = usePaymentSettings();
  const qc = useQueryClient();
  const [f, setF] = useState<PaymentSettings>(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setF({ ...EMPTY, ...data }); }, [data]);
  const set = (k: keyof PaymentSettings) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("payment_settings").upsert({ id: 1, ...f, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar. Só o Adm Master pode alterar.");
    toast.success("Configurações de pagamento salvas");
    qc.invalidateQueries({ queryKey: ["payment_settings"] });
  }

  const field = (k: keyof PaymentSettings, label: string) => (
    <div className="space-y-1.5"><Label>{label}</Label><Input value={(f[k] as string) ?? ""} onChange={set(k)} /></div>
  );
  return (
    <div className="glass space-y-4 rounded-xl p-6">
      <div>
        <h2 className="text-xl font-semibold">Configurações de pagamento</h2>
        <p className="text-sm text-muted-foreground">Esses dados aparecem na fatura que o cliente imprime.</p>
      </div>
      <section className="space-y-4 rounded-lg border border-border/60 p-4">
        <h3 className="font-semibold">1. Dados da empresa</h3>
        <div className="flex items-center gap-4">
          {f.logo ? <img src={f.logo} alt="Logo" className="h-16 w-16 rounded bg-foreground/90 object-contain p-1" /> : <div className="grid h-16 w-16 place-items-center rounded bg-muted text-xs text-muted-foreground">Logo</div>}
          <Input type="file" accept="image/*" className="max-w-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, logo: await resizeLogo(file) }); }} />
          {f.logo && <Button variant="ghost" size="sm" onClick={() => setF({ ...f, logo: null })}>Remover</Button>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {field("company_name", "Nome da empresa")}
          {field("address", "Endereço")}
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-border/60 p-4">
        <h3 className="font-semibold">2. Contato</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {field("phone", "Telefone")}
          {field("whatsapp", "WhatsApp")}
          {field("email", "E-mail")}
          {field("website", "Site / rede social")}
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-border/60 p-4">
        <h3 className="font-semibold">3. Pagamento PIX</h3>
        <div className="space-y-1.5"><Label>Instruções de pagamento</Label><Textarea rows={4} value={f.instructions} onChange={set("instructions")} /></div>
        <div className="space-y-1.5"><Label>PIX copia e cola (gera o QR Code)</Label><Textarea rows={2} value={f.pix_code} onChange={set("pix_code")} /></div>
        <div className="space-y-1.5">
          <Label>Imagem do QR Code PIX (opcional — se enviar, ela é usada no lugar do QR gerado)</Label>
          <div className="flex items-center gap-4">
            {f.pix_qr ? <img src={f.pix_qr} alt="QR Code" className="h-20 w-20 rounded bg-foreground p-1 object-contain" /> : <div className="grid h-20 w-20 place-items-center rounded bg-muted text-xs text-muted-foreground">QR</div>}
            <Input type="file" accept="image/*" className="max-w-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, pix_qr: await resizeLogo(file, 600) }); }} />
            {f.pix_qr && <Button variant="ghost" size="sm" onClick={() => setF({ ...f, pix_qr: null })}>Remover</Button>}
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-border/60 p-4">
        <h3 className="font-semibold">4. Fatura</h3>
        {field("footer", "Rodapé da fatura")}
      </section>
      <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
    </div>
  );
}
