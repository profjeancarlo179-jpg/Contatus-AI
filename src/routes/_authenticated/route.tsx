import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, PenSquare, Smartphone, FolderOpen, LineChart, LogOut, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

const TABS = [
  { to: "/painel", label: "Início", icon: LayoutDashboard },
  { to: "/criar", label: "Criar Conteúdo", icon: PenSquare },
  { to: "/aprovacao", label: "Pré-visualizar & Aprovação", icon: Smartphone },
  { to: "/arquivos", label: "Arquivos", icon: FolderOpen },
  { to: "/analise", label: "Análise & Conexão", icon: LineChart },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
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
            <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)}><User /> Perfil</Button>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut /> Sair</Button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex min-w-max gap-1">
            {TABS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "!border-primary !text-foreground" }}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
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
    const { error } = await supabase.from("profiles").upsert({
      id: data.id,
      full_name: name ?? data.full_name,
      agency_name: agency ?? data.agency_name,
    });
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
