import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, ImageIcon, KeyRound, Loader2, Lock, Plus, Search, Trash2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createUser } from "@/lib/users.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, useMediaUrls } from "@/lib/content";
import { isStaff, useAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Contatus AI" },
      { name: "description", content: "Cadastro de clientes com identidade visual, responsável e redes sociais." },
      { property: "og:title", content: "Clientes — Contatus AI" },
      { property: "og:description", content: "Cadastro de clientes com identidade visual, responsável e redes sociais." },
    ],
  }),
  component: Clientes,
});

const SOCIALS = [
  { key: "instagram", label: "Instagram", ph: "@perfil" },
  { key: "facebook", label: "Facebook", ph: "facebook.com/pagina" },
  { key: "tiktok", label: "TikTok", ph: "@perfil" },
  { key: "youtube", label: "YouTube", ph: "youtube.com/@canal" },
  { key: "linkedin", label: "LinkedIn", ph: "linkedin.com/company/..." },
  { key: "x", label: "X (Twitter)", ph: "@perfil" },
  { key: "pinterest", label: "Pinterest", ph: "pinterest.com/..." },
  { key: "threads", label: "Threads", ph: "@perfil" },
  { key: "kwai", label: "Kwai", ph: "@perfil" },
  { key: "whatsapp", label: "WhatsApp", ph: "(65) 99999-9999" },
  { key: "google", label: "Google Meu Negócio", ph: "Link do perfil" },
  { key: "site", label: "Site", ph: "https://..." },
];

type Client = {
  id: string; name: string; segment: string | null; profile_description: string | null; logo_path: string | null;
  brand_arts: string[]; brand_colors: string | null; brand_fonts: string | null;
  resp_name: string | null; resp_role: string | null; resp_email: string | null; resp_phone: string | null; resp_document: string | null;
  socials: Record<string, string>; observations: string | null; notes: string | null; user_id: string | null; user_ids: string[];
};

const EMPTY: Omit<Client, "id"> = {
  name: "", segment: "", profile_description: "", logo_path: null, brand_arts: [], brand_colors: "", brand_fonts: "",
  resp_name: "", resp_role: "", resp_email: "", resp_phone: "", resp_document: "", socials: {}, observations: "", notes: "", user_id: null, user_ids: [],
};

function Clientes() {
  const { data: access } = useAccess();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | "new">("new");
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["clients-db"],
    enabled: isStaff(access?.role),
    queryFn: async () => ((await supabase.from("clients").select("*").order("name")).data ?? []) as unknown as Client[],
  });
  if (access && !isStaff(access.role)) return <div className="glass rounded-xl p-8 text-center text-muted-foreground">Apenas Adm pode acessar.</div>;
  const current = data.find((c) => c.id === selected);
  const list = data.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Cadastro completo: identidade visual, responsável, redes sociais e anotações.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="glass h-fit space-y-2 rounded-xl p-3">
          <Button variant="neon" className="w-full" onClick={() => setSelected("new")}><Plus /> Novo cliente</Button>
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="pl-8" />
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {list.map((c) => <ClientRow key={c.id} c={c} active={selected === c.id} onClick={() => setSelected(c.id)} />)}
            {list.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum cliente.</p>}
          </div>
        </aside>
        <ClientForm
          key={selected}
          initial={current}
          onSaved={(id) => { qc.invalidateQueries({ queryKey: ["clients-db"] }); setSelected(id); }}
          onDeleted={() => { qc.invalidateQueries({ queryKey: ["clients-db"] }); setSelected("new"); }}
        />
      </div>
    </div>
  );
}

