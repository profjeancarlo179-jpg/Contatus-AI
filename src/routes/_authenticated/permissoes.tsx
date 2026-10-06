import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LayoutGrid, Pencil, UserPlus, PauseCircle, IdCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { createUser } from "@/lib/users.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_TABS, SUB_TABS, roleAllows } from "@/lib/access";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões — Contatus AI" },
      { name: "description", content: "Aprovação de acesso e perfis de usuários." },
      { property: "og:title", content: "Permissões — Contatus AI" },
      { property: "og:description", content: "Aprovação de acesso e perfis de usuários." },
    ],
  }),
  component: Permissoes,
});

const ROLES: Record<string, string> = { client: "Cliente", admin: "Adm", master: "Adm Master" };

type U = { id: string; email: string | null; full_name: string | null; agency_name: string | null; approved: boolean; role: string; created_at: string; paused: boolean };

function Permissoes() {
  const qc = useQueryClient();
  const { data = [], error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_users");
      if (error) throw error;
      return (data ?? []) as U[];
    },
  });
  const { data: tabMap = {} } = useQuery({
    queryKey: ["user-tabs"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_tab_access").select("user_id,tabs");
      return Object.fromEntries(((data ?? []) as { user_id: string; tabs: string[] }[]).map((r) => [r.user_id, r.tabs])) as Record<string, string[]>;
    },
  });
  const [editing, setEditing] = useState<U | null>(null);
  const [tab, setTab] = useState<"editar" | "novo" | "pausar" | "perfil">("editar");
  const [info, setInfo] = useState<U | null>(null);
  async function setPaused(u: U, paused: boolean) {
    const { error } = await (supabase as any).rpc("set_user_paused", { _user: u.id, _paused: paused });
    if (error) return toast.error(error.message.includes("yourself") ? "Você não pode pausar a si mesmo." : "Sem permissão.");
    toast.success(paused ? "Acesso pausado" : "Acesso reativado");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  async function setAccess(u: U, approved: boolean, role: string) {
    const { error } = await supabase.rpc("set_user_access", { _user: u.id, _approved: approved, _role: role });
    if (error) return toast.error(error.message.includes("yourself") ? "Você não pode rebaixar a si mesmo." : "Sem permissão.");
    toast.success("Acesso atualizado");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  if (error) return <div className="glass rounded-xl p-8 text-center text-muted-foreground">Apenas Adm Master pode acessar esta aba.</div>;

  const pending = data.filter((u) => !u.approved).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permissões</h1>
        <p className="text-muted-foreground">Aprove cadastros e defina o perfil de cada pessoa. {pending > 0 && <span className="text-warning">{pending} aguardando.</span>}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([["editar", "Editar", Pencil], ["novo", "Novo", UserPlus], ["pausar", "Pausar e bloquear", PauseCircle], ["perfil", "Perfil", IdCard]] as const).map(([k, l, I]) => (
          <Button key={k} variant={tab === k ? "neon" : "outline"} size="sm" onClick={() => setTab(k)}><I /> {l}</Button>
        ))}
      </div>
      {tab === "novo" && <NewUser onDone={() => { qc.invalidateQueries({ queryKey: ["users"] }); setTab("editar"); }} />}
      {tab === "pausar" && <PauseList users={data} onPause={setPaused} onBlock={(u, b) => setAccess(u, !b, u.role)} />}
      {tab === "perfil" && <ProfileList users={data} tabMap={tabMap} />}
      {tab === "editar" && <div className="glass overflow-hidden rounded-xl">
        <ul className="divide-y divide-border">
          {data.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}{u.agency_name ? ` · ${u.agency_name}` : ""}</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${u.approved ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                {u.paused ? "Pausado" : u.approved ? "Liberado" : "Pendente"}
              </span>
              <Select value={u.role} onValueChange={(r) => setAccess(u, u.approved, r)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={u.role === "master"} title={u.role === "master" ? "Adm Master vê tudo" : undefined} onClick={() => setEditing(u)}>
                <LayoutGrid /> Abas {u.role !== "master" && (tabMap[u.id] ? `(${tabMap[u.id].filter((x) => !x.includes("#")).length})` : "(todas)")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setInfo(u)}><Pencil /> Dados</Button>
              {!u.approved && <Button variant="neon" size="sm" onClick={() => setAccess(u, true, u.role)}>Aprovar acesso</Button>}
            </li>
          ))}
          {data.length === 0 && <li className="p-6 text-sm text-muted-foreground">Nenhum usuário.</li>}
        </ul>
      </div>}
      {info && <InfoDialog user={info} onClose={() => setInfo(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["users"] }); setInfo(null); }} />}
      {editing && <TabsDialog user={editing} current={tabMap[editing.id] ?? null} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["user-tabs"] }); setEditing(null); }} />}
    </div>
  );
}

