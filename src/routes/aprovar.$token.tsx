import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Sparkles, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InstagramPreview } from "@/components/InstagramPreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REJECTION_REASONS, timeLeft } from "@/lib/content";

export const Route = createFileRoute("/aprovar/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aprovação de arte — Contatus AI" },
      { name: "description", content: "Veja como sua arte ficará no Instagram e aprove ou peça ajustes." },
      { property: "og:title", content: "Aprovação de arte — Contatus AI" },
      { property: "og:description", content: "Veja como sua arte ficará no Instagram e aprove ou peça ajustes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Aprovar,
});

function Aprovar() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["shared", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_content", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const [mode, setMode] = useState<"none" | "approve" | "reject">("none");
  const pin = useMemo(() => String(Math.floor(1000 + Math.random() * 9000)), [mode]);
  const [typed, setTyped] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function decide(approved: boolean) {
    setSending(true);
    const { error } = await supabase.rpc("submit_decision", {
      _token: token,
      _approved: approved,
      _reasons: approved ? [] : reasons,
      _feedback: approved ? "" : text,
    });
    setSending(false);
    if (error) return toast.error("Não foi possível enviar. Tente novamente.");
    setMode("none");
    qc.invalidateQueries({ queryKey: ["shared", token] });
  }

  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando…</div>;
  if (!data) return <div className="grid min-h-screen place-items-center text-muted-foreground">Link inválido ou expirado.</div>;

  const handle = (data.client_name || "seu.perfil").toLowerCase().replace(/\s+/g, ".");

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center gap-2 font-display font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-neon"><Sparkles className="h-4 w-4" /></span>
        {data.agency_name || "Contatus AI"}
      </div>
      <div className="grid items-start gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Olá{data.client_name ? `, ${data.client_name}` : ""}!</p>
            <h1 className="mt-1 text-3xl font-bold">Aprove sua arte</h1>
            <p className="mt-2 text-muted-foreground">Veja ao lado exatamente como “{data.title}” vai aparecer no Instagram.</p>
          </div>
          {data.status === "pending" ? (
            <div className="glass space-y-4 rounded-xl p-6">
              <p className="flex items-center gap-2 text-sm text-warning">
                <Clock className="h-4 w-4" /> Você tem {timeLeft(data.expires_at)} para responder. Sem resposta, a arte será aprovada automaticamente.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="neon" size="lg" onClick={() => { setTyped(""); setMode("approve"); }}><ThumbsUp /> Aprovar</Button>
                <Button variant="outline" size="lg" onClick={() => setMode("reject")}><ThumbsDown /> Reprovar</Button>
              </div>
            </div>
          ) : data.status === "approved" ? (
            <div className="glass flex items-center gap-3 rounded-xl p-6 text-success">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <div className="font-semibold">Arte aprovada{data.auto_approved ? " automaticamente" : ""}.</div>
                <div className="text-sm text-muted-foreground">Obrigado! A equipe já foi notificada.</div>
              </div>
            </div>
          ) : data.status === "rejected" ? (
            <div className="glass flex items-center gap-3 rounded-xl p-6 text-destructive">
              <XCircle className="h-6 w-6" />
              <div>
                <div className="font-semibold">Ajustes solicitados.</div>
                <div className="text-sm text-muted-foreground">O designer recebeu suas observações.</div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-6 text-muted-foreground">Esta arte ainda não foi enviada para aprovação.</div>
          )}
        </div>
        <InstagramPreview handle={handle} format={data.format} media={data.image_urls} caption={data.caption} hashtags={data.hashtags} audio={data.audio} location={data.location} />
      </div>

      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode("none")}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirme a aprovação</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Para evitar cliques acidentais, digite o código abaixo:</p>
          <div className="text-center font-display text-5xl font-bold tracking-[0.4em] text-gradient">{pin}</div>
          <Input inputMode="numeric" maxLength={4} value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))} placeholder="Digite o código" className="text-center text-lg tracking-widest" />
          <Button variant="neon" disabled={typed !== pin || sending} onClick={() => decide(true)}>Confirmar aprovação</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "reject"} onOpenChange={(o) => !o && setMode("none")}>
        <DialogContent>
          <DialogHeader><DialogTitle>O que precisa mudar?</DialogTitle></DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REJECTION_REASONS.map((r) => {
              const on = reasons.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => setReasons(on ? reasons.filter((x) => x !== r) : [...reasons, r])}
                  className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-destructive bg-destructive/15 text-destructive" : "border-border text-muted-foreground"}`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <Textarea rows={5} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Descreva em detalhes o que o designer deve alterar…" />
          <Button variant="destructive" disabled={sending || (reasons.length === 0 && !text.trim())} onClick={() => decide(false)}>
            Enviar ajustes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
