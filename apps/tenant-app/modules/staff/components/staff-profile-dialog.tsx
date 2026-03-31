"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function StaffProfileDialog({ staff, services, tenantSlug, tenantId }: StaffProfileDialogProps) {
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
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Staff Profile — {staff.name}</DialogTitle></DialogHeader>

        <div className="space-y-5">
          {/* Access & Commission */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select value={accessLevel} onValueChange={(v) => { if (v) setAccessLevel(v as string); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label>Qualified Services</Label>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services added yet. Add services first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.has(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1">{svc.name}</span>
                    <span className="text-xs text-muted-foreground">{svc.duration}m</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="space-y-2">
            <Label>Working Hours</Label>
            <div className="space-y-1.5">
              {DAYS.map((day, i) => (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex w-20 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hours[i].enabled}
                      onChange={(e) => {
                        const next = [...hours];
                        next[i] = { ...next[i], enabled: e.target.checked };
                        setHours(next);
                      }}
                      className="h-3.5 w-3.5"
                    />
                    {day}
                  </label>
                  {hours[i].enabled ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Input
                        type="time"
                        className="h-7 w-28 text-xs"
                        value={hours[i].startTime}
                        onChange={(e) => {
                          const next = [...hours];
                          next[i] = { ...next[i], startTime: e.target.value };
                          setHours(next);
                        }}
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="time"
                        className="h-7 w-28 text-xs"
                        value={hours[i].endTime}
                        onChange={(e) => {
                          const next = [...hours];
                          next[i] = { ...next[i], endTime: e.target.value };
                          setHours(next);
                        }}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
