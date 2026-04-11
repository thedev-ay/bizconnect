"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CalendarCheck, CheckCircle, XCircle } from "lucide-react";
import { AppointmentsShell } from "./appointments-shell";
import type { Appointment } from "../types";
import { db } from "@/lib/local-db";

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

  const pending = appointments.filter((a) => a.status === "pending").length;
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const done = appointments.filter((a) => a.status === "done").length;
  const cancelled = appointments.filter((a) => a.status === "cancelled" || a.status === "no-show").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Appointments</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {isPending ? "Loading..." : `${appointments.length} total`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Pending</p>
                <p className="mt-1.5 text-2xl font-bold text-amber-600">{pending}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Confirmed</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-600">{confirmed}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Completed</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-600">{done}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Cancelled</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-400">{cancelled}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <XCircle className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
