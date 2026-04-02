"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentCalendar } from "./appointment-calendar";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import type { Appointment } from "../types";

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
    <>
      {/* New Appointment button — sits in the page header row */}
      <div className="flex justify-end">
        <Button onClick={handleNewAppointment}>
          <Plus className="mr-2 h-4 w-4" /> New Appointment
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

      <Card className="shadow-none border-zinc-200">
        <CardContent className="p-5">
          <AppointmentCalendar
            appointments={appointments}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            onSelectSlot={handleSlotSelect}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
          />
        </CardContent>
      </Card>
    </>
  );
}
