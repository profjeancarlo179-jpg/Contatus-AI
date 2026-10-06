import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/c/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Assinatura de contrato — Contatus AI" },
      { name: "description", content: "Leia e assine digitalmente seu contrato." },
      { property: "og:title", content: "Assinatura de contrato — Contatus AI" },
      { property: "og:description", content: "Leia e assine digitalmente seu contrato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignPage,
});

type C = { title: string; body: string; client_name: string; status: string; signed_name: string | null; signed_document: string | null; signature: string | null; signed_at: string | null; created_at: string };

function SignPage() {
  const { token } = Route.useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contract", token],
    queryFn: async () => ((await (supabase as any).rpc("get_contract", { _token: token })).data?.[0] ?? null) as C | null,
  });
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(false);

  useEffect(() => {
    const cv = canvas.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    let down = false;
    const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    const d = (e: PointerEvent) => { down = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const m = (e: PointerEvent) => { if (!down) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); drawn.current = true; };
    const u = () => { down = false; };
    cv.addEventListener("pointerdown", d); cv.addEventListener("pointermove", m); cv.addEventListener("pointerup", u);
    return () => { cv.removeEventListener("pointerdown", d); cv.removeEventListener("pointermove", m); cv.removeEventListener("pointerup", u); };
  }, [data?.status]);

  function clear() { const cv = canvas.current!; cv.getContext("2d")!.clearRect(0, 0, cv.width, cv.height); drawn.current = false; }

  async function sign() {
    if (name.trim().length < 3) return toast.error("Informe seu nome completo");
    if (!drawn.current) return toast.error("Desenhe sua assinatura");
    if (!agree) return toast.error("Marque que concorda com os termos");
    setBusy(true);
    const { error } = await (supabase as any).rpc("sign_contract", { _token: token, _name: name, _document: doc, _signature: canvas.current!.toDataURL("image/png") });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contrato assinado!");
    refetch();
  }

  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="grid min-h-screen place-items-center p-6 text-muted-foreground">Contrato não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="invoice-print mx-auto max-w-3xl space-y-6 rounded-xl bg-card p-6 sm:p-10">
        <div className="border-b border-border pb-4 text-center">
          <h1 className="text-2xl font-bold uppercase">{data.title}</h1>
          <p className="text-sm text-muted-foreground">Para {data.client_name} · {new Date(data.created_at).toLocaleDateString("pt-BR")}</p>
        </div>
        <div className="space-y-1 rounded-lg border border-border p-5 text-sm leading-relaxed">
          {data.body.split("\n").map((line, i) => {
            const t = line.trim();
            if (!t) return <div key={i} className="h-2" />;
            const heading = /^(\d+\.\s|CONTRATADA$|CONTRATANTE$|OBJETO DO CONTRATO$|CLÁUSULAS$)/.test(t) || (/^[A-ZÀ-Ú\s/()]+:?$/.test(t) && t.length > 3);
            return <p key={i} className={heading ? "pt-2 font-bold text-primary" : ""}>{line}</p>;
          })}
        </div>
        {data.status === "assinado" ? (
          <div className="space-y-3 rounded-lg border border-success/40 p-5">
            <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="h-5 w-5" /> Contrato assinado digitalmente</p>
            {data.signature && <img src={data.signature} alt="Assinatura" className="h-24 rounded bg-white p-1" />}
            <p className="text-sm">{data.signed_name}{data.signed_document ? ` · ${data.signed_document}` : ""}</p>
            <p className="text-xs text-muted-foreground">Em {data.signed_at && new Date(data.signed_at).toLocaleString("pt-BR")}</p>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Imprimir</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>CPF/CNPJ</Label><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><Label>Assinatura (desenhe abaixo)</Label><button className="text-xs text-primary" onClick={clear}>Limpar</button></div>
              <canvas ref={canvas} width={700} height={180} className="w-full touch-none rounded-lg bg-white" />
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Li e concordo com todos os termos deste contrato.</label>
            <Button variant="neon" className="w-full" disabled={busy} onClick={sign}>{busy && <Loader2 className="animate-spin" />} Assinar contrato</Button>
          </div>
        )}
      </div>
    </div>
  );
}
