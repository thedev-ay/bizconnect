import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BusinessProfileForm, CurrencyForm, BusinessHoursForm } from "@/modules/settings";
import { AddServiceDialog } from "@/modules/staff";
import type { Service } from "@/modules/staff";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DeleteServiceButton } from "./delete-service-button";

interface SettingsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  const { tenant: tenantSlug } = await params;
  const { tab = "general" } = await searchParams;

  const [tenant, session] = await Promise.all([
    getTenant(tenantSlug),
    authorize(tenantSlug),
  ]);

  const hasAppointments = session.user.modules.includes("appointments");

  // Redirect direct URL access to services tab if appointments module is disabled
  if (tab === "services" && !hasAppointments) {
    redirect(`/${tenantSlug}/settings?tab=general`);
  }

  const [businessHours, services] = await Promise.all([
    prisma.businessHours.findMany({
      where: { tenantId: tenant.id },
      orderBy: { dayOfWeek: "asc" },
    }),
    hasAppointments
      ? prisma.service.findMany({
          where: { tenantId: tenant.id },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const typedServices: Service[] = services.map((s) => ({
    ...s,
    price: s.price.toString(),
  }));

  const tabs = [
    { key: "general", label: "General" },
    { key: "hours", label: "Business Hours" },
    ...(hasAppointments ? [{ key: "services", label: "Services" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your business configuration</p>
        </div>
        {tab === "services" && (
          <AddServiceDialog tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} />
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/${tenantSlug}/settings?tab=${t.key}`}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* General tab */}
      {tab === "general" && (
        <div className="space-y-6 max-w-2xl">
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="border-b border-zinc-100 px-6 py-4">
              <CardTitle className="text-sm font-semibold text-zinc-900">Business Profile</CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <BusinessProfileForm
                tenantSlug={tenantSlug}
                tenantId={tenant.id}
                defaultValues={{
                  name: tenant.name,
                  address: tenant.address ?? "",
                  phone: tenant.phone ?? "",
                  email: tenant.email ?? "",
                }}
              />
            </CardContent>
          </Card>

          <Card className="shadow-none border-zinc-200">
            <CardHeader className="border-b border-zinc-100 px-6 py-4">
              <CardTitle className="text-sm font-semibold text-zinc-900">Currency & Tax</CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <CurrencyForm
                tenantSlug={tenantSlug}
                tenantId={tenant.id}
                defaultValues={{
                  currencySymbol: tenant.currencySymbol,
                  currencyLocale: tenant.currencyLocale,
                  defaultTaxRate: Number(tenant.defaultTaxRate),
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Hours tab */}
      {tab === "hours" && (
        <div className="max-w-2xl">
          <Card className="shadow-none border-zinc-200">
            <CardHeader className="border-b border-zinc-100 px-6 py-4">
              <CardTitle className="text-sm font-semibold text-zinc-900">Business Hours</CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <BusinessHoursForm
                tenantSlug={tenantSlug}
                tenantId={tenant.id}
                initialHours={businessHours.map((h) => ({
                  dayOfWeek: h.dayOfWeek,
                  isOpen: h.isOpen,
                  openTime: h.openTime,
                  closeTime: h.closeTime,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Services tab */}
      {tab === "services" && (
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Name</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Description</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Duration</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Price</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-400">
                      No services yet. Add the services your business offers.
                    </TableCell>
                  </TableRow>
                ) : (
                  typedServices.map((svc) => (
                    <TableRow key={svc.id} className="border-zinc-100 hover:bg-zinc-50/50">
                      <TableCell className="text-sm font-medium text-zinc-900">{svc.name}</TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {svc.description ?? <span className="text-zinc-300">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-zinc-700">{svc.duration} min</TableCell>
                      <TableCell className="text-right text-sm font-medium text-zinc-900">
                        {tenant.currencySymbol}{Number(svc.price).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DeleteServiceButton serviceId={svc.id} tenantSlug={tenantSlug} tenantId={tenant.id} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
