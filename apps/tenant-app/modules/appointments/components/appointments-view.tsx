"use client";

import { useQuery } from "@tanstack/react-query";
import { AppointmentsShell } from "./appointments-shell";
import type { Appointment } from "../types";
import { db } from "@/lib/local-db";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

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

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Schedule"
        title="Appointments"
        description={isPending ? "Loading" : `${appointments.length} total`}
        className="py-4 sm:py-5"
      />

      <AppointmentsShell
        appointments={appointments}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        services={services}
        staff={staff}
        currencySymbol={currencySymbol}
        currencyLocale={currencyLocale}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
      />
    </PageShell>
  );
}
