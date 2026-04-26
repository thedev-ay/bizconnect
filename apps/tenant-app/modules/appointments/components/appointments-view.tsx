"use client";

import { useState } from "react";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";
import { useQuery } from "@tanstack/react-query";
import { AppointmentsShell } from "./appointments-shell";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import type { Appointment } from "../types";
import { db } from "@/lib/local-db";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AppointmentsViewProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

interface AppointmentsData {
  appointments: Appointment[];
  services: { id: string; name: string; duration: number; price: string }[];
  staff: { id: string; name: string; position: string | null; serviceIds: string[] }[];
  slotMinTime: string;
  slotMaxTime: string;
}

export function AppointmentsView({ tenantSlug, tenantId, currencySymbol, currencyLocale }: AppointmentsViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();
  useTopbarCta("New Appointment", () => { setDefaultStart(undefined); setDialogOpen(true); });

  const { data, isPending } = useQuery<AppointmentsData>({
    queryKey: ["appointments", tenantSlug],
    queryFn: async () => {
      const cacheKey = `appointments:${tenantSlug}`;
      const cached = await db.appointmentsSnapshots.get(cacheKey);

      let r: Response;
      try {
        r = await fetch(`/api/${tenantSlug}/appointments`);
      } catch {
        if (cached) return JSON.parse(cached.data) as AppointmentsData;
        throw new Error("You're offline and no cached data is available.");
      }
      if (!r.ok) {
        if (cached) return JSON.parse(cached.data) as AppointmentsData;
        throw new Error(r.statusText);
      }

      const fresh: AppointmentsData = await r.json();
      await db.appointmentsSnapshots.put({ key: cacheKey, tenantId, data: JSON.stringify(fresh), savedAt: Date.now() });
      return fresh;
    },
  });

  const appointments = data?.appointments ?? [];
  const services = data?.services ?? [];
  const staff = data?.staff ?? [];
  const slotMinTime = data?.slotMinTime ?? "07:00";
  const slotMaxTime = data?.slotMaxTime ?? "21:00";

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
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Schedule"
        title="Appointments"
        description={isPending ? "Loading" : `${appointments.length} total`}
        className="py-4 sm:py-5"
        action={
          <Button onClick={handleNewAppointment} className="rounded-full px-4">
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        }
      />

      <AppointmentsShell
        appointments={appointments}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        onSelectSlot={handleSlotSelect}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
      />

      <CreateAppointmentDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        services={services}
        staff={staff}
        defaultStart={defaultStart}
        currencySymbol={currencySymbol}
        currencyLocale={currencyLocale}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </PageShell>
  );
}
