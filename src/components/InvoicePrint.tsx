import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/components/InvoiceCard";

export type PaymentSettings = {
  company_name: string; address: string; phone: string; whatsapp: string; email: string; website: string;
  logo: string | null; pix_qr?: string | null; instructions: string; pix_code: string; footer: string;
};

export function usePaymentSettings() {
  return useQuery({
    queryKey: ["payment_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("payment_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as PaymentSettings | null;
    },
  });
}

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const d = (s: string | null | undefined) => (s ? new Date(s.length === 10 ? s + "T00:00" : s).toLocaleDateString("pt-BR") : "—");
export const invoiceNumber = (i: Invoice) => `FAT${i.id.slice(0, 4).toUpperCase()}-${new Date(i.created_at).toLocaleDateString("pt-BR").replace(/\//g, "")}`;

function useQr(text: string) {
  const [url, setUrl] = useState("");
  useEffect(() => { if (text) QRCode.toDataURL(text, { margin: 0, width: 300 }).then(setUrl).catch(() => setUrl("")); else setUrl(""); }, [text]);
  return url;
}

/** Prints only the given invoice paper on a clean A4 page (single page, no leftovers). */
export function printInvoicePaper(source: HTMLElement | null) {
  const paper = source?.querySelector(".inv-paper");
  if (!paper) return;
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    document.body.appendChild(root);
  }
  root.innerHTML = "";
  root.appendChild(paper.cloneNode(true));
  document.body.classList.add("printing-invoice");
  const done = () => { document.body.classList.remove("printing-invoice"); root!.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}

/** Printable invoice (white paper layout). Hidden on screen, shown only when printing. */
export function InvoicePrint({ i, s, clientName, clientDoc }: { i: Invoice; s: PaymentSettings | null | undefined; clientName: string; clientDoc?: string }) {
  const gen = useQr(s?.pix_qr ? "" : (s?.pix_code ?? ""));
  const qr = s?.pix_qr || gen;
  const num = invoiceNumber(i);
  const contact = [s?.phone && `Tel: ${s.phone}`, s?.whatsapp && `WhatsApp: ${s.whatsapp}`, s?.email && `Email: ${s.email}`].filter(Boolean).join(" | ");
  const Logo = ({ size }: { size: number }) => s?.logo ? <img src={s.logo} alt="" style={{ width: size, height: size, objectFit: "contain" }} /> : null;
  return (
    <div className="inv-paper">
      <div className="inv-box">
        <div className="inv-head">
          <Logo size={70} />
          <div style={{ flex: 1 }}>
            <h2>{s?.company_name || "Sua empresa"}</h2>
            {s?.address && <p>{s.address}</p>}
            {contact && <p>{contact}</p>}
            {s?.website && <p>{s.website}</p>}
          </div>
        </div>
        <div className="inv-card inv-title"><b>FATURA:</b> <span>Nº {num} — Via Única</span>{i.status === "paga" && <strong className="inv-paid">PAGO {d(i.paid_at)}</strong>}</div>
        <div className="inv-card inv-row">
          <div><b>Cliente:</b> {clientName}</div>
          <div><b>Data:</b> {d(i.created_at)}</div>
          <div><b>Vencimento:</b> {d(i.due_date)}</div>
          <div><b>Valor Total:</b> {brl(i.amount)}</div>
        </div>
        <table className="inv-table">
          <thead><tr><th>Produto / Serviço</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td><b>{i.description}</b>{i.notes && <small>{i.notes}</small>}</td><td>1</td><td>{brl(i.amount)}</td><td>{brl(i.amount)}</td></tr>
            <tr className="inv-total"><td /><td /><td><b>Total:</b></td><td><b>{brl(i.amount)}</b></td></tr>
          </tbody>
        </table>
        {s?.footer && <p className="inv-foot">{s.footer}</p>}
      </div>
      <div className="inv-cut"><span>✂ Destacar aqui</span></div>
      <div className="inv-box">
        <div className="inv-head small">
          <Logo size={44} />
          <h3 style={{ flex: 1 }}>{s?.company_name}</h3>
          <div style={{ textAlign: "right" }}><b>BOLETO / COBRANÇA</b><p>Nº {num}</p></div>
        </div>
        <div className="inv-grid">
          <div className="inv-cell" style={{ gridColumn: "span 2" }}><label>Beneficiário:</label> {s?.company_name}<small>{s?.address}</small></div>
          <div className="inv-cell right"><label>Data do Vencimento:</label> {d(i.due_date)}</div>
          <div className="inv-cell"><label>Emissão:</label> {d(i.created_at)}</div>
          <div className="inv-cell"><label>Nº Documento:</label> {num}</div>
          <div className="inv-cell right"><label>Valor:</label> <b>{brl(i.amount)}</b></div>
          <div className="inv-cell" style={{ gridColumn: "span 2" }}><label>Pagador:</label> {clientName}</div>
          <div className="inv-cell"><label>CNPJ / CPF:</label> {clientDoc || "—"}</div>
        </div>
        <div className="inv-pay">
          <div className="inv-cell" style={{ flex: 1 }}><label>INSTRUÇÕES DE PAGAMENTO</label><p style={{ whiteSpace: "pre-wrap" }}>{s?.instructions}</p></div>
          {qr && <div className="inv-cell inv-qr"><b>PIX</b><img src={qr} alt="QR Code PIX" /></div>}
        </div>
        {s?.pix_code && <div className="inv-cell"><label>CHAVE PIX:</label> <code>{s.pix_code}</code></div>}
      </div>
    </div>
  );
}
