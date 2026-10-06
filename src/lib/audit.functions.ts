import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAudit } from "./audit.server";

export const auditProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        handle: z.string().trim().min(1).max(60),
        niche: z.string().max(200).optional(),
        bio: z.string().max(500).optional(),
        followers: z.number().int().min(0).nullable().optional(),
        notes: z.string().max(1500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { error: "IA não configurada." };
    try {
      const result = await runAudit(key, data);
      const { data: row, error } = await context.supabase
        .from("audits")
        .insert({ ...data, handle: data.handle.replace(/^@/, ""), result, user_id: context.userId })
        .select()
        .single();
      if (error) return { error: error.message };
      return { audit: row };
    } catch (e) {
      console.error("audit failed", e);
      const msg = e instanceof Error ? e.message : "";
      if (/402|credit/i.test(msg)) return { error: "Créditos de IA esgotados. Adicione créditos para continuar." };
      if (/429/.test(msg)) return { error: "Muitas solicitações. Aguarde um instante e tente novamente." };
      return { error: "Não foi possível gerar a análise agora." };
    }
  });
