"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings } from "lucide-react";
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
      <DialogContent className="max-w-sm border border-slate-200/80 bg-white p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)]">
        <DialogHeader>
          <p className="eyebrow-label text-primary">Loyalty</p>
          <DialogTitle>Loyalty Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
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
        <DialogFooter className="border-t border-slate-200/80 pt-4">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
