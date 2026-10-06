import type { CSSProperties } from "react";
import { GROUPS, METRICS, fmtN, getExtra, mByKey, num } from "@/lib/report-metrics";

type R = { title: string; period: string | null; network: string; metrics: Record<string, unknown>; notes: string | null; created_at: string };
type S = { company_name?: string; logo?: string | null } | null | undefined;

const card: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#fff" };
const h3: CSSProperties = { fontSize: 12, fontWeight: 700, margin: "0 0 8px", color: "#111827" };

function Bars({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, borderBottom: "1px solid #d1d5db" }}>
      {items.map((i) => (
        <div key={i.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
          <span style={{ fontSize: 9, fontWeight: 700 }}>{i.value.toLocaleString("pt-BR")}</span>
          <div style={{ width: "70%", height: `${(i.value / max) * 85}%`, minHeight: 2, background: i.color, borderRadius: "3px 3px 0 0" }} />
        </div>
      ))}
    </div>
  );
}

export function ReportDocument({ r, s, clientName }: { r: R; s: S; clientName?: string }) {
  const x = getExtra(r.metrics);
  const total = METRICS.reduce((a, m) => a + num(r.metrics[m.key]), 0) || 1;
  const stories = num(x.stories), posts = num(x.posts), maxSP = Math.max(1, stories, posts);
  const cities = (x.cities ?? []).filter((c) => c.name);
  const countries = (x.countries ?? []).filter((c) => c.name);
  const ages = (x.ages ?? []).filter((a) => a.f || a.m);
  const ageMax = Math.max(1, ...ages.flatMap((a) => [num(a.f), num(a.m)]));
  const yours = stories + posts;
  const pct = [["25° percentil", x.p25], ["50° percentil", x.p50], ["75° percentil", x.p75]].filter(([, v]) => v) as [string, string][];
  const hasPage2 = cities.length || countries.length || ages.length || pct.length;
  const date = new Date(r.created_at).toLocaleDateString("pt-BR");

  const Header = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
      {s?.logo ? <img src={s.logo} alt="" style={{ width: 90, height: 60, objectFit: "contain" }} /> : <strong style={{ fontSize: 14 }}>{s?.company_name}</strong>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>{r.title}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{[clientName, r.network, r.period].filter(Boolean).join(" · ")}</div>
      </div>
    </div>
  );

  return (
    <div className="report-doc" style={{ background: "#fff", color: "#111827", fontFamily: "Calibri, Arial, sans-serif" }}>
      <div className="report-page" style={{ width: "277mm", minHeight: "190mm", padding: "8mm", boxSizing: "border-box" }}>
        <Header />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 10px" }}>Insights sobre a conta :</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {METRICS.map((m) => {
                const v = num(r.metrics[m.key]); const g = x.growth?.[m.key];
                return (
                  <div key={m.key} style={{ ...card, borderLeft: `4px solid ${m.color}`, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#4b5563" }}>{m.icon} {m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, margin: "2px 0" }}>{v.toLocaleString("pt-BR")}</div>
                    {g && <div style={{ fontSize: 9, color: num(g) < 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{num(g) < 0 ? "↓" : "↑"} {g.replace("-", "")}%</div>}
                    <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginTop: 4 }}>
                      <div style={{ height: 4, width: `${Math.min(100, (v / total) * 200)}%`, background: m.color, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(stories > 0 || posts > 0) && (
              <div style={card}>
                <div style={h3}>Conteúdo publicado</div>
                {x.contentCompare && <div style={{ display: "inline-block", fontSize: 9, background: "#dcfce7", color: "#166534", borderRadius: 8, padding: "1px 6px", marginBottom: 4 }}>{x.contentCompare}</div>}
                {[["Stories", stories], ["Posts", posts]].map(([l, v]) => (
                  <div key={l as string} style={{ fontSize: 10, marginTop: 4 }}>{l}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ height: 6, width: `${((v as number) / maxSP) * 90}%`, background: "#2b8ac8" }} /><span>{v as number}</span></div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {GROUPS.map((g) => (
                <div key={g.title} style={card}>
                  <div style={h3}>{g.title}</div>
                  <Bars items={g.keys.map((k) => ({ label: mByKey[k].short, value: num(r.metrics[k]), color: mByKey[k].color }))} />
                  <div style={{ display: "flex", gap: 10 }}>{g.keys.map((k) => <span key={k} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#6b7280" }}>{mByKey[k].short}</span>)}</div>
                </div>
              ))}
            </div>
            {r.notes && <div style={{ ...card, fontSize: 10, whiteSpace: "pre-line" }}><div style={h3}>Observações</div>{r.notes}</div>}
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12 }}>Gerado por {x.generatedBy ? `USUÁRIO: ${x.generatedBy}` : s?.company_name} - {date}</div>
      </div>

      {hasPage2 ? (
        <div className="report-page" style={{ width: "277mm", minHeight: "190mm", padding: "8mm", boxSizing: "border-box", breakBefore: "page" }}>
          <Header />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {cities.length > 0 && (
              <div style={card}>
                <div style={h3}>Principais cidades</div>
                {cities.map((c) => (
                  <div key={c.name} style={{ fontSize: 10, marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>{c.name}</span><b>{c.pct}%</b></div>
                    <div style={{ height: 5, background: "#e5e7eb", borderRadius: 3 }}><div style={{ height: 5, width: `${Math.min(100, num(c.pct))}%`, background: "#2b8ac8", borderRadius: 3 }} /></div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {countries.length > 0 && (
                <div style={card}>
                  <div style={h3}>Principais países</div>
                  {countries.map((c) => (
                    <div key={c.name} style={{ fontSize: 10, marginBottom: 5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>{c.name}</span><b>{c.pct}%</b></div>
                      <div style={{ height: 5, background: "#e5e7eb", borderRadius: 3 }}><div style={{ height: 5, width: `${Math.min(100, num(c.pct))}%`, background: "#2b8ac8", borderRadius: 3 }} /></div>
                    </div>
                  ))}
                </div>
              )}
              {pct.length > 0 && (
                <div style={card}>
                  <div style={h3}>Conteúdo publicado: {yours}</div>
                  <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 6 }}>A frequência dos posts da sua empresa comparada a outras empresas nessa categoria</div>
                  <Bars items={[...pct.map(([l, v]) => ({ label: l, value: num(v), color: "#93c5fd" })), { label: "Sua empresa", value: yours, color: "#2563eb" }]} />
                  <div style={{ display: "flex", gap: 10 }}>{[...pct.map(([l]) => l), "Sua empresa"].map((l) => <span key={l} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#6b7280" }}>{l}</span>)}</div>
                </div>
              )}
              {ages.length > 0 && (
                <div style={card}>
                  <div style={h3}>Faixa etária e gênero</div>
                  <div style={{ display: "flex", gap: 10, fontSize: 9, marginBottom: 4 }}><span><b style={{ color: "#2563eb" }}>■</b> Mulheres</span><span><b style={{ color: "#60a5fa" }}>■</b> Homens</span></div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, borderBottom: "1px solid #d1d5db" }}>
                    {ages.map((a) => (
                      <div key={a.range} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: "100%" }}>
                        {[[a.f, "#2563eb"], [a.m, "#60a5fa"]].map(([v, c], i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "40%" }}>
                            <span style={{ fontSize: 8 }}>{num(v)}%</span>
                            <div style={{ width: "100%", height: `${(num(v) / ageMax) * 80}%`, minHeight: 1, background: c }} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>{ages.map((a) => <span key={a.range} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#6b7280" }}>{a.range}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
