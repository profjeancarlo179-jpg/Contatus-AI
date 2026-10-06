import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, PenSquare, Smartphone, FolderOpen, LineChart, LogOut, Sparkles, User, ShieldCheck, Clock, BarChart3, Clapperboard, Settings, Users, Link2, Wallet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useAccess, isStaff } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/" });
  },
  component: AppLayout,
});

type Tab = { to: string; label: string; icon: typeof LayoutDashboard; only?: "staff" | "master" };
const ROW1: Tab[] = [
  { to: "/painel", label: "Início", icon: LayoutDashboard },
  { to: "/criar", label: "Criar Conteúdo", icon: PenSquare },
  { to: "/aprovacao", label: "Pré-visualizar & Aprovação", icon: Smartphone },
  { to: "/arquivos", label: "Arquivos", icon: FolderOpen },
  { to: "/criacao", label: "Criação Vídeo & Imagem", icon: Clapperboard },
];
const ROW2: Tab[] = [
  { to: "/link-perfil", label: "Link do perfil", icon: Link2 },
  { to: "/clientes", label: "Clientes", icon: Users, only: "staff" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/analise", label: "Análise & Conexão", icon: LineChart },
  { to: "/configuracoes", label: "Configurações", icon: Settings, only: "staff" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, only: "master" },
  { to: "/fatura", label: "Fatura", icon: Receipt },
  { to: "/permissoes", label: "Permissões", icon: ShieldCheck, only: "master" },
];

function AppLayout() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const qc = useQueryClient();
  const { data: access, isLoading } = useAccess();

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/painel" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-neon"><Sparkles className="h-4 w-4" /></span>
            Contatus AI
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {access && <span className="mr-2 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">{ROLE_LABEL[access.role]}</span>}
            <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)}><User /> Perfil</Button>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut /> Sair</Button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl space-y-1 px-4 pb-1">
          {[ROW1, ROW2].map((row, i) => (
            <div key={i} className="flex flex-wrap gap-1">
              {row
                .filter((t) => (t.only === "staff" ? isStaff(access?.role) : t.only === "master" ? access?.role === "master" : true))
                .map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "!bg-primary/15 !text-foreground ring-1 ring-primary/40" }}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {isLoading ? null : access?.approved ? (
          <Outlet />
        ) : (
          <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-warning" />
            <h1 className="mt-4 text-2xl font-semibold">Aguardando aprovação</h1>
            <p className="mt-2 text-sm text-muted-foreground">Seu cadastro foi recebido. Um Adm Master precisa liberar seu acesso.</p>
          </div>
        )}
      </main>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      return { id: u.user!.id, email: u.user!.email, full_name: data?.full_name ?? "", agency_name: data?.agency_name ?? "" };
    },
  });
  const [name, setName] = useState<string | null>(null);
  const [agency, setAgency] = useState<string | null>(null);

  async function save() {
    if (!data) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name ?? data.full_name, agency_name: agency ?? data.agency_name })
      .eq("id", data.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil salvo");
    qc.invalidateQueries({ queryKey: ["profile"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Seu perfil</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{data?.email}</p>
        <div className="space-y-1.5"><Label>Nome</Label><Input value={name ?? data?.full_name ?? ""} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Agência / marca</Label><Input value={agency ?? data?.agency_name ?? ""} onChange={(e) => setAgency(e.target.value)} /></div>
        <Button variant="neon" onClick={save}>Salvar</Button>
      </DialogContent>
    </Dialog>
  );
}
