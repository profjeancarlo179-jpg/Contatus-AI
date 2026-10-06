import { useEffect } from "react";
import { useSubTabs } from "@/lib/access";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Link2, Loader2, Pause, Play, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BioPreview } from "@/components/BioPreview";
import { BioSocialsEditor } from "@/components/BioSocials";
import { BioAppearanceEditor, BioIconPicker } from "@/components/BioAppearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { bioPhoto, bioPublicUrl, safeBioUrl, type Bio } from "@/lib/bio";

export const Route = createFileRoute("/_authenticated/link-perfil")({
  head: () => ({ meta: [
    { title: "Link do perfil — Contatus AI" },
    { name: "description", content: "Crie e publique sua página de links na bio." },
    { property: "og:title", content: "Link do perfil — Contatus AI" },
    { property: "og:description", content: "Personalize sua página de links na bio." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ProfileLinks,
});
const empty = (): Bio => ({ slug: "", name: "", description: "", photo: "", links: [], published: false });
function ProfileLinks() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState("new");
  const { data: pages = [], isLoading, error } = useQuery({ queryKey: ["bio-pages"], queryFn: async () => {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) throw new Error("Entre novamente");
    const uid = session.user.id;
    const { data, error } = await supabase.from("bio_pages").select("*").or(`user_id.eq.${uid},client_id.not.is.null`).order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Array<{ user_id: string; client_id?: string | null }>;
    const otherClients = [...new Set(rows.filter(r => r.user_id !== uid && r.client_id).map(r => r.client_id as string))];
    const member = new Set<string>();
    await Promise.all(otherClients.map(async c => {
      const { data: ok } = await supabase.rpc("is_client_member" as never, { _client: c, _user: uid } as never);
      if (ok) member.add(c);
    }));
    return rows.filter(r => r.user_id === uid || (r.client_id && member.has(r.client_id)))
      .map(d => ({ ...d, clientId: d.client_id ?? null })) as unknown as Bio[];
  } });
  const [tab, setTab] = useState<"novo" | "editar" | "arquivo" | "redirect">("novo");
  const { data: clients = [] } = useQuery({ queryKey: ["bio-clients"], queryFn: async () => {
    const { data, error } = await supabase.from("clients").select("id, name").order("name");
    if (error) return [] as { id: string; name: string }[];
    return data;
  } });
  const clientLabel = (id?: string | null) => clients.find(x => x.id === id)?.name ?? null;
  const editId = selected;
  const current = pages.find(p => p.id === editId);
  const refresh = () => qc.invalidateQueries({ queryKey: ["bio-pages"] });
  async function togglePause(p: Bio & { paused?: boolean }) {
    const { error } = await supabase.from("bio_pages").update({ paused: !p.paused } as never).eq("id", p.id!);
    if (error) return toast.error("Não foi possível alterar");
    toast.success(p.paused ? "Página reativada" : "Página pausada"); await refresh();
  }
  const sub = useSubTabs("/link-perfil");
  useEffect(() => { if (sub.ready && !sub.can(tab)) setTab(sub.first("novo") as typeof tab); }, [sub.ready]);
  const tabs = [["novo", "Novo"], ["editar", "Editar"], ["arquivo", "Arquivo"], ["redirect", "Link de redirecionamento"]] as const;
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Link do perfil</h1>
    <div className="flex flex-wrap gap-2 border-b border-border pb-2">{tabs.filter(([k]) => sub.can(k)).map(([k, l]) => <Button key={k} variant={tab === k ? "secondary" : "ghost"} onClick={() => { setTab(k); if (k === "editar") setSelected("new"); }}>{l}</Button>)}</div>
    {isLoading ? <Loader2 className="animate-spin" /> : error ? <p className="text-destructive">Não foi possível carregar suas páginas.</p> : tab === "novo" ? (
      <BioEditor key="new" clients={clients} onSaved={async id => { await refresh(); setSelected(id); setTab("editar"); }} onDeleted={async () => { await refresh(); }} />
    ) : tab === "editar" ? (pages.length === 0 ? <p className="text-muted-foreground">Nenhuma página pronta ainda. Crie uma na aba Novo.</p> : !current ? <>
      <p className="text-muted-foreground">Escolha o perfil que deseja editar:</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pages.map(p => <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        {p.photo ? <img src={p.photo} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary"><Link2 /></div>}
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p>{clientLabel(p.clientId) && <p className="truncate text-xs text-muted-foreground">{clientLabel(p.clientId)}</p>}<p className={`text-sm ${p.published ? "text-success" : "text-muted-foreground"}`}>{p.published ? "Publicada" : "Rascunho"}</p></div>
        <Button variant="neon" onClick={() => setSelected(p.id!)}>Editar</Button>
      </div>)}</div>
    </> : <>
      <Button variant="ghost" onClick={() => setSelected("new")}><ArrowLeft /> Escolher outro perfil</Button>
      <BioEditor key={editId} initial={current} clients={clients} onSaved={async id => { await refresh(); setSelected(id); }} onDeleted={async () => { setSelected("new"); await refresh(); }} />
    </>) : tab === "arquivo" ? (pages.length === 0 ? <p className="text-muted-foreground">Nenhuma página salva.</p> :
      <div className="space-y-3">{(pages as (Bio & { paused?: boolean })[]).map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">/b/{p.slug}{clientLabel(p.clientId) ? ` · ${clientLabel(p.clientId)}` : ""} · {p.paused ? <span className="text-destructive">Pausada</span> : p.published ? <span className="text-success">Pública</span> : "Rascunho"}</p></div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { setSelected(p.id!); setTab("editar"); }}>Editar</Button>
          <Button variant={p.paused ? "neon" : "destructive"} onClick={() => togglePause(p)}>{p.paused ? <><Play /> Reativar</> : <><Pause /> Pausar</>}</Button>
        </div>
      </div>)}</div>) : (pages.length === 0 ? <p className="text-muted-foreground">Nenhuma página salva. Crie uma na aba Novo.</p> :
      <RedirectPreview pages={pages} />)}
  </div>;
}
function RedirectPreview({ pages }: { pages: Bio[] }) {
  const [sel, setSel] = useState(pages[0]?.id ?? "");
  const page = pages.find(p => p.id === sel) ?? pages[0];
  if (!page) return null;
  return <div className="space-y-6">
    <div className="mx-auto w-full max-w-[420px] space-y-4">
      {pages.length > 1 && <select aria-label="Escolher perfil" className="w-full rounded-md border border-border bg-card p-2 text-sm" value={page.id} onChange={e => setSel(e.target.value)}>
        {pages.map(p => <option key={p.id} value={p.id}>{p.name} (/b/{p.slug})</option>)}
      </select>}
      <h2 className="text-sm font-medium text-muted-foreground">Pré-visualização</h2>
      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-border bg-background"><div className={(page as Bio & { paused?: boolean }).paused ? "pointer-events-none select-none opacity-30 grayscale blur-[2px]" : ""} aria-hidden={(page as Bio & { paused?: boolean }).paused || undefined}><BioPreview bio={page} /></div>{(page as Bio & { paused?: boolean }).paused && <div className="absolute inset-0 grid place-items-center bg-background/60 p-8 text-center"><div className="space-y-3"><Pause className="mx-auto h-10 w-10 text-destructive" /><p className="text-lg font-semibold">Página temporariamente off-line</p><p className="text-sm text-muted-foreground">Entre em contato com o desenvolvedor para reativar.</p></div></div>}</div>
      {(page as Bio & { paused?: boolean }).paused ? null : !page.published ? <p className="text-sm text-muted-foreground">Esta página ainda é um rascunho e não está publicada.</p> : <div className="space-y-3">
        <p className="break-all text-sm text-success">{bioPublicUrl(page.slug)}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(bioPublicUrl(page.slug)); toast.success("Link copiado"); } catch { toast.error("Não foi possível copiar"); } }}><Copy /> Copiar link</Button>
          <Button variant="outline" asChild><a href={bioPublicUrl(page.slug)} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir</a></Button>
        </div>
      </div>}
    </div>
  </div>;
}
function BioEditor({ initial, clients, onSaved, onDeleted }: { initial?: Bio; clients: { id: string; name: string }[]; onSaved: (id: string) => Promise<void>; onDeleted: () => Promise<void> }) {
  const [bio, setBio] = useState<Bio>(initial ?? empty());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  function change(patch: Partial<Bio>) { setBio(p => ({ ...p, ...patch })); setDirty(true); }
  async function save() {
    if (!bio.name.trim()) return toast.error("Informe o nome do perfil");
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(bio.slug)) return toast.error("Endereço: use 3 a 40 letras minúsculas, números ou hífens");
    if (bio.links.some(l => !l.label.trim() || !safeBioUrl(l.url))) return toast.error("Preencha o título e um endereço http ou https em cada link");
    if (bio.published && !bio.links.some(l => l.enabled)) return toast.error("Adicione pelo menos um link ativo para publicar");
    setBusy(true);
    try {
      const payload = { name: bio.name.trim(), description: bio.description, photo: bio.photo, slug: bio.slug, links: bio.links, published: bio.published, appearance: { ...bio.appearance }, client_id: bio.clientId ?? null };
      const res = initial?.id ? await supabase.from("bio_pages").update(payload).eq("id", initial.id).select("id").single() : await supabase.from("bio_pages").insert(payload).select("id").single();
      if (res.error) throw res.error;
      await onSaved(res.data.id); setDirty(false); toast.success(bio.published ? "Página publicada" : "Rascunho salvo");
    } catch (e) { toast.error((e as { code?: string }).code === "23505" ? "Esse endereço já está em uso" : "Não foi possível salvar a página"); } finally { setBusy(false); }
  }
  function move(index: number, step: number) { const links = [...bio.links]; const target = index + step; if (target < 0 || target >= links.length) return; [links[index], links[target]] = [links[target], links[index]]; change({ links }); }
  const canShare = !!initial?.published && !dirty;
  return <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
    <div className="min-w-0 space-y-6">
      <section className="space-y-4 border-b border-border pb-6"><h2 className="font-semibold">Perfil</h2>
        <div className="flex flex-wrap items-center gap-4">
          {bio.photo && <img src={bio.photo} alt="Foto escolhida" className="h-16 w-16 rounded-full object-cover" />}
          <Button variant="outline" asChild><label className="cursor-pointer"><Upload />{uploading ? "Carregando…" : "Escolher foto"}<input aria-label="Foto do perfil" type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setUploading(true); try { change({ photo: await bioPhoto(file) }); } catch (err) { toast.error(err instanceof Error ? err.message : "Falha na foto"); } finally { setUploading(false); } }} /></label></Button>
          {bio.photo && <Button variant="ghost" size="icon" aria-label="Remover foto" title="Remover foto" onClick={() => change({ photo: "" })}><Trash2 /></Button>}
        </div>
        <div className="space-y-2"><Label htmlFor="bio-client">Cliente vinculado</Label><select id="bio-client" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" value={bio.clientId ?? ""} onChange={e => { const v = e.target.value || null; change({ clientId: v }); if (!initial && v && !bio.name.trim()) { const c = clients.find(x => x.id === v); if (c) change({ clientId: v, name: c.name }); } }}>
          <option value="">Nenhum (página sem cliente)</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></div>
        <div className="space-y-2"><Label htmlFor="bio-name">Nome do perfil</Label><Input id="bio-name" maxLength={100} value={bio.name} onChange={e => change({ name: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="bio-description">Descrição</Label><Textarea id="bio-description" maxLength={500} rows={3} value={bio.description} onChange={e => change({ description: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="bio-slug">Endereço da página</Label><div className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-sm text-muted-foreground">/b/</span><Input id="bio-slug" placeholder="sua-marca" maxLength={40} value={bio.slug} onChange={e => change({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></div></div>
      </section>
      <BioSocialsEditor value={bio.appearance?.socials} onChange={socials => change({ appearance: { ...bio.appearance, socials } })} />
      <BioAppearanceEditor value={bio.appearance} onChange={appearance => change({ appearance })} />
      <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Links</h2><Button variant="outline" size="sm" disabled={bio.links.length >= 30} onClick={() => change({ links: [...bio.links, { id: crypto.randomUUID(), label: "", url: "", enabled: true }] })}><Plus /> Adicionar link</Button></div>
        {bio.links.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum link adicionado.</p>}
        {bio.links.map((link, i) => <div key={link.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-1"><span className="mr-auto text-sm text-muted-foreground">Link {i + 1}</span><Switch aria-label={`Ativar link ${i + 1}`} checked={link.enabled} onCheckedChange={enabled => change({ links: bio.links.map(l => l.id === link.id ? { ...l, enabled } : l) })} />
            <Button size="icon" variant="ghost" title="Mover para cima" aria-label={`Mover link ${i + 1} para cima`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" title="Mover para baixo" aria-label={`Mover link ${i + 1} para baixo`} disabled={i === bio.links.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" title="Excluir link" aria-label={`Excluir link ${i + 1}`} onClick={() => change({ links: bio.links.filter(l => l.id !== link.id) })}><Trash2 /></Button>
          </div>
          <Input aria-label={`Título do link ${i + 1}`} placeholder="Título do botão" maxLength={100} value={link.label} onChange={e => change({ links: bio.links.map(l => l.id === link.id ? { ...l, label: e.target.value } : l) })} />
          <Input aria-label={`Endereço do link ${i + 1}`} placeholder="https://..." type="url" value={link.url} onChange={e => change({ links: bio.links.map(l => l.id === link.id ? { ...l, url: e.target.value } : l) })} />
          <BioIconPicker index={i + 1} value={link.icon} image={link.iconImage} onChange={(icon, iconImage) => change({ links: bio.links.map(l => l.id === link.id ? { ...l, icon, iconImage } : l) })} />
        </div>)}
      </section>
      <section className="space-y-4 border-t border-border pt-6"><div className="flex items-center gap-3"><Switch id="bio-publish" checked={bio.published} onCheckedChange={published => change({ published })} /><Label htmlFor="bio-publish">Página pública</Label></div>
        <div className="flex flex-wrap gap-2"><Button variant="neon" disabled={busy || uploading} onClick={save}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Salvar página</Button>{initial && <Button variant="ghost" disabled={busy} onClick={async () => { if (!confirm("Excluir esta página de links?")) return; const { error } = await supabase.from("bio_pages").delete().eq("id", initial.id ?? ""); if (error) return toast.error("Não foi possível excluir"); await onDeleted(); toast.success("Página excluída"); }}><Trash2 /> Excluir página</Button>}</div>
        {canShare && <div className="space-y-3"><p className="break-all text-sm text-success">{bioPublicUrl(bio.slug)}</p><div className="flex gap-2"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(bioPublicUrl(bio.slug)); toast.success("Link copiado"); } catch { toast.error("Não foi possível copiar"); } }}><Copy /> Copiar link</Button><Button variant="outline" asChild><a href={bioPublicUrl(bio.slug)} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir</a></Button></div></div>}
      </section>
    </div>
    <aside className="min-w-0 lg:sticky lg:top-44"><h2 className="mb-3 text-sm font-medium text-muted-foreground">Pré-visualização</h2><div className="min-h-[520px] overflow-hidden rounded-lg border border-border bg-background"><BioPreview bio={bio} /></div></aside>
  </div>;
}