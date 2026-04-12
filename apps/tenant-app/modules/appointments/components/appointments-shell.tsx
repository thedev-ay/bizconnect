"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentCalendar } from "./appointment-calendar";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import type { Appointment } from "../types";
import { ContentPanel } from "@/components/layout/page-shell";

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

interface AppointmentsShellProps {
  appointments: Appointment[];
  tenantSlug: string;
  tenantId: string;
  services: ServiceOption[];
  staff: StaffOption[];
  currencySymbol: string;
  currencyLocale: string;
  slotMinTime: string;
  slotMaxTime: string;
}

export function AppointmentsShell({
  appointments,
  tenantSlug,
  tenantId,
  services,
  staff,
  currencySymbol,
  currencyLocale,
  slotMinTime,
  slotMaxTime,
}: AppointmentsShellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();

  function handleSlotSelect(start: Date) {
    const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000);
    setDefaultStart(local.toISOString().slice(0, 16));
    setDialogOpen(true);
  }

  function handleNewAppointment() {
    setDefaultStart(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNewAppointment} className="rounded-full px-4">
          <Plus className="mr-2 h-4 w-4" /> New
        </Button>
      </div>

      <CreateAppointmentDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        services={services}
        staff={staff}
        defaultStart={defaultStart}
        currencySymbol={currencySymbol}
        currencyLocale={currencyLocale}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setDefaultStart(undefined);
        }}
      />

      <ContentPanel className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div>
            <p className="eyebrow-label">Calendar</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Schedule</h2>
          </div>
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Week
          </div>
        </div>
        <div className="p-5">
          <AppointmentCalendar
            appointments={appointments}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            onSelectSlot={handleSlotSelect}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
          />
        </div>
      </ContentPanel>
    </div>
  );
}
