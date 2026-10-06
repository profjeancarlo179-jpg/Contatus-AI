export type BioLink = { id: string; label: string; url: string; enabled: boolean };
export type Bio = { id?: string; slug: string; name: string; description: string; photo: string; links: BioLink[]; published: boolean };
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