"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createAppointmentSchema, type CreateAppointmentInput } from "../schema";
import { createAppointment, getStaffAvailability } from "../actions";

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: string;
}

interface StaffOption {
  id: string;
  name: string;
  position: string | null;
  serviceIds: string[];
}

interface CreateAppointmentDialogProps {
  tenantSlug: string;
  tenantId: string;
  services: ServiceOption[];
  staff: StaffOption[];
  defaultStart?: string;
}

export function CreateAppointmentDialog({
  tenantSlug,
  tenantId,
  services,
  staff,
  defaultStart,
}: CreateAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availability, setAvailability] = useState<{
    isWorkingDay: boolean;
    workStart: string | null;
    workEnd: string | null;
    bookedSlots: { start: string; end: string; title: string }[];
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
  });

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const qualifiedStaff = staff.filter(
    (s) => !selectedServiceId || s.serviceIds.includes(selectedServiceId)
  );

  // Check availability when employee + date changes
  useEffect(() => {
    if (!selectedEmployeeId || !selectedDate) {
      setAvailability(null);
      return;
    }
    setCheckingAvailability(true);
    getStaffAvailability(selectedEmployeeId, selectedDate)
      .then(setAvailability)
      .finally(() => setCheckingAvailability(false));
  }, [selectedEmployeeId, selectedDate]);

  // Reset staff selection when service changes (staff may no longer qualify)
  useEffect(() => {
    if (selectedEmployeeId && selectedServiceId) {
      const stillQualifies = staff.find(
        (s) => s.id === selectedEmployeeId && s.serviceIds.includes(selectedServiceId)
      );
      if (!stillQualifies) {
        setSelectedEmployeeId("");
        setValue("employeeId", "");
      }
    }
  }, [selectedServiceId]);

  function handleOpen(o: boolean) {
    setOpen(o);
    if (!o) {
      reset();
      setSelectedServiceId("");
      setSelectedEmployeeId("");
      setSelectedDate("");
      setAvailability(null);
    } else if (defaultStart) {
      setValue("startAt", defaultStart);
      setSelectedDate(defaultStart.slice(0, 10));
    }
  }

  async function onSubmit(data: CreateAppointmentInput) {
    try {
      await createAppointment(tenantSlug, tenantId, data);
      toast.success("Appointment booked");
      handleOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to book appointment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> New Appointment
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Step 1: Service */}
          <div className="space-y-2">
            <Label>Service *</Label>
            <Select
              value={selectedServiceId}
              onValueChange={(v) => { if (v) { setSelectedServiceId(v); setValue("serviceId", v); } }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    {svc.name} — {svc.duration}min · ₱{Number(svc.price).toLocaleString("en-PH")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceId && <p className="text-sm text-destructive">{errors.serviceId.message}</p>}
          </div>

          {/* Step 2: Staff */}
          <div className="space-y-2">
            <Label>Staff Member *</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={(v) => { if (v) { setSelectedEmployeeId(v); setValue("employeeId", v); } }}
              disabled={!selectedServiceId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedServiceId ? "Select staff..." : "Select a service first"} />
              </SelectTrigger>
              <SelectContent>
                {qualifiedStaff.length === 0 ? (
                  <SelectItem value="_none" disabled>No qualified staff for this service</SelectItem>
                ) : (
                  qualifiedStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.position ? ` — ${s.position}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
          </div>

          {/* Step 3: Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                disabled={!selectedEmployeeId}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Start Time *
                {selectedService && <span className="ml-1 text-xs text-muted-foreground">(+{selectedService.duration}min)</span>}
              </Label>
              <Input
                type="time"
                disabled={!selectedDate}
                {...register("startAt", {
                  onChange: (e) => {
                    if (selectedDate) {
                      setValue("startAt", `${selectedDate}T${e.target.value}`);
                    }
                  },
                })}
              />
              {errors.startAt && <p className="text-sm text-destructive">{errors.startAt.message}</p>}
            </div>
          </div>

          {/* Availability indicator */}
          {selectedEmployeeId && selectedDate && (
            <div className={cn(
              "rounded-md border px-3 py-2 text-xs",
              checkingAvailability && "text-muted-foreground",
              availability?.isWorkingDay === false && "border-destructive/50 bg-destructive/5 text-destructive",
              availability?.isWorkingDay === true && "border-green-500/50 bg-green-500/5 text-green-700",
            )}>
              {checkingAvailability && "Checking availability…"}
              {!checkingAvailability && availability && (
                availability.isWorkingDay ? (
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span>Available {availability.workStart}–{availability.workEnd}</span>
                      {availability.bookedSlots.length > 0 && (
                        <div className="mt-0.5 text-amber-700">
                          Already booked: {availability.bookedSlots.map((s) =>
                            `${new Date(s.start).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}–${new Date(s.end).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`
                          ).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Staff does not work on this day
                  </div>
                )
              )}
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Customer Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register("customerName")} />
              {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+63 9XX XXX XXXX" {...register("customerPhone")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="juan@example.com" {...register("customerEmail")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Any special notes..." {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Booking..." : "Book Appointment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
