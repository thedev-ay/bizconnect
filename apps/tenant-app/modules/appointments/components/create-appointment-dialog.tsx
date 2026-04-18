"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, AlertCircle, CheckCircle, WifiOff, X } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { CurrencyInputField } from "@/components/ui/currency-input-field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createAppointmentSchema, type CreateAppointmentInput } from "../schema";
import { createAppointment, createAppointmentService, getStaffAvailability } from "../actions";

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
  currencySymbol: string;
  currencyLocale: string;
  // External control — when provided, the internal trigger button is hidden
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateAppointmentDialog({
  tenantSlug,
  tenantId,
  services,
  staff,
  defaultStart,
  currencySymbol,
  currencyLocale,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: CreateAppointmentDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>(services);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [staffQuery, setStaffQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("60");
  const [newServicePrice, setNewServicePrice] = useState("0");
  const [creatingService, setCreatingService] = useState(false);
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

  useEffect(() => {
    setServiceOptions(services);
  }, [services]);

  const selectedService = serviceOptions.find((s) => s.id === selectedServiceId);
  const qualifiedStaff = staff.filter(
    (s) => !selectedServiceId || s.serviceIds.includes(selectedServiceId)
  );
  const normalizedServiceQuery = serviceQuery.trim().toLowerCase();
  const exactServiceMatch = normalizedServiceQuery
    ? serviceOptions.find((s) => s.name.trim().toLowerCase() === normalizedServiceQuery) ?? null
    : null;
  const canCreateService = serviceQuery.trim().length > 0 && !exactServiceMatch;
  const serviceComboboxOptions: ComboboxOption[] = serviceOptions.map((service) => ({
    value: service.id,
    label: service.name,
    description: `${service.duration}m · ${currencySymbol}${Number(service.price).toLocaleString(currencyLocale)}`,
  }));
  const staffComboboxOptions: ComboboxOption[] = qualifiedStaff.map((member) => ({
    value: member.id,
    label: member.name,
    description: member.position ?? "Staff",
  }));

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
        setValue("employeeId", undefined, { shouldValidate: true });
        setValue("staffName", staffQuery.trim(), { shouldValidate: false });
      }
    }
  }, [selectedEmployeeId, selectedServiceId, setValue, staff, staffQuery]);

  // Pre-fill date/time when dialog opens with a defaultStart (e.g. from calendar slot click)
  useEffect(() => {
    if (open && defaultStart) {
      const [date, time] = defaultStart.split("T");
      setSelectedDate(date);
      setSelectedTime(time ?? "");
      setValue("startAt", defaultStart);
    }
  }, [open, defaultStart]);

  function handleOpen(o: boolean) {
    setOpen(o);
    if (!o) {
      reset();
      setServiceOptions(services);
      setSelectedServiceId("");
      setServiceQuery("");
      setSelectedEmployeeId("");
      setStaffQuery("");
      setSelectedDate("");
      setSelectedTime("");
      setNewServiceDuration("60");
      setNewServicePrice("0");
      setAvailability(null);
    }
  }

  function selectService(service: ServiceOption | ComboboxOption) {
    const id = "id" in service ? service.id : service.value;
    const name = "name" in service ? service.name : service.label;
    setSelectedServiceId(id);
    setServiceQuery(name);
    setValue("serviceId", id, { shouldValidate: true });
  }

  function handleServiceQueryChange(value: string) {
    setServiceQuery(value);

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setSelectedServiceId("");
      setValue("serviceId", "", { shouldValidate: true });
      return;
    }

    const match = serviceOptions.find((service) => service.name.trim().toLowerCase() === normalized);
    if (match) {
      selectService(match);
      return;
    }

    setSelectedServiceId("");
    setValue("serviceId", "", { shouldValidate: true });
  }

  function selectStaff(staffMember: StaffOption | ComboboxOption) {
    const id = "id" in staffMember ? staffMember.id : staffMember.value;
    const name = "name" in staffMember ? staffMember.name : staffMember.label;
    setSelectedEmployeeId(id);
    setStaffQuery(name);
    setValue("employeeId", id, { shouldValidate: true });
    setValue("staffName", "", { shouldValidate: false });
  }

  function handleStaffQueryChange(value: string) {
    setStaffQuery(value);

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setSelectedEmployeeId("");
      setValue("employeeId", undefined, { shouldValidate: true });
      setValue("staffName", "", { shouldValidate: false });
      return;
    }

    const match = qualifiedStaff.find((member) => member.name.trim().toLowerCase() === normalized);
    if (match) {
      selectStaff(match);
      return;
    }

    setSelectedEmployeeId("");
    setValue("employeeId", undefined, { shouldValidate: true });
    setValue("staffName", value.trim(), { shouldValidate: false });
  }

  async function handleCreateService() {
    if (!isOnline) {
      toast.error("You're offline. Connect to create services.");
      return;
    }

    const name = serviceQuery.trim();
    const duration = Number(newServiceDuration);
    const price = Number(newServicePrice);

    if (!name) {
      toast.error("Enter a service name first.");
      return;
    }

    setCreatingService(true);
    try {
      const created = await createAppointmentService(tenantSlug, tenantId, {
        name,
        duration,
        price,
      });

      const nextService: ServiceOption = {
        id: created.id,
        name: created.name,
        duration: created.duration,
        price: String(created.price),
      };

      setServiceOptions((current) => {
        const withoutDuplicate = current.filter((service) => service.id !== nextService.id);
        return [...withoutDuplicate, nextService].sort((a, b) => a.name.localeCompare(b.name));
      });
      selectService(nextService);
      toast.success("Service created");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create service");
    } finally {
      setCreatingService(false);
    }
  }

  async function onSubmit(data: CreateAppointmentInput) {
    if (!isOnline) {
      toast.error("You're offline. Connect to book appointments.");
      return;
    }
    try {
      await createAppointment(tenantSlug, tenantId, data);
      toast.success("Appointment booked");
      handleOpen(false);
      queryClient.invalidateQueries({ queryKey: ["appointments", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to book appointment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {externalOpen === undefined && (
        <DialogTrigger render={<Button className="rounded-full px-4" />}>
          <Plus className="mr-2 h-4 w-4" /> New
        </DialogTrigger>
      )}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(760px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Appointments / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Book appointment
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => handleOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Service">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Service *</Label>
                  <Combobox
                    options={serviceComboboxOptions}
                    value={serviceQuery}
                    onValueChange={handleServiceQueryChange}
                    onSelect={selectService}
                    selectedValue={selectedServiceId}
                    placeholder="Select or type a service..."
                    emptyMessage="No matching services found."
                    helperText="Pick an existing service or type a new name to create it."
                    footer={canCreateService ? (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Create "{serviceQuery.trim()}"</p>
                            <p className="text-xs text-muted-foreground">This saves a new service, then selects it for the appointment.</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateService}
                            disabled={creatingService || !newServiceDuration || !newServicePrice}
                          >
                            {creatingService ? "Creating..." : "Create"}
                          </Button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="new-service-duration" className="text-xs font-medium text-foreground/80">
                              Duration (minutes)
                            </Label>
                            <Input
                              id="new-service-duration"
                              type="number"
                              min={1}
                              value={newServiceDuration}
                              onChange={(e) => setNewServiceDuration(e.target.value)}
                            />
                          </div>
                          <CurrencyInputField
                            id="new-service-price"
                            currencySymbol={currencySymbol}
                            label="Price"
                            value={newServicePrice}
                            onChange={(e) => setNewServicePrice(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}
                  />
                  {errors.serviceId && <p className="text-xs text-destructive">{errors.serviceId.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Staff <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Combobox
                    options={staffComboboxOptions}
                    value={staffQuery}
                    onValueChange={handleStaffQueryChange}
                    onSelect={selectStaff}
                    selectedValue={selectedEmployeeId}
                    placeholder={selectedServiceId ? "Select or type a staff name..." : "Select service first"}
                    disabled={!selectedServiceId}
                    emptyMessage="No matching staff found. Keep typing to save a custom name."
                    helperText="Pick a registered staff member, or type a name to store it only on this appointment."
                  />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Schedule">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Date *</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      disabled={!selectedServiceId}
                      onChange={(e) => {
                        const date = e.target.value;
                        setSelectedDate(date);
                        if (date && selectedTime) {
                          setValue("startAt", `${date}T${selectedTime}`);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">
                      Time *
                      {selectedService && <span className="ml-1 text-xs font-normal text-muted-foreground">(+{selectedService.duration}m)</span>}
                    </Label>
                    <Input
                      type="time"
                      value={selectedTime}
                      disabled={!selectedDate}
                      onChange={(e) => {
                        const time = e.target.value;
                        setSelectedTime(time);
                        if (selectedDate && time) {
                          setValue("startAt", `${selectedDate}T${time}`);
                        }
                      }}
                    />
                    {errors.startAt && <p className="text-xs text-destructive">{errors.startAt.message}</p>}
                  </div>
                </div>

                {selectedEmployeeId && selectedDate && (
                  <div className={cn(
                    "rounded-2xl border px-3 py-2.5 text-xs",
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
                                Booked: {availability.bookedSlots.map((s) =>
                                  `${new Date(s.start).toLocaleTimeString(currencyLocale, { hour: "2-digit", minute: "2-digit" })}–${new Date(s.end).toLocaleTimeString(currencyLocale, { hour: "2-digit", minute: "2-digit" })}`
                                ).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Off day
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </DialogFormSection>

            <DialogFormSection num="03" title="Customer">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Customer *</Label>
                    <Input placeholder="Alex Morgan" {...register("customerName")} />
                    {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Phone</Label>
                    <Input placeholder="+31 6 12345678" {...register("customerPhone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Email</Label>
                    <Input type="email" placeholder="juan@example.com" {...register("customerEmail")} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Notes</Label>
                  <Textarea rows={2} placeholder="Optional" {...register("notes")} />
                </div>
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            {!isOnline && (
              <p className="mr-auto flex items-center gap-1.5 text-xs text-amber-600">
                <WifiOff className="h-3.5 w-3.5" /> You're offline
              </p>
            )}
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => handleOpen(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting || !isOnline}>{isSubmitting ? "Booking..." : "Book"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
