import { AtSign, Facebook, Globe, Instagram, Linkedin, Mail, MessageCircle, Music2, Pin, Plus, Send, Twitter, X, Youtube, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { safeBioUrl } from "@/lib/bio";

export type BioSocialKey = "instagram" | "tiktok" | "whatsapp" | "email" | "facebook" | "youtube" | "linkedin" | "x" | "threads" | "pinterest" | "telegram" | "site";
export const BIO_SOCIALS: { key: BioSocialKey; label: string; icon: LucideIcon; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@usuario" },
  { key: "tiktok", label: "TikTok", icon: Music2, placeholder: "@usuario" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "65999999999" },
  { key: "email", label: "E-mail", icon: Mail, placeholder: "contato@email.com" },
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/..." },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@..." },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/..." },
  { key: "x", label: "X (Twitter)", icon: Twitter, placeholder: "@usuario" },
  { key: "threads", label: "Threads", icon: AtSign, placeholder: "@usuario" },
  { key: "pinterest", label: "Pinterest", icon: Pin, placeholder: "@usuario" },
  { key: "telegram", label: "Telegram", icon: Send, placeholder: "@usuario" },
  { key: "site", label: "Site", icon: Globe, placeholder: "https://seusite.com" },
];
const isCustom = (k: string) => k.startsWith("custom_");
function customParts(v: string) { const i = v.indexOf("|"); return i < 0 ? { name: "", url: v } : { name: v.slice(0, i), url: v.slice(i + 1) }; }
function entryFor(key: string, raw: string): { key: string; label: string; icon: LucideIcon; href: string | null } | null {
  if (isCustom(key)) { const { name, url } = customParts(raw); return { key, label: name || "Link", icon: Globe, href: url.trim() ? safeBioUrl(url.trim()) : null }; }
  const s = BIO_SOCIALS.find(x => x.key === key); return s ? { key, label: s.label, icon: s.icon, href: socialHref(s.key, raw) } : null;
}

export function socialHref(key: BioSocialKey, raw?: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const handle = v.replace(/^@/, "");
  if (key === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : null;
  if (key === "whatsapp") { const d = v.replace(/\D/g, ""); if (d.length < 10) return null; return `https://wa.me/${d.length <= 11 ? "55" + d : d}`; }
  if (/^https?:\/\//i.test(v)) return safeBioUrl(v);
  if (!/^[\w.-]{1,60}$/.test(handle)) return null;
  if (key === "instagram") return `https://www.instagram.com/${handle}/`;
  if (key === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (key === "facebook") return `https://www.facebook.com/${handle}`;
  if (key === "youtube") return `https://www.youtube.com/@${handle}`;
  if (key === "x") return `https://x.com/${handle}`;
  if (key === "threads") return `https://www.threads.net/@${handle}`;
  if (key === "pinterest") return `https://www.pinterest.com/${handle}`;
  if (key === "telegram") return `https://t.me/${handle}`;
  if (key === "site") return safeBioUrl(`https://${handle}`);
  return `https://www.linkedin.com/in/${handle}`;
}

const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function BioSocialIcons({ socials }: { socials?: Record<string, string>; interactive?: boolean }) {
  const items = Object.entries(socials ?? {}).map(([k, v]) => entryFor(k, v ?? "")).filter((s): s is NonNullable<typeof s> => !!s?.href);
  if (!items.length) return null;
  // No celular, abre na mesma aba para o sistema entregar o link ao app instalado (Instagram, WhatsApp...).
  return <div className="mt-4 flex flex-wrap justify-center gap-4">
    {items.map(({ key, label, icon: Icon, href }) =>
      <a key={key} href={href!} onClick={e => { if (isMobile() || href!.startsWith("mailto:")) { e.preventDefault(); window.location.href = href!; } }} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label}`} title={`Abrir ${label}`} className="cursor-pointer opacity-90 transition hover:scale-110 hover:opacity-100"><Icon className="h-6 w-6" /></a>)}
  </div>;
}

export function BioSocialsEditor({ value, onChange }: { value?: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const v = value ?? {};
  const [adding, setAdding] = useState(false);
  const available = BIO_SOCIALS.filter(s => !(s.key in v));
  const add = (k: string) => { onChange({ ...v, [k]: "" }); setAdding(false); };
  const remove = (k: string) => { const n = { ...v }; delete n[k]; onChange(n); };
  return <section className="space-y-4 border-b border-border pb-6">
    <div><h2 className="font-semibold">Ícones de redes sociais</h2><p className="text-sm text-muted-foreground">Aparecem abaixo do nome. Escolha as redes que quer mostrar ou adicione outra.</p></div>
    <div className="space-y-3">
      {Object.entries(v).map(([key, raw]) => {
        const e = entryFor(key, raw ?? ""); if (!e) return null;
        const Icon = e.icon;
        if (isCustom(key)) { const { name, url } = customParts(raw ?? ""); const invalid = !!url.trim() && !e.href;
          return <div key={key} className="flex items-center gap-2"><Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input aria-label="Nome da rede" placeholder="Nome (ex.: Kwai)" maxLength={30} value={name} className="w-40" onChange={ev => onChange({ ...v, [key]: `${ev.target.value.replace(/\|/g, "")}|${url}` })} />
            <Input aria-label="Link da rede" placeholder="https://..." maxLength={200} value={url} aria-invalid={invalid} className={invalid ? "border-destructive" : ""} onChange={ev => onChange({ ...v, [key]: `${name}|${ev.target.value}` })} />
            <Button type="button" size="icon" variant="ghost" aria-label="Remover" onClick={() => remove(key)}><X /></Button></div>; }
        const s = BIO_SOCIALS.find(x => x.key === key)!; const invalid = !!raw?.trim() && !e.href;
        return <div key={key} className="flex items-center gap-2"><Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input aria-label={s.label} placeholder={`${s.label}: ${s.placeholder}`} maxLength={200} value={raw ?? ""} aria-invalid={invalid} className={invalid ? "border-destructive" : ""} onChange={ev => onChange({ ...v, [key]: ev.target.value })} />
          <Button type="button" size="icon" variant="ghost" aria-label={`Remover ${s.label}`} onClick={() => remove(key)}><X /></Button></div>;
      })}
      {Object.keys(v).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma rede escolhida.</p>}
    </div>
    {adding ? <div className="flex flex-wrap gap-2 rounded-xl border border-border p-3">
      {available.map(({ key, label, icon: Icon }) => <Button key={key} type="button" variant="secondary" size="sm" onClick={() => add(key)}><Icon /> {label}</Button>)}
      <Button type="button" variant="neon" size="sm" onClick={() => add(`custom_${Date.now()}`)}><Plus /> Outra rede</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
    </div> : <Button type="button" variant="outline" onClick={() => setAdding(true)}><Plus /> Adicionar rede social</Button>}
  </section>;
}
