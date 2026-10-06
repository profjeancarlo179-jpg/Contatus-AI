import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Contatus AI" },
      { name: "description", content: "Acesse o Contatus AI: criação de conteúdo, simulação de Instagram e aprovação de artes." },
      { property: "og:title", content: "Entrar — Contatus AI" },
      { property: "og:description", content: "Criação de conteúdo, simulação de Instagram e aprovação de artes com clientes." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name, agency_name: agency } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/painel" });
        else {
          toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
          setMode("in");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-neon"><Sparkles className="h-4 w-4" /></span>
          Contatus AI
        </div>
        <div>
          <h1 className="text-5xl leading-tight font-bold">
            Do lote de posts à <span className="text-gradient">aprovação do cliente</span>, num só lugar.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Crie conteúdos, simule o feed do Instagram e envie um link para o cliente aprovar arte e legenda.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Contatus AI</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-2xl p-8">
          <div>
            <h2 className="text-2xl font-semibold">{mode === "in" ? "Entrar" : "Criar conta"}</h2>
            <p className="text-sm text-muted-foreground">Use seu e-mail e senha.</p>
          </div>
          {mode === "up" && (
            <>
              <div className="space-y-1.5"><Label>Seu nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>Agência / marca</Label><Input value={agency} onChange={(e) => setAgency(e.target.value)} /></div>
            </>
          )}
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Senha</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" variant="neon" className="w-full" disabled={loading}>
            {loading ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "in" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
