import type { Content } from "@/lib/content";

export function FeedbackCard({ content }: { content: Content }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
      <div className="text-sm font-semibold text-destructive">Notas do cliente</div>
      {content.rejection_reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {content.rejection_reasons.map((r) => (
            <span key={r} className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">{r}</span>
          ))}
        </div>
      )}
      {content.feedback && <p className="mt-2 text-sm whitespace-pre-line">{content.feedback}</p>}
    </div>
  );
}
