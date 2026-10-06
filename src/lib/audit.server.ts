import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

export const auditSchema = z.object({
  score: z.number().describe("Nota geral do perfil de 0 a 100"),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  bio_suggestion: z.string(),
  content_pillars: z.array(z.string()),
  posting_plan: z.string(),
  quick_wins: z.array(z.string()),
});
export type AuditResult = z.infer<typeof auditSchema>;

export async function runAudit(apiKey: string, input: { handle: string; niche?: string; bio?: string; followers?: number | null; notes?: string }) {
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "Você é um estrategista sênior de marketing para Instagram. Faça auditorias objetivas e acionáveis em português do Brasil. Seja específico ao nicho informado.",
    prompt: `Audite este perfil do Instagram:
@${input.handle}
Nicho: ${input.niche || "não informado"}
Seguidores: ${input.followers ?? "não informado"}
Bio atual: ${input.bio || "não informada"}
Observações: ${input.notes || "nenhuma"}

Retorne nota, resumo, pontos fortes, pontos fracos, sugestão de nova bio, 4-6 pilares de conteúdo, plano de postagem semanal e 5 ações rápidas.`,
    output: Output.object({ schema: auditSchema }),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return (await result.output) as AuditResult;
}
