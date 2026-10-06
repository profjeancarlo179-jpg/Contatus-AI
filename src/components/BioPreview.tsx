import { ArrowUpRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bioAppearance, safeBioUrl, type Bio } from "@/lib/bio";
import type { CSSProperties } from "react";
import { BioLinkIcon } from "@/components/BioAppearance";
import { BioSocialIcons } from "@/components/BioSocials";

export function BioPreview({ bio, interactive = false }: { bio: Pick<Bio, "name" | "description" | "photo" | "links" | "appearance">; interactive?: boolean }) {
  const a = bioAppearance(bio.appearance);
  const vars = { "--bio-background": a.background, "--bio-text": a.text, "--bio-button": a.button, "--bio-button-text": a.buttonText } as CSSProperties;
  return <div data-testid="bio-preview" className={`bio-page bio-font-${a.font} ${interactive ? "min-h-screen" : "min-h-[520px]"}`} style={vars}><div className="mx-auto w-full max-w-md px-6 py-12 text-center">
    <div className="bio-avatar mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2">
      {bio.photo ? <img src={bio.photo} alt={bio.name || "Foto do perfil"} className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10 opacity-70" />}
    </div>
    <h1 className="mt-5 break-words text-2xl font-semibold">{bio.name || "Nome do perfil"}</h1>
    <BioSocialIcons socials={bio.appearance?.socials} interactive={interactive} />
    {bio.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm opacity-80">{bio.description}</p>}
    <div className="mt-8 space-y-3">
      {bio.links.filter(l => l.enabled).map(l => {
        const href = safeBioUrl(l.url);
        const content = <><span className="flex min-w-0 items-center gap-3"><BioLinkIcon name={l.icon} /><span className="min-w-0 break-words">{l.label || "Novo link"}</span></span><ArrowUpRight className="shrink-0" /></>;
        return <Button key={l.id} variant="outline" asChild={interactive && !!href} className={`bio-button bio-shape-${a.shape} bio-style-${a.buttonStyle} min-h-14 w-full justify-between gap-4 whitespace-normal px-5 py-3 text-left`}>
          {interactive && href ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <span className="flex w-full items-center justify-between gap-4">{content}</span>}
        </Button>;
      })}
    </div>
    <p className="mt-12 text-xs opacity-65">Contatus AI</p>
  </div></div>;
}