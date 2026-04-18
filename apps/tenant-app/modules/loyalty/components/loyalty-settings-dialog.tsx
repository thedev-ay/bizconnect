"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveLoyaltySettings } from "../actions";
import type { LoyaltySetting } from "../types";

interface LoyaltySettingsDialogProps {
  tenantSlug: string;
  tenantId: string;
  settings: LoyaltySetting;
}

export function LoyaltySettingsDialog({ tenantSlug, tenantId, settings }: LoyaltySettingsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stamps, setStamps] = useState(settings.stampsPerReward);
  const [reward, setReward] = useState(settings.rewardDescription);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!reward.trim() || stamps < 1) return;
    setSaving(true);
    try {
      await saveLoyaltySettings(tenantSlug, tenantId, {
        stampsPerReward: stamps,
        rewardDescription: reward.trim(),
        isActive: true,
      });
      toast.success("Settings saved");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Settings className="h-3.5 w-3.5" />
        Settings
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(420px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Loyalty / Settings</p>
              <DialogTitle className="mt-1 text-lg font-semibold tracking-tight text-foreground">Loyalty settings</DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <Label>Stamps needed for reward</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={stamps}
              onChange={(e) => setStamps(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">Customers earn 1 stamp per job order</p>
          </div>
          <div className="space-y-2">
            <Label>Reward description</Label>
            <Input
              placeholder="e.g. 1 Free Wash"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-5 py-4">
          <Button variant="outline" className="rounded-full px-4" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-full px-4" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
