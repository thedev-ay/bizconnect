"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateStaffProfile } from "../actions";
import type { StaffMember, Service } from "../types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_HOURS = { startTime: "09:00", endTime: "17:00" };

interface StaffProfileDialogProps {
  staff: StaffMember;
  services: Service[];
  tenantSlug: string;
  tenantId: string;
}

export function StaffProfileDialog({
  staff,
  services,
  tenantSlug,
  tenantId,
}: StaffProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [commissionRate, setCommissionRate] = useState(staff.commissionRate ?? "");
  const [accessLevel, setAccessLevel] = useState(staff.accessLevel);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set(staff.services.map((s) => s.serviceId))
  );
  const [hours, setHours] = useState<{ enabled: boolean; startTime: string; endTime: string }[]>(
    DAYS.map((_, i) => {
      const existing = staff.workingHours.find((h) => h.dayOfWeek === i);
      return {
        enabled: !!existing,
        startTime: existing?.startTime ?? DEFAULT_HOURS.startTime,
        endTime: existing?.endTime ?? DEFAULT_HOURS.endTime,
      };
    })
  );

  function toggleService(id: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateStaffProfile(tenantSlug, tenantId, staff.id, {
        commissionRate: commissionRate ? Number(commissionRate) : undefined,
        accessLevel: accessLevel as "owner" | "manager" | "staff" | "viewer",
        serviceIds: [...selectedServices],
        workingHours: hours.map((h, i) => ({ dayOfWeek: i, ...h })),
      });
      toast.success("Profile updated");
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" />}
      >
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] min-w-[min(92vw,64rem)] w-[min(96vw,72rem)] max-w-none flex-col overflow-hidden border border-border/70 bg-popover/98 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label">HR</p>
          <DialogTitle>Edit Staff</DialogTitle>
          <DialogDescription>{staff.name}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
          <section className="space-y-4 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <div>
              <p className="eyebrow-label">Profile</p>
              <h3 className="text-sm font-semibold text-foreground">Access</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={accessLevel} onValueChange={(v) => v && setAccessLevel(v)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue>
                      {{ owner: "Owner", manager: "Manager", staff: "Staff", viewer: "Viewer" }[accessLevel] ?? accessLevel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="e.g. 10"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Services</p>
                <h3 className="text-sm font-semibold text-foreground">Qualified Services</h3>
              </div>
              <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                {selectedServices.size}
              </div>
            </div>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services added yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[20px] border px-3 py-3 text-sm transition-colors",
                      selectedServices.has(svc.id)
                        ? "border-primary/25 bg-primary/6"
                        : "border-border/60 bg-background/80 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.has(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.duration ? `${svc.duration} min` : "No duration set"}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <div>
              <p className="eyebrow-label">Schedule</p>
              <h3 className="text-sm font-semibold text-foreground">Working Hours</h3>
            </div>
            <div className="space-y-2">
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "grid items-center gap-3 rounded-[20px] border border-border/60 px-3 py-2 sm:grid-cols-[72px_64px_minmax(0,1fr)]",
                    hours[i].enabled ? "bg-background/85" : "bg-muted/20"
                  )}
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={hours[i].enabled}
                      onChange={(e) => {
                        const next = [...hours];
                        next[i] = { ...next[i], enabled: e.target.checked };
                        setHours(next);
                      }}
                      className="h-4 w-4"
                    />
                    {day}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {hours[i].enabled ? "On" : "Off"}
                  </span>
                  {hours[i].enabled ? (
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)] sm:items-center">
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="time"
                          className="h-10 rounded-2xl pr-9 text-sm"
                          value={hours[i].startTime}
                          onChange={(e) => {
                            const next = [...hours];
                            next[i] = { ...next[i], startTime: e.target.value };
                            setHours(next);
                          }}
                        />
                      </div>
                      <span className="hidden text-center text-muted-foreground sm:block">–</span>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="time"
                          className="h-10 rounded-2xl pr-9 text-sm"
                          value={hours[i].endTime}
                          onChange={(e) => {
                            const next = [...hours];
                            next[i] = { ...next[i], endTime: e.target.value };
                            setHours(next);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="-mx-5 -mb-5 mt-4 shrink-0 border-t border-border/60 px-5 py-4">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
