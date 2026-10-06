import { Instagram, Facebook, Youtube, Music2, MessageCircle, Globe, Mail, Phone, MapPin, ShoppingBag, Calendar, FileText, Link2, Linkedin, X, Send, Heart, Camera, Upload, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BIO_THEMES, bioAppearance, bioIconImage, type BioAppearance } from "@/lib/bio";

const ICONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "none", label: "Sem ícone", icon: X }, { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle }, { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "youtube", label: "YouTube", icon: Youtube }, { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin }, { key: "site", label: "Site", icon: Globe },
  { key: "email", label: "E-mail", icon: Mail }, { key: "phone", label: "Telefone", icon: Phone },
  { key: "map", label: "Localização", icon: MapPin }, { key: "shop", label: "Loja", icon: ShoppingBag },
  { key: "calendar", label: "Agendamento", icon: Calendar }, { key: "document", label: "Documento", icon: FileText },
  { key: "telegram", label: "Telegram", icon: Send }, { key: "heart", label: "Coração", icon: Heart },
  { key: "camera", label: "Portfólio", icon: Camera }, { key: "link", label: "Link", icon: Link2 },
];
export function BioLinkIcon({ name, image }: { name?: string; image?: string }) {
  if (image) return <img src={image} alt="" aria-hidden="true" className="h-6 w-6 shrink-0 rounded-md object-cover" />;
  const Icon = ICONS.find(i => i.key === name && i.key !== "none")?.icon;
  return Icon ? <Icon aria-hidden="true" className="h-5 w-5 shrink-0" /> : null;
}
export function BioIconPicker({ value, image, onChange, index }: { value?: string; image?: string; onChange: (value: string, image?: string) => void; index: number }) {
  return <fieldset className="space-y-2"><legend className="text-xs text-muted-foreground">Ícone do link</legend><div className="flex flex-wrap items-center gap-1.5">{ICONS.map(i => <Button key={i.key} variant={!image && (value === i.key || (!value && i.key === "none")) ? "secondary" : "ghost"} size="icon" aria-label={`Ícone ${i.label} no link ${index}`} aria-pressed={!image && (value === i.key || (!value && i.key === "none"))} title={i.label} onClick={() => onChange(i.key, undefined)}><i.icon /></Button>)}
    <Button variant={image ? "secondary" : "ghost"} size="icon" asChild title="Enviar ícone próprio"><label className="cursor-pointer" aria-label={`Enviar ícone próprio no link ${index}`}>{image ? <img src={image} alt="" className="h-5 w-5 rounded object-cover" /> : <Upload />}<input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; try { onChange("custom", await bioIconImage(file)); } catch (err) { toast.error(err instanceof Error ? err.message : "Falha no ícone"); } }} /></label></Button>
  </div>{image && <p className="text-xs text-muted-foreground">Ícone próprio em uso. Escolha outro ícone acima para substituir.</p>}</fieldset>;
}
export function BioAppearanceEditor({ value, onChange }: { value?: BioAppearance; onChange: (value: BioAppearance) => void }) {
  const a = bioAppearance(value);
  const set = (patch: Partial<BioAppearance>) => onChange({ ...value, ...a, ...patch });
  return <section className="space-y-5 border-b border-border pb-6"><h2 className="font-semibold">Personalizar página</h2>
    <fieldset><legend className="mb-2 text-sm">Temas</legend><div className="flex flex-wrap gap-2">{BIO_THEMES.map((theme, i) => <Button key={theme.name} variant="outline" title={theme.name} aria-label={`Tema ${theme.name}`} onClick={() => onChange({ ...value, ...a, ...theme.colors })}><span className={`bio-theme-swatch bio-theme-swatch-${i}`} />{theme.name}</Button>)}</div></fieldset>
    <div className="grid grid-cols-2 gap-4">{([{ key: "background", label: "Cor da página" }, { key: "text", label: "Cor do texto" }, { key: "button", label: "Cor dos botões" }, { key: "buttonText", label: "Texto dos botões" }] as const).map(({ key, label }) => <div key={key} className="space-y-2"><Label htmlFor={`bio-color-${key}`}>{label}</Label><div className="flex items-center gap-2"><Input id={`bio-color-${key}`} type="color" value={a[key]} onChange={e => set({ [key]: e.target.value })} className="h-10 w-14 shrink-0 cursor-pointer p-1" /><span className="text-xs uppercase text-muted-foreground">{a[key]}</span></div></div>)}</div>
    <fieldset><legend className="mb-2 text-sm">Formato dos botões</legend><div className="flex flex-wrap gap-2">{[{ key: "rounded", label: "Arredondado" }, { key: "pill", label: "Cápsula" }, { key: "square", label: "Reto" }].map(o => <Button key={o.key} variant={a.shape === o.key ? "secondary" : "outline"} aria-pressed={a.shape === o.key} onClick={() => set({ shape: o.key })}>{o.label}</Button>)}</div></fieldset>
    <fieldset><legend className="mb-2 text-sm">Estilo dos botões</legend><div className="flex flex-wrap gap-2">{[{ key: "solid", label: "Preenchido" }, { key: "outline", label: "Contorno" }].map(o => <Button key={o.key} variant={a.buttonStyle === o.key ? "secondary" : "outline"} aria-pressed={a.buttonStyle === o.key} onClick={() => set({ buttonStyle: o.key })}>{o.label}</Button>)}</div></fieldset>
    <fieldset><legend className="mb-2 text-sm">Fonte</legend><div className="flex flex-wrap gap-2">{[{ key: "manrope", label: "Manrope" }, { key: "sora", label: "Sora" }, { key: "system", label: "Clássica" }].map(o => <Button key={o.key} variant={a.font === o.key ? "secondary" : "outline"} aria-pressed={a.font === o.key} onClick={() => set({ font: o.key })}>{o.label}</Button>)}</div></fieldset>
  </section>;
}