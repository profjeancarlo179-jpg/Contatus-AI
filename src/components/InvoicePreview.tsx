import { useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { Eye, FileDown, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoicePrint, printInvoicePaper, usePaymentSettings } from "@/components/InvoicePrint";
import type { Invoice } from "@/components/InvoiceCard";

export function InvoicePreviewButton({ i, clientName, clientDoc }: { i: Invoice; clientName: string; clientDoc?: string }) {
  const { data: settings } = usePaymentSettings();
  const [open, setOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  function print() {
    printInvoicePaper(screenRef.current);
  }

  async function savePdf() {
    const el = screenRef.current?.querySelector(".inv-paper");
    if (!el) return;
    setPdfBusy(true);
    try {
      const canvas = await html2canvas(el as HTMLElement, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * (pageW - 16)) / canvas.width;
      let remaining = imgH;
      let offset = 0;
      while (remaining > 0) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 8, 8 - offset, pageW - 16, imgH);
        offset += pageH - 16;
        remaining -= pageH - 16;
      }
      const num = `FAT${i.id.slice(0, 4).toUpperCase()}`;
      pdf.save(`${num}.pdf`);
      toast.success("PDF salvo");
    } catch {
      toast.error("Não foi possível gerar o PDF. Use Imprimir e escolha \"Salvar como PDF\".");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Eye /> Visualizar fatura</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Visualização da fatura</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="inv-screen printing-source" data-invoice={i.id} ref={screenRef}>
            <InvoicePrint i={i} s={settings} clientName={clientName} clientDoc={clientDoc} />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={print}><Printer /> Imprimir</Button>
          <Button size="sm" variant="neon" disabled={pdfBusy} onClick={savePdf}>{pdfBusy && <Loader2 className="animate-spin" />} Gerar PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
