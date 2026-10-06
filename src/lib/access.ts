import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ROLE_LABEL: Record<string, string> = { client: "Cliente", admin: "Adm", master: "Adm Master", user: "Usuário" };

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
      const base = (data?.[0] ?? { role: "client", approved: false, paused: false }) as { role: string; approved: boolean; paused?: boolean };
      const { data: u } = await supabase.auth.getUser();
      let tabs: string[] | null = null;
      if (u.user) {
        const { data: t } = await (supabase as any).from("user_tab_access").select("tabs").eq("user_id", u.user.id).maybeSingle();
        tabs = t?.tabs ?? null;
        if (!tabs) {
          const { data: r } = await (supabase as any).from("role_tab_access").select("tabs").eq("role", base.role).maybeSingle();
          tabs = r?.tabs ?? null;
        }
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

/** Sub-tabs per page. Stored in the same tabs array as "<page>#<key>". */
export const SUB_TABS: Record<string, { key: string; label: string }[]> = {
  "/criar": [{ key: "single", label: "Post individual" }, { key: "batch", label: "Gerador em lote" }],
  "/aprovacao": [{ key: "geral", label: "Geral" }, { key: "arquivos", label: "Arquivos" }, { key: "postar", label: "Postar" }, { key: "reprovado", label: "Reprovado" }],
  "/arquivos": [{ key: "arquivos", label: "Arquivos" }, { key: "pendentes", label: "Arte pendente de aprovação" }, { key: "aprovadas", label: "Artes aprovadas" }],
  "/criacao": [{ key: "imagem", label: "Imagem" }, { key: "video", label: "Vídeo" }, { key: "edicao", label: "Edição de vídeo" }],
  "/link-perfil": [{ key: "novo", label: "Novo" }, { key: "editar", label: "Editar" }, { key: "arquivo", label: "Arquivo" }, { key: "redirect", label: "Link de redirecionamento" }],
  "/relatorios": [{ key: "dashboard", label: "Dashboard" }, { key: "arquivos", label: "Arquivos" }, { key: "cliente", label: "Cliente" }, { key: "adm", label: "Adm" }],
  "/financeiro": [{ key: "central", label: "Central de faturas" }, { key: "gerar", label: "Gerar fatura" }, { key: "baixa", label: "Baixa de fatura" }, { key: "servicos", label: "Serviços" }, { key: "contrato", label: "Contrato" }],
};

/** If no sub-tab of a page is stored, every sub-tab of that page is allowed. */
export function canSeeSub(access: { role: string; tabs: string[] | null } | undefined, page: string, key: string) {
  if (access?.role === "master" || !access?.tabs) return true;
  const prefix = page + "#";
  const subs = access.tabs.filter((t) => t.startsWith(prefix));
  return subs.length === 0 || subs.includes(prefix + key);
}

export function useSubTabs(page: string) {
  const { data: access } = useAccess();
  const can = (key: string) => canSeeSub(access, page, key);
  const first = (preferred: string) => (can(preferred) ? preferred : SUB_TABS[page]?.find((s) => can(s.key))?.key ?? preferred);
  return { can, first, ready: !!access };
}
