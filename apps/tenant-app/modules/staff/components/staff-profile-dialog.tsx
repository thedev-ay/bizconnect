"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock3, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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

  useEffect(() => {
    if (!open) {
      return;
    }

    setCommissionRate(staff.commissionRate ?? "");
    setAccessLevel(staff.accessLevel);
    setSelectedServices(new Set(staff.services.map((s) => s.serviceId)));
    setHours(
      DAYS.map((_, i) => {
        const existing = staff.workingHours.find((h) => h.dayOfWeek === i);
        return {
          enabled: !!existing,
          startTime: existing?.startTime ?? DEFAULT_HOURS.startTime,
          endTime: existing?.endTime ?? DEFAULT_HOURS.endTime,
        };
      })
    );
  }, [open, staff]);

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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(920px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">HR / Edit</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Edit staff
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">{staff.name}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <DialogFormSection num="01" title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Access level</Label>
                <Select value={accessLevel} onValueChange={(v) => v && setAccessLevel(v)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    {{ owner: "Owner", manager: "Manager", staff: "Staff", viewer: "Viewer" }[accessLevel] ?? accessLevel}
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
                <Label>Commission rate (%)</Label>
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
          </DialogFormSection>

          <DialogFormSection num="02" title="Services">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Assign the services this staff member can perform.
                </p>
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
                        <p className="text-xs text-muted-foreground">
                          {svc.duration ? `${svc.duration} min` : "No duration set"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </DialogFormSection>

          <DialogFormSection num="03" title="Schedule">
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
          </DialogFormSection>
        </div>

        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
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
