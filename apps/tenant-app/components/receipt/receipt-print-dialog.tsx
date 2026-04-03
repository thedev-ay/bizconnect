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
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (!previewRef.current || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const receiptHTML = previewRef.current.innerHTML;

    // Create a complete HTML document with Tailwind CSS
    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${type === "sale" ? "Sales Receipt" : "Job Order Claim Receipt"} - ${referenceNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; }
            @media print {
              body { margin: 0; padding: 10mm; }
              @page { size: A4; margin: 0; }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
        </body>
      </html>
    `;

    // Write to iframe and print
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printDocument);
      doc.close();

      // Wait for content to render before printing
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "sale" ? "Sales Receipt" : "Job Order Claim Receipt"}
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div
          ref={previewRef}
          className="overflow-hidden rounded border bg-white"
        >
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

        {/* Hidden iframe for printing */}
        <iframe
          ref={iframeRef}
          style={{ display: "none" }}
          title="Receipt Print"
        />

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
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
