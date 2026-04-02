"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateBusinessHours } from "../actions";
import type { BusinessHoursEntry } from "../types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_HOURS: BusinessHoursEntry[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 6, // Mon–Sat open by default
  openTime: "09:00",
  closeTime: "18:00",
}));

interface BusinessHoursFormProps {
  tenantSlug: string;
  tenantId: string;
  initialHours: BusinessHoursEntry[];
}

export function BusinessHoursForm({ tenantSlug, tenantId, initialHours }: BusinessHoursFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Merge initialHours with defaults (in case some days aren't in DB yet)
  const [hours, setHours] = useState<BusinessHoursEntry[]>(
    DAYS.map((_, i) => {
      const existing = initialHours.find((h) => h.dayOfWeek === i);
      return existing ?? DEFAULT_HOURS[i];
    })
  );

  function updateDay(dayOfWeek: number, patch: Partial<BusinessHoursEntry>) {
    setHours((prev) => prev.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateBusinessHours(tenantSlug, tenantId, hours);
      toast.success("Business hours saved");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
        {hours.map((h) => (
          <div key={h.dayOfWeek} className="flex items-center gap-4 px-4 py-3">
            <span className="w-28 text-sm font-medium text-zinc-700">{DAYS[h.dayOfWeek]}</span>

            {/* Open toggle */}
            <button
              type="button"
              onClick={() => updateDay(h.dayOfWeek, { isOpen: !h.isOpen })}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                h.isOpen ? "bg-zinc-900" : "bg-zinc-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
                  h.isOpen ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <span className="w-12 text-xs text-zinc-500">{h.isOpen ? "Open" : "Closed"}</span>

            {h.isOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={h.openTime}
                  onChange={(e) => updateDay(h.dayOfWeek, { openTime: e.target.value })}
                  className="h-8 w-28 text-sm"
                />
                <span className="text-xs text-zinc-400">to</span>
                <Input
                  type="time"
                  value={h.closeTime}
                  onChange={(e) => updateDay(h.dayOfWeek, { closeTime: e.target.value })}
                  className="h-8 w-28 text-sm"
                />
              </div>
            ) : (
              <span className="text-xs text-zinc-400">Closed all day</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Hours"}
        </Button>
      </div>
    </div>
  );
}
