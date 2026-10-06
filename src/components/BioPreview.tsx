import { ArrowUpRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeBioUrl, type Bio } from "@/lib/bio";

export function BioPreview({ bio, interactive = false }: { bio: Pick<Bio, "name" | "description" | "photo" | "links">; interactive?: boolean }) {
  return <div className="mx-auto w-full max-w-md px-6 py-12 text-center">
    <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-primary/50 bg-muted">
      {bio.photo ? <img src={bio.photo} alt={bio.name || "Foto do perfil"} className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10 text-muted-foreground" />}
    </div>
    <h1 className="mt-5 break-words text-2xl font-semibold">{bio.name || "Nome do perfil"}</h1>
    {bio.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{bio.description}</p>}
    <div className="mt-8 space-y-3">
      {bio.links.filter(l => l.enabled).map(l => {
        const href = safeBioUrl(l.url);
        return <Button key={l.id} variant="outline" asChild={interactive && !!href} className="min-h-14 w-full justify-between gap-4 whitespace-normal rounded-lg border-primary/30 bg-card px-5 py-3 text-left">
          {interactive && href ? <a href={href} target="_blank" rel="noopener noreferrer"><span className="break-words">{l.label || "Novo link"}</span><ArrowUpRight className="shrink-0" /></a> : <span className="flex w-full items-center justify-between gap-4"><span className="break-words">{l.label || "Novo link"}</span><ArrowUpRight className="shrink-0" /></span>}
        </Button>;
      })}
    </div>
    <p className="mt-12 text-xs text-muted-foreground">Contatus AI</p>
  </div>;
}