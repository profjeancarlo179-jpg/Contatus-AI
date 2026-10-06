export type BioLink = { id: string; label: string; url: string; enabled: boolean; icon?: string; iconImage?: string };
export type BioAppearance = { background?: string; text?: string; button?: string; buttonText?: string; shape?: string; buttonStyle?: string; font?: string; socials?: Record<string, string> };
export type Bio = { id?: string; slug: string; name: string; description: string; photo: string; links: BioLink[]; published: boolean; appearance?: BioAppearance };
export const BIO_DEFAULTS = { background: "#101014", text: "#f4f4f6", button: "#25212f", buttonText: "#f4f4f6", shape: "rounded", buttonStyle: "solid", font: "manrope" };
export const BIO_THEMES = [
  { name: "Grafite", colors: BIO_DEFAULTS },
  { name: "Verde", colors: { ...BIO_DEFAULTS, background: "#e5f4e5", text: "#163525", button: "#205640", buttonText: "#ffffff" } },
  { name: "Rosa", colors: { ...BIO_DEFAULTS, background: "#fce5ed", text: "#512639", button: "#a52c58", buttonText: "#ffffff" } },
  { name: "Azul", colors: { ...BIO_DEFAULTS, background: "#e8f1ff", text: "#153350", button: "#225b96", buttonText: "#ffffff" } },
];
export function bioAppearance(value?: BioAppearance) {
  const result = { ...BIO_DEFAULTS };
  for (const key of ["background", "text", "button", "buttonText"] as const) {
    if (/^#[0-9a-f]{6}$/i.test(value?.[key] ?? "")) result[key] = value?.[key] ?? result[key];
  }
  result.shape = ["rounded", "pill", "square"].includes(value?.shape ?? "") ? value?.shape ?? result.shape : result.shape;
  result.buttonStyle = ["solid", "outline"].includes(value?.buttonStyle ?? "") ? value?.buttonStyle ?? result.buttonStyle : result.buttonStyle;
  result.font = ["manrope", "sora", "system"].includes(value?.font ?? "") ? value?.font ?? result.font : result.font;
  return result;
}
export function safeBioUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export const bioPublicUrl = (slug: string) => `https://contatus-ai.lovable.app/b/${slug}`;
export async function bioPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Escolha uma imagem de até 10 MB");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 400; canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível carregar a foto");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 400, 400);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}