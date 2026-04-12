"use client";

import { AppointmentCalendar } from "./appointment-calendar";
import type { Appointment } from "../types";
import { ContentPanel } from "@/components/layout/page-shell";

interface AppointmentsShellProps {
  appointments: Appointment[];
  tenantSlug: string;
  tenantId: string;
  slotMinTime: string;
  slotMaxTime: string;
  onSelectSlot?: (start: Date) => void;
}

export function AppointmentsShell({
  appointments,
  tenantSlug,
  tenantId,
  slotMinTime,
  slotMaxTime,
  onSelectSlot,
}: AppointmentsShellProps) {
  return (
      <ContentPanel className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow-label">Calendar</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Schedule</h2>
          </div>
          <div className="w-fit rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Week
          </div>
        </div>
        <div className="p-5">
          <AppointmentCalendar
            appointments={appointments}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            onSelectSlot={onSelectSlot}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
          />
        </div>
      </ContentPanel>
  );
}
