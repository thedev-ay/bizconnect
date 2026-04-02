"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Loyalty Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
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
              Phone <span className="text-zinc-400 font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="09xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
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
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
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
