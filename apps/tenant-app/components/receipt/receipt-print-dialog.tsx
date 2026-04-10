"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "sale" ? "Sales Receipt" : "Job Order Claim Receipt"}
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="overflow-hidden rounded border bg-white">
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

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
