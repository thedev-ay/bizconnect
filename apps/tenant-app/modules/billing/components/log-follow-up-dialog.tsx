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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sendReminder } from "../actions";

const CHANNEL_OPTIONS = [
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "chat", label: "Chat / WhatsApp" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
] as const;

interface LogFollowUpDialogProps {
  tenantSlug: string;
  tenantId: string;
  invoiceId: string;
  invoiceNo: string;
  onLogged?: () => void;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  triggerClassName?: string;
}

export function LogFollowUpDialog({
  tenantSlug,
  tenantId,
  invoiceId,
  invoiceNo,
  onLogged,
  triggerLabel = "Log Follow-up",
  triggerVariant = "outline",
  triggerClassName,
}: LogFollowUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [channel, setChannel] = useState<(typeof CHANNEL_OPTIONS)[number]["value"]>("phone");
  const [notes, setNotes] = useState("");

  const selectedChannelLabel = CHANNEL_OPTIONS.find((option) => option.value === channel)?.label;

  function resetForm() {
    setChannel("phone");
    setNotes("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await sendReminder(tenantSlug, tenantId, invoiceId, { channel, notes });
      toast.success("Follow-up logged");
      setOpen(false);
      resetForm();
      onLogged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to log follow-up";
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
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" className={triggerClassName} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[min(32rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 p-0 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.35)]">
        <DialogHeader className="space-y-1 border-b border-border/70 px-6 py-5 text-left">
          <p className="eyebrow-label">Billing / Follow-up</p>
          <DialogTitle className="font-mono text-base">{invoiceNo}</DialogTitle>
          <DialogDescription>
            Record a manual collections follow-up so the invoice timeline reflects what happened outside the system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/80">Channel</Label>
            <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
              <SelectTrigger>
                {selectedChannelLabel ? selectedChannelLabel : <SelectValue placeholder="Select a channel" />}
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/80">What happened</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Client asked us to resend the invoice next week."
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !notes.trim()}>
            {submitting ? "Saving..." : "Log Follow-up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
