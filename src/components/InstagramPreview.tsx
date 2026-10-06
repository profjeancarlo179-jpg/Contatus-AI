import { useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Send, ImageIcon } from "lucide-react";
import { isVideo, useMediaUrls } from "@/lib/content";

type Props = {
  handle?: string;
  media: string[];
  caption: string;
  hashtags?: string;
};

export function InstagramPreview({ handle = "seu.perfil", media, caption, hashtags }: Props) {
  const urls = useMediaUrls(media);
  const [i, setI] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const idx = Math.min(i, Math.max(urls.length - 1, 0));
  const current = urls[idx];
  const fullText = [caption, hashtags].filter(Boolean).join("\n\n");

  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[2.5rem] border border-border bg-card p-3 shadow-glow">
      <div className="overflow-hidden rounded-[2rem] bg-background">
        <div className="flex items-center justify-between px-4 pt-3 pb-1 text-[11px] text-muted-foreground">
          <span>9:41</span>
          <span className="font-display font-semibold text-foreground">Instagram</span>
          <span>100%</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="rounded-full bg-gradient-neon p-[2px]">
            <div className="h-8 w-8 rounded-full border-2 border-background bg-muted" />
          </div>
          <span className="text-sm font-semibold">{handle}</span>
          <MoreHorizontal className="ml-auto h-4 w-4" />
        </div>
        <div className="relative aspect-[4/5] w-full bg-muted">
          {current ? (
            isVideo(media[idx] ?? "") ? (
              <video src={current} className="h-full w-full object-cover" controls muted playsInline />
            ) : (
              <img src={current} alt="Arte" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
              <span className="text-xs">Envie a arte para visualizar</span>
            </div>
          )}
          {urls.length > 1 && (
            <>
              <span className="absolute top-3 right-3 rounded-full bg-background/70 px-2 py-0.5 text-[11px]">
                {idx + 1}/{urls.length}
              </span>
              {idx > 0 && (
                <button onClick={() => setI(idx - 1)} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-background/80 p-1">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {idx < urls.length - 1 && (
                <button onClick={() => setI(idx + 1)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-background/80 p-1">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4 px-3 pt-3">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
          {urls.length > 1 && (
            <div className="mx-auto flex gap-1">
              {urls.map((_, k) => (
                <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === idx ? "bg-neon-blue" : "bg-muted-foreground/40"}`} />
              ))}
            </div>
          )}
          <Bookmark className="ml-auto h-6 w-6" />
        </div>
        <div className="px-3 pt-2 pb-4 text-sm">
          <p className="font-semibold">1.284 curtidas</p>
          <p className={`mt-1 whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`}>
            <span className="mr-1 font-semibold">{handle}</span>
            {fullText || <span className="text-muted-foreground">Sua legenda aparece aqui…</span>}
          </p>
          {fullText.length > 90 && (
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
              {expanded ? "menos" : "mais"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