function TabsDialog({ user, current, onClose, onSaved }: { user: U; current: string[] | null; onClose: () => void; onSaved: () => void }) {
  const available = APP_TABS.filter((t) => roleAllows(user.role, t.only));
  const allKeys = available.flatMap((t) => [t.to, ...(SUB_TABS[t.to] ?? []).map((x) => `${t.to}#${x.key}`)]);
  // Old saves without sub-tabs: a page checked with no sub-tab stored means all its sub-tabs.
  const [sel, setSel] = useState<string[]>(() => {
    if (!current) return allKeys;
    const out = [...current];
    for (const t of available) if (current.includes(t.to) && !current.some((c) => c.startsWith(t.to + "#"))) out.push(...(SUB_TABS[t.to] ?? []).map((x) => `${t.to}#${x.key}`));
    return out;
  });
  const toggle = (k: string, c: boolean) => setSel((s) => (c ? [...new Set([...s, k])] : s.filter((x) => x !== k)));
  function togglePage(to: string, c: boolean) {
    const subs = (SUB_TABS[to] ?? []).map((x) => `${to}#${x.key}`);
    setSel((s) => (c ? [...new Set([...s, to, ...subs])] : s.filter((x) => x !== to && !subs.includes(x))));
  }
  async function save(tabs: string[] | null) {
    const { error } = await (supabase as any).rpc("set_user_tabs", { _user: user.id, _tabs: tabs });
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("Abas atualizadas");
    onSaved();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Abas de {user.full_name || user.email}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Marque as abas e menus que esta pessoa pode ver ({ROLES[user.role]}).</p>
        <div className="flex gap-2 text-xs">
          <button className="text-primary hover:underline" onClick={() => setSel(allKeys)}>Marcar todas</button>
          <button className="text-primary hover:underline" onClick={() => setSel([])}>Desmarcar todas</button>
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {available.map((t) => (
            <div key={t.to} className="rounded-lg border border-border p-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox checked={sel.includes(t.to)} onCheckedChange={(c) => togglePage(t.to, !!c)} />
                {t.label}
              </label>
              {sel.includes(t.to) && SUB_TABS[t.to] && (
                <div className="mt-2 grid gap-1.5 pl-6 sm:grid-cols-2">
                  {SUB_TABS[t.to].map((x) => {
                    const k = `${t.to}#${x.key}`;
                    return (
                      <label key={k} className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox checked={sel.includes(k)} onCheckedChange={(c) => toggle(k, !!c)} />
                        {x.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => save(null)}>Voltar ao padrão</Button>
          <Button variant="neon" onClick={() => save(sel.filter((k) => !k.includes("#") || sel.includes(k.split("#")[0])))}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoDialog({ user, onClose, onSaved }: { user: U; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.full_name ?? "");
  const [agency, setAgency] = useState(user.agency_name ?? "");
  async function save() {
    const { error } = await (supabase as any).rpc("update_user_info", { _user: user.id, _full_name: name, _agency_name: agency });
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("Dados atualizados");
    onSaved();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar {user.email}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
          <div><Label>Empresa / agência</Label><Input value={agency} onChange={(e) => setAgency(e.target.value)} maxLength={120} /></div>
        </div>
        <div className="flex justify-end"><Button variant="neon" onClick={save}>Salvar</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function NewUser({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createUser);
  const [f, setF] = useState({ full_name: "", agency_name: "", email: "", password: "", role: "client" as "client" | "admin" | "master" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.trim().length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    setBusy(true);
    try {
      await create({ data: { ...f, password: f.password.trim() } });
      toast.success("Usuário criado e liberado");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar.");
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="glass grid max-w-xl gap-3 rounded-xl p-6">
      <div><Label>Nome</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
      <div><Label>Empresa / agência</Label><Input value={f.agency_name} onChange={(e) => setF({ ...f, agency_name: e.target.value })} /></div>
      <div><Label>E-mail *</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><Label>Senha *</Label><Input type="text" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
      <div><Label>Perfil</Label>
        <Select value={f.role} onValueChange={(r) => setF({ ...f, role: r as any })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button variant="neon" type="submit" disabled={busy}>{busy ? "Criando..." : "Criar usuário"}</Button>
    </form>
  );
}

function ProfileList({ users, tabMap }: { users: U[]; tabMap: Record<string, string[]> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {users.map((u) => {
        const tabs = tabMap[u.id];
        const pages = tabs ? tabs.filter((x) => !x.includes("#")) : null;
        return (
          <div key={u.id} className="glass space-y-3 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                {(u.full_name || u.email || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{u.full_name || "Sem nome"}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Perfil</dt><dd className="font-medium">{ROLES[u.role]}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Empresa</dt><dd className="truncate">{u.agency_name || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cadastro</dt><dd>{new Date(u.created_at).toLocaleDateString("pt-BR")}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Situação</dt>
                <dd className={u.paused ? "text-warning" : u.approved ? "text-success" : "text-destructive"}>{u.paused ? "Pausado" : u.approved ? "Ativo" : "Bloqueado"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Abas</dt>
                <dd className="text-right">{u.role === "master" ? "Todas (Adm Master)" : pages ? `${pages.length} aba(s)` : "Todas do perfil"}</dd></div>
            </dl>
          </div>
        );
      })}
      {users.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário.</p>}
    </div>
  );
}

function PauseList({ users, onPause, onBlock }: { users: U[]; onPause: (u: U, p: boolean) => void; onBlock: (u: U, b: boolean) => void }) {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <p className="border-b border-border p-4 text-sm text-muted-foreground"><b>Pausar</b> tira o acesso por um tempo (a pessoa vê "Acesso pausado"). <b>Bloquear</b> tira a aprovação do cadastro.</p>
      <ul className="divide-y divide-border">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{u.full_name || u.email}</div>
              <div className="text-xs text-muted-foreground">{u.email} · {ROLES[u.role]}</div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${u.paused ? "bg-warning/15 text-warning" : u.approved ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {u.paused ? "Pausado" : u.approved ? "Ativo" : "Bloqueado"}
            </span>
            <Button variant="outline" size="sm" onClick={() => onPause(u, !u.paused)}>{u.paused ? "Reativar" : "Pausar"}</Button>
            <Button variant={u.approved ? "outline" : "neon"} size="sm" onClick={() => onBlock(u, u.approved)}>{u.approved ? "Bloquear" : "Desbloquear"}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
