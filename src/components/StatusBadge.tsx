import { STATUS_CLASS, STATUS_LABEL } from "@/lib/content";

export function StatusBadge({ status, auto }: { status: string; auto?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? STATUS_CLASS.draft}`}>
      {STATUS_LABEL[status] ?? status}
      {auto && status === "approved" ? " · automático" : ""}
    </span>
  );
}
