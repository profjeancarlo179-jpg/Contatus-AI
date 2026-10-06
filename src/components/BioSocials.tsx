import { Facebook, Instagram, Linkedin, Mail, MessageCircle, Music2, Youtube, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { safeBioUrl } from "@/lib/bio";

export type BioSocialKey = "instagram" | "tiktok" | "whatsapp" | "email" | "facebook" | "youtube" | "linkedin";
export const BIO_SOCIALS: { key: BioSocialKey; label: string; icon: LucideIcon; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@usuario" },
  { key: "tiktok", label: "TikTok", icon: Music2, placeholder: "@usuario" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "65999999999" },
  { key: "email", label: "E-mail", icon: Mail, placeholder: "contato@email.com" },
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/..." },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@..." },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/..." },
];

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
  return `https://www.linkedin.com/in/${handle}`;
}

const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function BioSocialIcons({ socials }: { socials?: Record<string, string>; interactive?: boolean }) {
  const items = BIO_SOCIALS.map(s => ({ ...s, href: socialHref(s.key, socials?.[s.key]) })).filter(s => s.href);
  if (!items.length) return null;
  // No celular, abre na mesma aba para o sistema entregar o link ao app instalado (Instagram, WhatsApp...).
  return <div className="mt-4 flex flex-wrap justify-center gap-4">
    {items.map(({ key, label, icon: Icon, href }) =>
      <a key={key} href={href!} onClick={e => { if (isMobile() || href!.startsWith("mailto:")) { e.preventDefault(); window.location.href = href!; } }} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label}`} title={`Abrir ${label}`} className="cursor-pointer opacity-90 transition hover:scale-110 hover:opacity-100"><Icon className="h-6 w-6" /></a>)}
  </div>;
}

export function BioSocialsEditor({ value, onChange }: { value?: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return <section className="space-y-4 border-b border-border pb-6">
    <div><h2 className="font-semibold">Ícones de redes sociais</h2><p className="text-sm text-muted-foreground">Aparecem abaixo do nome. Deixe em branco para ocultar.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {BIO_SOCIALS.map(({ key, label, icon: Icon, placeholder }) => {
        const v = value?.[key] ?? "";
        const invalid = !!v.trim() && !socialHref(key, v);
        return <div key={key} className="flex items-center gap-2"><Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input aria-label={label} placeholder={`${label}: ${placeholder}`} maxLength={200} value={v} aria-invalid={invalid} className={invalid ? "border-destructive" : ""} onChange={e => onChange({ ...value, [key]: e.target.value })} />
        </div>;
      })}
    </div>
  </section>;
}
