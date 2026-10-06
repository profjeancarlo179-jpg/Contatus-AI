export type MetricDef = { key: string; label: string; short: string; color: string; w: number; icon: string };

export const METRICS: MetricDef[] = [
  { key: "alcanceFb", label: "Alcance do Facebook", short: "FB Ads", color: "#1877f2", w: 0.10, icon: "🔵" },
  { key: "alcanceIg", label: "Alcance do Instagram", short: "IG Ads", color: "#e1306c", w: 0.40, icon: "📸" },
  { key: "maps", label: "Buscas no Google Maps", short: "Google Maps", color: "#ea4335", w: 0.15, icon: "📍" },
  { key: "visualizacoes", label: "Visualizações totais", short: "Totais", color: "#2cb574", w: 0.12, icon: "👁️" },
  { key: "visualizadores", label: "Visualizadores únicos", short: "Únicos", color: "#4c5fd7", w: 0.09, icon: "👥" },
  { key: "cliques", label: "Cliques no link", short: "Cliques link", color: "#f4b400", w: 0.03, icon: "🔗" },
  { key: "linktree", label: "Visitas aos Contatos", short: "Contatos", color: "#39e587", w: 0.025, icon: "📇" },
  { key: "visitas", label: "Visitas ao perfil", short: "Visitas", color: "#1098ad", w: 0.04, icon: "🚪" },
  { key: "seguidores", label: "Novos seguidores", short: "Seguidores", color: "#6f42c1", w: 0.03, icon: "➕" },
  { key: "interacoes", label: "Interações com o conteúdo", short: "Interações", color: "#fd7e14", w: 0.015, icon: "💬" },
];

export const GROUPS = [
  { title: "1. Canais de alcance e descoberta", keys: ["alcanceFb", "alcanceIg", "maps"] },
  { title: "2. Volume de visualizações", keys: ["visualizacoes", "visualizadores"] },
  { title: "3. Cliques e direcionamento", keys: ["cliques", "linktree"] },
  { title: "4. Engajamento e crescimento", keys: ["visitas", "seguidores", "interacoes"] },
];

export const mByKey: Record<string, MetricDef> = Object.fromEntries(METRICS.map((m) => [m.key, m]));

export type PctRow = { name: string; pct: string };
export type AgeRow = { range: string; f: string; m: string };
export type ReportExtra = {
  growth?: Record<string, string>;
  stories?: string; posts?: string; contentCompare?: string;
  p25?: string; p50?: string; p75?: string;
  cities?: PctRow[]; countries?: PctRow[]; ages?: AgeRow[];
  generatedBy?: string;
};

export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export const emptyExtra = (): ReportExtra => ({
  growth: {}, cities: [{ name: "", pct: "" }], countries: [{ name: "Brasil", pct: "" }],
  ages: AGE_RANGES.map((range) => ({ range, f: "", m: "" })),
});

export function getExtra(metrics: Record<string, unknown>): ReportExtra {
  const x = metrics?._x;
  return x && typeof x === "object" ? (x as ReportExtra) : {};
}

export const num = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
export const fmtN = (v: unknown) => num(v).toLocaleString("pt-BR");
