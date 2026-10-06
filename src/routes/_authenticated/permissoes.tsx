import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões — Contatus AI" },
      { name: "description", content: "Aprovação de acesso e perfis de usuários." },
      { property: "og:title", content: "Permissões — Contatus AI" },
      { property: "og:description", content: "Aprovação de acesso e perfis de usuários." },
    ],
  }),
  component: Permissoes,
});

const ROLES: Record<string, string> = { client: "Cliente", admin: "Adm", master: "Adm Master" };

type U = { id: string; email: string | null; full_name: string | null; agency_name: string | null; approved: boolean; role: string; created_at: string };

function Permissoes() {
  const qc = useQueryClient();
  const { data = [], error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_users");
      if (error) throw error;
      return (data ?? []) as U[];
    },
  });

  async function setAccess(u: U, approved: boolean, role: string) {
    const { error } = await supabase.rpc("set_user_access", { _user: u.id, _approved: approved, _role: role });
    if (error) return toast.error(error.message.includes("yourself") ? "Você não pode rebaixar a si mesmo." : "Sem permissão.");
    toast.success("Acesso atualizado");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  if (error) return <div className="glass rounded-xl p-8 text-center text-muted-foreground">Apenas Adm Master pode acessar esta aba.</div>;

  const pending = data.filter((u) => !u.approved).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permissões</h1>
        <p className="text-muted-foreground">Aprove cadastros e defina o perfil de cada pessoa. {pending > 0 && <span className="text-warning">{pending} aguardando.</span>}</p>
      </div>
      <div className="glass overflow-hidden rounded-xl">
        <ul className="divide-y divide-border">
          {data.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}{u.agency_name ? ` · ${u.agency_name}` : ""}</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${u.approved ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                {u.approved ? "Liberado" : "Pendente"}
              </span>
              <Select value={u.role} onValueChange={(r) => setAccess(u, u.approved, r)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {u.approved ? (
                <Button variant="outline" size="sm" onClick={() => setAccess(u, false, u.role)}>Bloquear</Button>
              ) : (
                <Button variant="neon" size="sm" onClick={() => setAccess(u, true, u.role)}>Aprovar acesso</Button>
              )}
            </li>
          ))}
          {data.length === 0 && <li className="p-6 text-sm text-muted-foreground">Nenhum usuário.</li>}
        </ul>
      </div>
    </div>
  );
}
