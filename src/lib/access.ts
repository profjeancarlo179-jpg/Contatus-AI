import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ROLE_LABEL: Record<string, string> = { client: "Cliente", admin: "Adm", master: "Adm Master" };

export function useAccess() {
  return useQuery({
    queryKey: ["access"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_access");
      return (data?.[0] ?? { role: "client", approved: false }) as { role: string; approved: boolean };
    },
  });
}

export const isStaff = (role?: string) => role === "admin" || role === "master";
