"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLoyaltyCard } from "../actions";

interface NewCardDialogProps {
  tenantSlug: string;
  tenantId: string;
  open: boolean;
  defaultName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (cardId: string) => void;
}

export function NewCardDialog({
  tenantSlug,
  tenantId,
  open,
  defaultName = "",
  onOpenChange,
  onCreated,
}: NewCardDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const card = await createLoyaltyCard(tenantSlug, tenantId, {
        customerName: name.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success("Loyalty card created");
      onOpenChange(false);
      setName("");
      setPhone("");
      router.refresh();
      onCreated(card.id);
    } catch {
      toast.error("Failed to create card");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setName("");
      setPhone("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(420px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Loyalty / New</p>
              <DialogTitle className="mt-1 text-lg font-semibold tracking-tight text-foreground">Create loyalty card</DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => handleOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <Label>Customer Name *</Label>
            <Input
              placeholder="Juan dela Cruz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              placeholder="09xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-5 py-4">
          <Button variant="outline" className="rounded-full px-4" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full px-4" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NewCardButtonProps {
  tenantSlug: string;
  tenantId: string;
  onCreated?: (cardId: string) => void;
}

export function NewCardButton({ tenantSlug, tenantId, onCreated }: NewCardButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 rounded-full">
        <Plus className="h-3.5 w-3.5" />
        New Card
      </Button>
      <NewCardDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        open={open}
        onOpenChange={setOpen}
        onCreated={onCreated ?? (() => {})}
      />
    </>
  );
}
