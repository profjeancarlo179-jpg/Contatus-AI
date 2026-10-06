import { useEffect, useRef, useState } from "react";
import { Download, Film, Loader2, Music2, Pause, Play, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const ASPECTS: Record<string, { label: string; w: number; h: number } | null> = {
  original: null,
  "9:16": { label: "Reels/Stories 9:16", w: 720, h: 1280 },
  "1:1": { label: "Feed 1:1", w: 1080, h: 1080 },
};

export function VideoEditor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtx = useRef<{ ctx: AudioContext; dest: MediaStreamAudioDestinationNode; vGain: GainNode; mGain: GainNode } | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [music, setMusic] = useState<string | null>(null);
  const [musicName, setMusicName] = useState("");
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [aspect, setAspect] = useState("9:16");
  const [text, setText] = useState("");
  const [textPos, setTextPos] = useState<"top" | "center" | "bottom">("bottom");
  const [textSize, setTextSize] = useState(48);
  const [videoVol, setVideoVol] = useState(100);
  const [musicVol, setMusicVol] = useState(60);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const settings = useRef({ range, aspect, text, textPos, textSize });
  settings.current = { range, aspect, text, textPos, textSize };

  // render loop
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const v = videoRef.current, c = canvasRef.current;
      if (v && c && v.videoWidth) {
        const s = settings.current;
        const a = ASPECTS[s.aspect];
        const W = a ? a.w : Math.min(v.videoWidth, 1280);
        const H = a ? a.h : Math.round((W / v.videoWidth) * v.videoHeight);
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
        const g = c.getContext("2d")!;
        const scale = Math.max(W / v.videoWidth, H / v.videoHeight);
        const dw = v.videoWidth * scale, dh = v.videoHeight * scale;
        g.fillStyle = "#000";
        g.fillRect(0, 0, W, H);
        g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
        if (s.text.trim()) {
          const size = Math.round((s.textSize / 1080) * W * 1.4);
          g.font = `700 ${size}px Sora, sans-serif`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          const lines = s.text.split("\n");
          const total = lines.length * size * 1.2;
          const y0 = s.textPos === "top" ? H * 0.12 : s.textPos === "center" ? H / 2 - total / 2 + size * 0.6 : H * 0.85 - total + size * 0.6;
          lines.forEach((ln, i) => {
            const y = y0 + i * size * 1.2;
            g.lineWidth = size * 0.15;
            g.strokeStyle = "rgba(0,0,0,0.75)";
            g.strokeText(ln, W / 2, y);
            g.fillStyle = "#fff";
            g.fillText(ln, W / 2, y);
          });
        }
        if (!v.paused && v.currentTime >= s.range[1]) {
          v.currentTime = s.range[0];
          if (musicRef.current) musicRef.current.currentTime = 0;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (audioCtx.current) {
      audioCtx.current.vGain.gain.value = videoVol / 100;
      audioCtx.current.mGain.gain.value = musicVol / 100;
    } else {
      if (videoRef.current) videoRef.current.volume = videoVol / 100;
      if (musicRef.current) musicRef.current.volume = musicVol / 100;
    }
  }, [videoVol, musicVol]);

  function ensureAudio() {
    if (audioCtx.current || !videoRef.current || !musicRef.current) return audioCtx.current;
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const vGain = ctx.createGain(), mGain = ctx.createGain();
    vGain.gain.value = videoVol / 100;
    mGain.gain.value = musicVol / 100;
    ctx.createMediaElementSource(videoRef.current).connect(vGain);
    ctx.createMediaElementSource(musicRef.current).connect(mGain);
    [vGain, mGain].forEach((n) => { n.connect(ctx.destination); n.connect(dest); });
    audioCtx.current = { ctx, dest, vGain, mGain };
    return audioCtx.current;
  }

  async function togglePlay() {
    const v = videoRef.current, m = musicRef.current;
    if (!v) return;
    ensureAudio();
    await audioCtx.current?.ctx.resume();
    if (v.paused) {
      if (v.currentTime < range[0] || v.currentTime >= range[1]) v.currentTime = range[0];
      await v.play();
      if (m && music) { m.currentTime = Math.max(0, v.currentTime - range[0]); m.play(); }
      setPlaying(true);
    } else {
      v.pause(); m?.pause(); setPlaying(false);
    }
  }

  async function exportVideo() {
    const v = videoRef.current, m = musicRef.current, c = canvasRef.current;
    if (!v || !c) return;
    setExporting(true);
    setResult(null);
    const audio = ensureAudio();
    await audio?.ctx.resume();
    v.pause(); m?.pause();
    v.currentTime = range[0];
    await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
    if (m) m.currentTime = 0;
    const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...(audio ? audio.dest.stream.getAudioTracks() : [])]);
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start(250);
    await v.play();
    if (m && music) m.play();
    setPlaying(true);
    await new Promise<void>((r) => {
      const check = () => (v.currentTime >= range[1] - 0.05 || v.ended ? r() : requestAnimationFrame(check));
      check();
    });
    rec.stop();
    v.pause(); m?.pause(); setPlaying(false);
    await done;
    setResult(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
    setExporting(false);
    toast.success("Vídeo pronto!");
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(result);
    a.download = `contatus-video.${result.type.includes("mp4") ? "mp4" : "webm"}`;
    a.click();
  }

  async function saveToLibrary() {
    if (!result) return;
    try {
      const ext = result.type.includes("mp4") ? "mp4" : "webm";
      const path = await uploadMedia(new File([result], `video.${ext}`, { type: result.type }));
      const { error } = await supabase.from("contents").insert({
        title: text.split("\n")[0] || "Vídeo editado",
        kind: "video",
        format: aspect === "1:1" ? "feed" : "reels",
        image_urls: [path],
        audio: musicName || null,
      });
      if (error) throw error;
      toast.success("Salvo em Arquivos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground hover:border-primary">
          <Upload className="h-4 w-4" /> {src ? "Trocar vídeo" : "Enviar vídeo para editar"}
          <input
            type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSrc(URL.createObjectURL(f)); setResult(null); setPlaying(false); } }}
          />
        </label>

        {src && (
          <>
            <div className="glass space-y-3 rounded-xl p-5">
              <div className="flex items-center justify-between"><Label>Cortar início / fim</Label><span className="text-xs text-muted-foreground">{range[0].toFixed(1)}s – {range[1].toFixed(1)}s ({(range[1] - range[0]).toFixed(1)}s)</span></div>
              <Slider min={0} max={duration || 1} step={0.1} value={range} onValueChange={(v) => { setRange([v[0], v[1]] as [number, number]); if (videoRef.current) videoRef.current.currentTime = v[0]; }} />
            </div>

            <div className="glass space-y-3 rounded-xl p-5">
              <Label>Formato</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ASPECTS).map(([k, a]) => (
                  <button key={k} onClick={() => setAspect(k)} className={`rounded-lg border px-3 py-2 text-sm ${aspect === k ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                    {a ? a.label : "Original"}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass space-y-3 rounded-xl p-5">
              <Label>Texto na tela</Label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Digite o título ou chamada…" className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
              <div className="flex flex-wrap items-center gap-2">
                {(["top", "center", "bottom"] as const).map((p) => (
                  <button key={p} onClick={() => setTextPos(p)} className={`rounded-full border px-3 py-1 text-xs ${textPos === p ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                    {p === "top" ? "Topo" : p === "center" ? "Centro" : "Rodapé"}
                  </button>
                ))}
                <div className="ml-auto flex w-40 items-center gap-2 text-xs text-muted-foreground">Tamanho <Slider min={20} max={100} value={[textSize]} onValueChange={(v) => setTextSize(v[0])} /></div>
              </div>
            </div>

            <div className="glass space-y-4 rounded-xl p-5">
              <Label>Música de fundo</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                <Music2 className="h-4 w-4" /> {musicName || "Escolher arquivo de áudio"}
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setMusic(URL.createObjectURL(f)); setMusicName(f.name.replace(/\.[^.]+$/, "")); } }} />
              </label>
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div className="space-y-2">Volume do vídeo: {videoVol}%<Slider min={0} max={100} value={[videoVol]} onValueChange={(v) => setVideoVol(v[0])} /></div>
                <div className="space-y-2">Volume da música: {musicVol}%<Slider min={0} max={100} value={[musicVol]} onValueChange={(v) => setMusicVol(v[0])} /></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-36 lg:self-start">
        <div className="mx-auto w-full max-w-[320px] rounded-[2.5rem] border border-border bg-card p-2.5 shadow-glow">
          <div className="grid min-h-[420px] place-items-center overflow-hidden rounded-[2rem] bg-background">
            {src ? <canvas ref={canvasRef} className="h-auto max-h-[560px] w-full object-contain" /> : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground"><Film className="h-10 w-10" /><span className="text-xs">Prévia do vídeo</span></div>
            )}
          </div>
        </div>
        <video
          ref={videoRef} src={src ?? undefined} className="hidden" playsInline crossOrigin="anonymous"
          onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDuration(d); setRange([0, d]); e.currentTarget.currentTime = 0.01; }}
        />
        <audio ref={musicRef} src={music ?? undefined} className="hidden" />
        {src && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={togglePlay} disabled={exporting}>{playing ? <Pause /> : <Play />} {playing ? "Pausar" : "Reproduzir"}</Button>
            <Button variant="neon" onClick={exportVideo} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <Film />} {exporting ? "Gerando…" : "Gerar vídeo final"}</Button>
          </div>
        )}
        {exporting && <p className="text-center text-xs text-muted-foreground">O vídeo é gravado em tempo real — aguarde a duração do trecho.</p>}
        {result && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={download}><Download /> Baixar</Button>
            <Button variant="outline" onClick={saveToLibrary}><Save /> Salvar em Arquivos</Button>
          </div>
        )}
      </div>
    </div>
  );
}
