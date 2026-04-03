"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: string | number;
  total: string | number;
  weight?: number | null;
}

interface ReceiptProps {
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

export function Receipt({
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
}: ReceiptProps) {
  const isJobOrder = type === "job-order";
  const formattedDate = typeof createdAt === "string" ? createdAt : format(new Date(createdAt), "MMM dd, yyyy HH:mm");
  const subtotalNum = typeof subtotal === "string" ? parseFloat(subtotal) : subtotal;
  const discountNum = typeof discount === "string" ? parseFloat(discount) : discount;
  const totalNum = typeof total === "string" ? parseFloat(total) : total;
  const amountPaidNum = amountPaid ? (typeof amountPaid === "string" ? parseFloat(amountPaid) : amountPaid) : 0;
  const changeNum = change ? (typeof change === "string" ? parseFloat(change) : change) : 0;

  return (
    <div className={cn("bg-white text-black", "print:h-full print:m-0 print:p-4")}>
      {/* Receipt Container - A4 size for printing */}
      <div className="mx-auto w-full max-w-sm space-y-4 p-4 print:max-w-full print:p-0 print:text-xs">
        {/* Header */}
        <div className="space-y-1 border-b pb-3 text-center">
          <h1 className="text-lg font-bold">{tenantName}</h1>
          <p className="text-xs text-gray-600">
            {isJobOrder ? "JOB ORDER CLAIM" : "SALES RECEIPT"}
          </p>
          <p className="text-xs font-mono font-semibold">{referenceNo}</p>
          <p className="text-xs text-gray-600">{formattedDate}</p>
        </div>

        {/* Customer Info */}
        {(customerName || contactNo) && (
          <div className="space-y-1 border-b pb-3 text-xs">
            {customerName && (
              <div className="flex justify-between">
                <span className="font-medium">Customer:</span>
                <span>{customerName}</span>
              </div>
            )}
            {contactNo && (
              <div className="flex justify-between">
                <span className="font-medium">Contact:</span>
                <span>{contactNo}</span>
              </div>
            )}
            {assignedTo && (
              <div className="flex justify-between">
                <span className="font-medium">Assigned To:</span>
                <span>{assignedTo}</span>
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        <div className="space-y-2 border-b pb-3">
          <div className="flex justify-between gap-2 border-b pb-1 text-xs font-semibold">
            <div className="flex-1">Item</div>
            <div className="w-12 text-center">Qty</div>
            <div className="w-16 text-right">Price</div>
            <div className="w-16 text-right">Total</div>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="text-xs">
              <div className="flex justify-between gap-2">
                <div className="flex-1 break-words">
                  <div className="font-medium">{item.name}</div>
                  {item.weight && (
                    <div className="text-gray-600">
                      {item.weight} kg
                    </div>
                  )}
                </div>
                <div className="w-12 text-center">{item.quantity}</div>
                <div className="w-16 text-right">
                  {currencySymbol}
                  {typeof item.unitPrice === "number"
                    ? item.unitPrice.toFixed(2)
                    : item.unitPrice}
                </div>
                <div className="w-16 text-right font-medium">
                  {currencySymbol}
                  {typeof item.total === "number"
                    ? item.total.toFixed(2)
                    : item.total}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-1 border-b pb-3 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-mono">
              {currencySymbol}
              {subtotalNum.toFixed(2)}
            </span>
          </div>
          {discountNum > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span className="font-mono">
                -{currencySymbol}
                {discountNum.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>Total:</span>
            <span className="font-mono">
              {currencySymbol}
              {totalNum.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Info (POS only) */}
        {!isJobOrder && (
          <div className="space-y-1 border-b pb-3 text-xs">
            {paymentMethod && (
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="capitalize">{paymentMethod}</span>
              </div>
            )}
            {amountPaidNum > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-mono">
                    {currencySymbol}
                    {amountPaidNum.toFixed(2)}
                  </span>
                </div>
                {changeNum > 0 && (
                  <div className="flex justify-between font-medium">
                    <span>Change:</span>
                    <span className="font-mono">
                      {currencySymbol}
                      {changeNum.toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="space-y-1 border-b pb-3 text-xs">
            <p className="font-medium">Notes:</p>
            <p className="whitespace-pre-wrap text-gray-700">{notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="space-y-2 text-center text-xs text-gray-600">
          <p>Thank you for your business!</p>
          <p className="py-2 text-[10px]">
            {type === "sale"
              ? "Please keep this receipt for your records"
              : "Job order claim receipt"}
          </p>
          <p className="text-[10px]">{format(new Date(), "yyyy-MM-dd HH:mm:ss")}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background: white;
          }
          .print\\:h-full {
            height: 100%;
          }
          .print\\:m-0 {
            margin: 0;
          }
          .print\\:p-0 {
            padding: 0;
          }
          .print\\:p-4 {
            padding: 1rem;
          }
          .print\\:max-w-full {
            max-width: 100%;
          }
          .print\\:text-xs {
            font-size: 0.75rem;
            line-height: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
