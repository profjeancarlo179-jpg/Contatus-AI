import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BioPreview } from "@/components/BioPreview";
import type { Bio } from "@/lib/bio";

export const Route = createFileRoute("/b/$slug")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Links do perfil — Contatus AI" }, { name: "description", content: "Encontre os links e canais deste perfil." },
    { property: "og:title", content: "Links do perfil — Contatus AI" }, { property: "og:description", content: "Acesse os links e canais deste perfil." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: PublicBio,
});
function PublicBio() {
  const { slug } = Route.useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ["public-bio", slug], queryFn: async () => {
    const { data: paused } = await supabase.rpc("bio_page_paused" as never, { _slug: slug } as never);
    if (paused) return { paused: true } as const;
    const { data, error } = await supabase.rpc("get_bio_page", { _slug: slug });
    if (error) throw error;
    return data?.[0] as unknown as Pick<Bio, "name" | "description" | "photo" | "links" | "appearance"> | undefined;
  } });
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando…</div>;
  if (data && "paused" in data) return <div className="grid min-h-screen place-items-center px-6 text-center"><div><h1 className="text-2xl font-semibold">Página temporariamente pausada</h1><p className="mt-3 text-muted-foreground">Esta página não está disponível no momento. Entre em contato com o desenvolvedor.</p></div></div>;
  if (!data || error) return <div className="grid min-h-screen place-items-center px-6 text-center"><div><h1 className="text-2xl font-semibold">Página indisponível</h1><p className="mt-3 text-muted-foreground">Este link não existe ou ainda não foi publicado.</p></div></div>;
  return <main className="min-h-screen"><BioPreview bio={data} interactive /></main>;
}