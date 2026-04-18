"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { Receipt } from "./receipt";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: string | number;
  total: string | number;
  weight?: number | null;
}

interface ReceiptPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "sale" | "job-order";
  referenceNo: string;
  createdAt: Date | string;
  items: ReceiptItem[];
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  amountPaid?: string | number;
  change?: string | number;
  paymentMethod?: string;
  customerName?: string;
  contactNo?: string;
  tenantName: string;
  currencySymbol: string;
  assignedTo?: string | null;
  notes?: string | null;
}

export function ReceiptPrintDialog({
  open,
  onOpenChange,
  type,
  referenceNo,
  createdAt,
  items,
  subtotal,
  discount,
  total,
  amountPaid,
  change,
  paymentMethod,
  customerName,
  contactNo,
  tenantName,
  currencySymbol,
  assignedTo,
  notes,
}: ReceiptPrintDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Inject a print style that hides everything except the receipt
    const style = document.createElement("style");
    style.id = "__receipt-print-style";
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #__receipt-print-root { display: block !important; }
        @page { size: A4; margin: 10mm; }
      }
    `;
    document.head.appendChild(style);

    // Mount a print-only clone outside the dialog tree
    const root = document.createElement("div");
    root.id = "__receipt-print-root";
    root.style.display = "none";
    if (receiptRef.current) root.innerHTML = receiptRef.current.innerHTML;
    document.body.appendChild(root);

    window.print();

    // Clean up after print dialog closes
    const cleanup = () => {
      style.remove();
      root.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Receipt / Print</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {type === "sale" ? "Sales receipt" : "Job order claim receipt"}
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5">
          <div ref={receiptRef} className="overflow-hidden rounded-[24px] border border-border/60 bg-white">
            <Receipt
              type={type}
              referenceNo={referenceNo}
              createdAt={createdAt}
              items={items}
              subtotal={subtotal}
              discount={discount}
              total={total}
              amountPaid={amountPaid}
              change={change}
              paymentMethod={paymentMethod}
              customerName={customerName}
              contactNo={contactNo}
              tenantName={tenantName}
              currencySymbol={currencySymbol}
              assignedTo={assignedTo}
              notes={notes}
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2 rounded-full">
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2 rounded-full">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