function ClientRow({ c, active, onClick }: { c: Client; active: boolean; onClick: () => void }) {
  const [logo] = useMediaUrls(c.logo_path ? [c.logo_path] : []);
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${active ? "bg-primary/15" : "hover:bg-muted"}`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
        {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{c.name}</div>
        <div className="truncate text-xs text-muted-foreground">{c.socials?.instagram || c.segment || "—"}</div>
      </div>
    </button>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="glass space-y-4 rounded-xl p-6">
      <h2 className="flex items-center gap-2 font-semibold">{icon}{title}</h2>
      {children}
    </div>
  );
}

function ClientForm({ initial, onSaved, onDeleted }: { initial?: Client; onSaved: (id: string) => void; onDeleted: () => void }) {
  const [d, setD] = useState<Omit<Client, "id">>(() => ({ ...EMPTY, ...(initial ?? {}), socials: { ...(initial?.socials ?? {}) } }));
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [creating, setCreating] = useState(false);
  const { data: users = [] } = useQuery({
    queryKey: ["client-users"],
    queryFn: async () => ((await supabase.rpc("list_clients")).data ?? []) as { id: string; email: string | null; full_name: string | null }[],
  });
  const [uploading, setUploading] = useState(false);
  const [logo] = useMediaUrls(d.logo_path ? [d.logo_path] : []);
  const arts = useMediaUrls(d.brand_arts);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const field = (k: keyof typeof d, label: string, ph = "", type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={(d[k] as string) ?? ""} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} />
    </div>
  );

  async function upload(files: FileList | null, target: "logo" | "arts") {
    if (!files?.length) return;
    setUploading(true);
    try {
      const paths = await Promise.all(Array.from(files).map(uploadMedia));
      if (target === "logo") set("logo_path", paths[0]);
      else set("brand_arts", [...d.brand_arts, ...paths]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function createLogin() {
    const email = (loginEmail || d.resp_email || "").trim();
    if (!email || loginPass.length < 6) return toast.error("Informe e-mail e senha (mín. 6 caracteres)");
    setCreating(true);
    try {
      const r = await createFn({ data: { email, password: loginPass, full_name: d.resp_name || d.name, agency_name: d.name, role: "client" } });
      const ids = [...new Set([...(d.user_ids ?? []), r.id])];
      setD((p) => ({ ...p, user_ids: ids, user_id: p.user_id ?? r.id }));
      qc.invalidateQueries({ queryKey: ["client-users"] });
      setLoginPass("");
      // Salva o cliente já com o usuário vinculado
      if (!d.name.trim()) { toast.success("Login criado. Informe o nome e clique em Salvar."); return; }
      const payload = { ...d, user_ids: ids, user_id: d.user_id ?? r.id, updated_at: new Date().toISOString() };
      const res = initial
        ? await supabase.from("clients").update(payload).eq("id", initial.id).select("id").single()
        : await supabase.from("clients").insert(payload).select("id").single();
      if (res.error) return toast.error(res.error.message);
      toast.success("Login criado, vinculado e cliente salvo");
      onSaved(res.data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar login");
    } finally { setCreating(false); }
  }

  async function save() {
    if (!d.name.trim()) return toast.error("Informe o nome do cliente");
    setBusy(true);
    const payload = { ...d, updated_at: new Date().toISOString() };
    const res = initial
      ? await supabase.from("clients").update(payload).eq("id", initial.id).select("id").single()
      : await supabase.from("clients").insert(payload).select("id").single();
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Cliente salvo");
    onSaved(res.data.id);
  }

  async function remove() {
    if (!initial || !confirm(`Excluir ${initial.name}?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", initial.id);
    if (error) return toast.error(error.message);
    onDeleted();
  }

  return (
    <div className="space-y-6">
      <Section title="Perfil">
        <div className="flex flex-wrap items-start gap-6">
          <label className="group relative grid h-28 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border bg-muted/40 hover:border-primary">
            {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : (
              <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><Upload className="h-4 w-4" />Logo</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files, "logo")} />
          </label>
          <div className="grid min-w-[240px] flex-1 gap-4 sm:grid-cols-2">
            {field("name", "Nome do cliente / marca", "Ex: Café Cuiabá")}
            {field("segment", "Segmento", "Ex: Cafeteria")}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição do perfil</Label>
              <Textarea rows={3} value={d.profile_description ?? ""} onChange={(e) => set("profile_description", e.target.value)} placeholder="Público, tom de voz, objetivos, diferenciais…" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Identidade visual · Arte padrão">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("brand_colors", "Cores da marca", "#1E1E1E, #F5A623…")}
          {field("brand_fonts", "Fontes", "Ex: Montserrat / Lora")}
        </div>
        <div className="space-y-2">
          <Label>Artes padrão (modelos, templates, referências)</Label>
          <div className="flex flex-wrap gap-3">
            {d.brand_arts.map((p, i) => (
              <div key={p} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted">
                {arts[i] ? <img src={arts[i]} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-auto h-5 w-5" />}
                <button onClick={() => set("brand_arts", d.brand_arts.filter((x) => x !== p))} className="absolute inset-0 hidden place-items-center bg-background/70 group-hover:grid"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files, "arts")} />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Dados do responsável">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("resp_name", "Nome")}
          {field("resp_role", "Cargo", "Ex: Proprietário")}
          {field("resp_email", "E-mail", "", "email")}
          {field("resp_phone", "Telefone / WhatsApp")}
          {field("resp_document", "CPF / CNPJ")}
        </div>
      </Section>

      <Section title="Acesso ao app (usuário e senha)" icon={<KeyRound className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          <Label>Usuários vinculados (marque um ou mais)</Label>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {users.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum usuário cliente cadastrado.</p>}
            {users.map((u) => {
              const checked = (d.user_ids ?? []).includes(u.id);
              return (
                <label key={u.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${checked ? "bg-primary/10" : "hover:bg-muted"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...(d.user_ids ?? []), u.id]
                        : (d.user_ids ?? []).filter((x) => x !== u.id);
                      setD((p) => ({ ...p, user_ids: ids, user_id: ids[0] ?? null }));
                    }}
                  />
                  <span className="truncate">{(u.full_name || u.email) + (u.full_name ? ` — ${u.email}` : "")}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{(d.user_ids ?? []).length} usuário(s) vinculado(s).</p>
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Ou crie um login novo para este cliente:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>E-mail (usuário)</Label><Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder={d.resp_email ?? ""} /></div>
            <div className="space-y-1.5"><Label>Senha (mín. 6)</Label><Input type="text" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} /></div>
          </div>
          <Button variant="outline" disabled={creating} onClick={createLogin}>{creating && <Loader2 className="animate-spin" />} Criar login, vincular e salvar</Button>
        </div>
        <div>
          <Button variant="neon" size="sm" onClick={save} disabled={busy || uploading}>{busy && <Loader2 className="animate-spin" />} Salvar acesso</Button>
        </div>
      </Section>

      <Section title="Redes sociais">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIALS.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <Label>{s.label}</Label>
              <Input value={d.socials[s.key] ?? ""} placeholder={s.ph} onChange={(e) => set("socials", { ...d.socials, [s.key]: e.target.value })} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Anotações gerais" icon={<Lock className="h-4 w-4 text-warning" />}>
        <p className="text-xs text-muted-foreground">Visível apenas para Adm e Adm Master. Use para acessos, senhas, combinados e observações.</p>
        <Textarea rows={6} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Ex: Instagram — login: … senha: …" />
      </Section>

      <div className="flex gap-2">
        <Button variant="neon" onClick={save} disabled={busy || uploading}>{busy && <Loader2 className="animate-spin" />} Salvar cliente</Button>
        {initial && <Button variant="outline" onClick={remove}><Trash2 /> Excluir</Button>}
      </div>
    </div>
  );
}
