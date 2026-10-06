import { useState } from "react";
import {
  Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Send, ImageIcon, Music2, MapPin, X,
} from "lucide-react";
import { isVideo, useMediaUrls } from "@/lib/content";

type Props = {
  handle?: string;
  format?: string;
  media: string[];
  caption: string;
  hashtags?: string;
  audio?: string | null;
  location?: string | null;
};

function Media({ url, path }: { url?: string; path?: string }) {
  if (!url)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <ImageIcon className="h-10 w-10" />
        <span className="text-xs">Envie a mídia para visualizar</span>
      </div>
    );
  return isVideo(path ?? "") ? (
    <video src={url} className="h-full w-full object-cover" autoPlay loop muted playsInline />
  ) : (
    <img src={url} alt="Arte" className="h-full w-full object-cover" />
  );
}

export function InstagramPreview({ handle = "seu.perfil", format = "feed", media, caption, hashtags, audio, location }: Props) {
  const urls = useMediaUrls(media);
  const [i, setI] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const idx = Math.min(i, Math.max(urls.length - 1, 0));
  const fullText = [caption, hashtags].filter(Boolean).join("\n\n");
  const vertical = format === "reels" || format === "stories";

  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[2.75rem] border border-border bg-card p-2.5 shadow-glow">
      <div className="relative overflow-hidden rounded-[2.25rem] bg-background">
        <div className="absolute top-2 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-card" />
        {vertical ? (
          <div className="relative aspect-[9/16] w-full bg-muted">
            <Media url={urls[idx]} path={media[idx]} />
            {format === "stories" ? (
              <>
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-background/70 to-transparent p-3 pt-9">
                  <div className="flex gap-1">
                    {(urls.length ? urls : [""]).map((_, k) => (
                      <div key={k} className={`h-0.5 flex-1 rounded-full ${k <= idx ? "bg-foreground" : "bg-foreground/30"}`} />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <div className="h-7 w-7 rounded-full bg-gradient-neon" />
                    <span className="font-semibold">{handle}</span>
                    <span className="text-xs opacity-70">2h</span>
                    <X className="ml-auto h-5 w-5" />
                  </div>
                  {audio && <div className="mt-1 flex items-center gap-1 text-[11px]"><Music2 className="h-3 w-3" />{audio}</div>}
                </div>
                {location && (
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-semibold text-background">
                    <MapPin className="mr-1 inline h-3 w-3" />{location}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-3">
                  <div className="flex-1 rounded-full border border-foreground/60 px-4 py-2 text-xs">Enviar mensagem</div>
                  <Heart className="h-6 w-6" /><Send className="h-6 w-6" />
                </div>
                {idx > 0 && <button aria-label="Anterior" onClick={() => setI(idx - 1)} className="absolute inset-y-0 left-0 w-1/3" />}
                {idx < urls.length - 1 && <button aria-label="Próximo" onClick={() => setI(idx + 1)} className="absolute inset-y-0 right-0 w-1/3" />}
              </>
            ) : (
              <>
                <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-9 text-sm font-semibold"><span>Reels</span></div>
                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-[11px]">
                  <div className="flex flex-col items-center"><Heart className="h-7 w-7" />12,4 mil</div>
                  <div className="flex flex-col items-center"><MessageCircle className="h-7 w-7" />318</div>
                  <Send className="h-7 w-7" />
                  <MoreHorizontal className="h-6 w-6" />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 pr-14 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-neon" />
                    <span className="font-semibold">{handle}</span>
                    <span className="rounded-md border border-foreground/60 px-2 text-xs">Seguir</span>
                  </div>
                  <p className={`mt-2 whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`} onClick={() => setExpanded(!expanded)}>
                    {fullText || <span className="text-muted-foreground">Sua legenda aparece aqui…</span>}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs"><Music2 className="h-3 w-3" />{audio || "Áudio original"}</div>
                  {location && <div className="mt-1 flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" />{location}</div>}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-3 pb-1 text-[11px] text-muted-foreground">
              <span>9:41</span><span /><span>100%</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="rounded-full bg-gradient-neon p-[2px]"><div className="h-8 w-8 rounded-full border-2 border-background bg-muted" /></div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{handle}</div>
                {(location || audio) && (
                  <div className="text-[11px] text-muted-foreground">
                    {location ? location : <><Music2 className="mr-1 inline h-3 w-3" />{audio}</>}
                  </div>
                )}
              </div>
              <MoreHorizontal className="ml-auto h-4 w-4" />
            </div>
            <div className={`relative w-full bg-muted ${format === "carousel" ? "aspect-[4/5]" : "aspect-square"}`}>
              <Media url={urls[idx]} path={media[idx]} />
              {urls.length > 1 && (
                <>
                  <span className="absolute top-3 right-3 rounded-full bg-background/70 px-2 py-0.5 text-[11px]">{idx + 1}/{urls.length}</span>
                  {idx > 0 && (
                    <button onClick={() => setI(idx - 1)} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-background/80 p-1"><ChevronLeft className="h-4 w-4" /></button>
                  )}
                  {idx < urls.length - 1 && (
                    <button onClick={() => setI(idx + 1)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-background/80 p-1"><ChevronRight className="h-4 w-4" /></button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-4 px-3 pt-3">
              <Heart className="h-6 w-6" /><MessageCircle className="h-6 w-6" /><Send className="h-6 w-6" />
              {urls.length > 1 && (
                <div className="mx-auto flex gap-1">
                  {urls.map((_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === idx ? "bg-neon-blue" : "bg-muted-foreground/40"}`} />)}
                </div>
              )}
              <Bookmark className="ml-auto h-6 w-6" />
            </div>
            <div className="px-3 pt-2 pb-5 text-sm">
              <p className="font-semibold">1.284 curtidas</p>
              <p className={`mt-1 whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`}>
                <span className="mr-1 font-semibold">{handle}</span>
                {fullText || <span className="text-muted-foreground">Sua legenda aparece aqui…</span>}
              </p>
              {fullText.length > 90 && (
                <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">{expanded ? "menos" : "mais"}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
