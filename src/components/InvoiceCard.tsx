import type { ReactNode } from "react";

export type Invoice = {
  id: string; client_id: string; description: string; amount: number; due_date: string | null;
  notes: string | null; status: string; released: boolean; created_at: string; paid_at?: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning" },
  paga: { label: "Paga", cls: "bg-success/15 text-success" },
  cancelada: { label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
};

export function InvoiceCard({ i, clientName, actions }: { i: Invoice; clientName?: string; actions?: ReactNode }) {
  const s = STATUS[i.status] ?? STATUS.pendente;
  return (
    <div className="glass invoice-print rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{i.description}</p>
          <p className="text-xs text-muted-foreground">
            {clientName ? `${clientName} · ` : ""}Emitida em {new Date(i.created_at).toLocaleDateString("pt-BR")}
            {i.due_date ? ` · Vence ${new Date(i.due_date + "T00:00").toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold">{Number(i.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          <div className="mt-1 flex justify-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
            {clientName !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{i.released ? "Liberada" : "Rascunho"}</span>}
          </div>
          {i.status === "paga" && i.paid_at && <p className="mt-1 text-xs text-success">Pago em {new Date(i.paid_at).toLocaleDateString("pt-BR")}</p>}
        </div>
      </div>
      {i.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{i.notes}</p>}
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
