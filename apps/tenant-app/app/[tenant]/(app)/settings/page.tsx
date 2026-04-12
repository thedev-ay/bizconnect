import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
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
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Settings"
        title="Business configuration"
        action={
          tab === "services" ? (
            <AddServiceDialog tenantSlug={tenantSlug} tenantId={tenant.id} currencySymbol={tenant.currencySymbol} />
          ) : undefined
        }
      />

      <ContentPanel className="space-y-4 p-0">
      <div className="flex gap-2 border-b border-slate-200/80 px-4 pt-3">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/${tenantSlug}/settings?tab=${t.key}`}
            className={cn(
              "rounded-t-2xl border border-transparent px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-slate-200/80 border-b-white bg-white text-slate-950 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.35)]"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* General tab */}
      {tab === "general" && (
        <div className="max-w-3xl px-4 pb-4">
          <section className="py-4">
            <div className="mb-5 border-b border-slate-200/80 pb-4">
              <p className="eyebrow-label text-primary">General</p>
              <h2 className="text-base font-semibold text-slate-950">Business Profile</h2>
            </div>
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
          </section>

          <section className="border-t border-slate-200/80 py-6">
            <div className="mb-5 border-b border-slate-200/80 pb-4">
              <p className="eyebrow-label text-primary">Billing</p>
              <h2 className="text-base font-semibold text-slate-950">Currency & Tax</h2>
            </div>
            <CurrencyForm
              tenantSlug={tenantSlug}
              tenantId={tenant.id}
              defaultValues={{
                currencySymbol: tenant.currencySymbol,
                currencyLocale: tenant.currencyLocale,
                defaultTaxRate: Number(tenant.defaultTaxRate),
              }}
            />
          </section>
        </div>
      )}

      {/* Business Hours tab */}
      {tab === "hours" && (
        <div className="max-w-3xl px-4 pb-4">
          <section className="py-4">
            <div className="mb-5 border-b border-slate-200/80 pb-4">
              <p className="eyebrow-label text-primary">Hours</p>
              <h2 className="text-base font-semibold text-slate-950">Business Hours</h2>
            </div>
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
          </section>
        </div>
      )}

      {/* Services tab */}
      {tab === "services" && (
        <div className="max-w-4xl px-4 pb-4">
          <section className="py-4">
            <div className="mb-5 border-b border-slate-200/80 pb-4">
              <p className="eyebrow-label text-primary">Services</p>
              <h2 className="text-base font-semibold text-slate-950">Catalog</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="pl-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Description</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Duration</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Price</TableHead>
                  <TableHead className="w-16 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No services yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  typedServices.map((svc) => (
                    <TableRow key={svc.id} className="border-border/60 hover:bg-muted/20">
                      <TableCell className="pl-5 text-sm font-medium text-foreground">{svc.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {svc.description ?? <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{svc.duration} min</TableCell>
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {tenant.currencySymbol}{Number(svc.price).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="pr-5">
                        <DeleteServiceButton serviceId={svc.id} tenantSlug={tenantSlug} tenantId={tenant.id} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      )}
      </ContentPanel>
    </PageShell>
  );
}
