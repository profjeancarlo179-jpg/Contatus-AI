import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        password: z.string().min(6).max(72),
        full_name: z.string().trim().max(120).optional(),
        agency_name: z.string().trim().max(120).optional(),
        role: z.enum(["client", "admin", "master", "user"]),
      })
      .parse(d),
  )
  // erros de validação chegam ao cliente como JSON; aqui mantemos mensagens claras
  .handler(async ({ data, context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "master" });
    if (!isMaster) throw new Error("Sem permissão.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, agency_name: data.agency_name },
    });
    if (error || !created.user) throw new Error(error?.message?.includes("already") ? "Este e-mail já está cadastrado." : "Não foi possível criar o usuário.");
    const { error: e2 } = await context.supabase.rpc("set_user_access", { _user: created.user.id, _approved: true, _role: data.role });
    if (e2) throw new Error("Usuário criado, mas não foi possível definir o perfil.");
    return { ok: true, id: created.user.id };
  });
