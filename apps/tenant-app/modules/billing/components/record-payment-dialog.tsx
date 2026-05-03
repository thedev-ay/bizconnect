"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CurrencyInputField } from "@/components/ui/currency-input-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordInvoicePayment } from "../actions";

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
] as const;

interface RecordPaymentDialogProps {
  tenantSlug: string;
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
  currencySymbol: string;
  maxAmount: number;
  onRecorded?: () => void;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  triggerClassName?: string;
}

export function RecordPaymentDialog({
  tenantSlug,
  tenantId,
  invoiceId,
  invoiceNo,
  currencySymbol,
  maxAmount,
  onRecorded,
  triggerLabel = "Record Payment",
  triggerVariant = "default",
  triggerClassName,
}: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState(maxAmount > 0 ? maxAmount.toFixed(2) : "");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_OPTIONS)[number]["value"]>("cash");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const selectedPaymentLabel = PAYMENT_OPTIONS.find((option) => option.value === paymentMethod)?.label;

  function resetForm() {
    setAmount(maxAmount > 0 ? maxAmount.toFixed(2) : "");
    setPaymentMethod("cash");
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setNotes("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await recordInvoicePayment(tenantSlug, tenantId, invoiceId, {
        amount: Number(amount),
        paymentMethod,
        receivedAt,
        notes,
      });
      toast.success("Payment recorded");
      setOpen(false);
      resetForm();
      onRecorded?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record payment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger
        render={<Button variant={triggerVariant} size="sm" className={triggerClassName} />}
        disabled={maxAmount <= 0}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[min(32rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 p-0 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.35)]">
        <DialogHeader className="space-y-1 border-b border-border/70 px-6 py-5 text-left">
          <p className="eyebrow-label">Billing / Payment</p>
          <DialogTitle className="font-mono text-base">{invoiceNo}</DialogTitle>
          <DialogDescription>
            Record a payment against this invoice. Outstanding balance: {currencySymbol}
            {maxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <CurrencyInputField
              currencySymbol={currencySymbol}
              label="Amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              max={maxAmount}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">Payment method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                <SelectTrigger>
                  {selectedPaymentLabel ? selectedPaymentLabel : <SelectValue placeholder="Select a method" />}
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">Payment date</Label>
              <Input type="date" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">Notes</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional payment reference or follow-up note"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !amount || !receivedAt || Number(amount) <= 0}>
            {submitting ? "Saving..." : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
