import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ROLE_LABEL: Record<string, string> = { client: "Cliente", admin: "Adm", master: "Adm Master" };

/** Tabs a master can grant/remove per user. Permissões is always master-only. */
export const APP_TABS: { to: string; label: string; only?: "staff" | "master" }[] = [
  { to: "/painel", label: "Início" },
  { to: "/criar", label: "Criar Conteúdo" },
  { to: "/aprovacao", label: "Pré-visualizar & Aprovação" },
  { to: "/arquivos", label: "Arquivos" },
  { to: "/criacao", label: "Criação Vídeo & Imagem" },
  { to: "/link-perfil", label: "Link do perfil" },
  { to: "/clientes", label: "Clientes", only: "staff" },
  { to: "/relatorios", label: "Relatórios" },
  { to: "/analise", label: "Análise & Conexão" },
  { to: "/configuracoes", label: "Configurações", only: "staff" },
  { to: "/financeiro", label: "Financeiro", only: "master" },
  { to: "/fatura", label: "Fatura" },
];

export const isStaff = (role?: string) => role === "admin" || role === "master";

export function roleAllows(role: string | undefined, only?: "staff" | "master") {
  return only === "staff" ? isStaff(role) : only === "master" ? role === "master" : true;
}

export function useAccess() {
  return useQuery({
    queryKey: ["access"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_access");
      const base = (data?.[0] ?? { role: "client", approved: false }) as { role: string; approved: boolean };
      const { data: u } = await supabase.auth.getUser();
      let tabs: string[] | null = null;
      if (u.user) {
        const { data: t } = await (supabase as any).from("user_tab_access").select("tabs").eq("user_id", u.user.id).maybeSingle();
        tabs = t?.tabs ?? null;
      }
      return { ...base, tabs };
    },
  });
}

/** null tabs = default (everything the role allows). Master always sees everything. */
export function canSeeTab(access: { role: string; tabs: string[] | null } | undefined, to: string, only?: "staff" | "master") {
  if (to === "/permissoes") return access?.role === "master";
  if (!roleAllows(access?.role, only)) return false;
  if (access?.role === "master" || !access?.tabs) return true;
  return access.tabs.includes(to);
}
