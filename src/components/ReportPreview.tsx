import { useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { Eye, FileDown, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePaymentSettings } from "@/components/InvoicePrint";
import { ReportDocument } from "@/components/ReportDocument";

type R = Parameters<typeof ReportDocument>[0]["r"];

export function ReportPreviewButton({ r, clientName }: { r: R; clientName?: string }) {
  const { data: settings } = usePaymentSettings();
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function print() {
    const html = ref.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para imprimir");
    w.document.write(`<html><head><title>${r.title}</title><style>@page{size:A4 landscape;margin:0}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-page{break-after:page;page-break-after:always}.report-page:last-child{break-after:auto;page-break-after:auto}</style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  async function pdf() {
    const pages = ref.current?.querySelectorAll(".report-page");
    if (!pages?.length) return;
    setBusy(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
      for (let i = 0; i < pages.length; i++) {
        const c = await html2canvas(pages[i] as HTMLElement, { scale: 2, backgroundColor: "#ffffff" });
        if (i) doc.addPage();
        const h = Math.min(H, (c.height * W) / c.width);
        doc.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, (c.width * h) / c.height, h);
      }
      doc.save(`${r.title.replace(/[^\w\- ]+/g, "")}.pdf`);
      toast.success("PDF salvo");
    } catch { toast.error("Não foi possível gerar o PDF"); } finally { setBusy(false); }
  }

  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Eye /> Visualizar relatório</Button></DialogTrigger>
      <DialogContent className="max-w-[min(1200px,95vw)]">
        <DialogHeader><DialogTitle>Relatório para impressão</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-auto rounded bg-white">
          <div ref={ref}><ReportDocument r={r} s={settings} clientName={clientName} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={print}><Printer /> Imprimir</Button>
          <Button size="sm" variant="neon" disabled={busy} onClick={pdf}>{busy ? <Loader2 className="animate-spin" /> : <FileDown />} Gerar PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
