import { redirect } from "next/navigation";
import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { BusinessProfileForm, CurrencyForm, BusinessHoursForm } from "@/modules/settings";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  const { tenant: tenantSlug } = await params;
  const { tab = "general" } = await searchParams;

  const [tenant] = await Promise.all([
    getTenant(tenantSlug),
    authorize(tenantSlug),
  ]);

  if (tab === "services") {
    redirect(`/${tenantSlug}/settings?tab=general`);
  }

  const businessHours = await prisma.businessHours.findMany({
    where: { tenantId: tenant.id },
    orderBy: { dayOfWeek: "asc" },
  });

  const tabs = [
    { key: "general", label: "General" },
    { key: "hours", label: "Business Hours" },
  ];

  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader
        eyebrow="Settings"
        title="Business configuration"
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
      </ContentPanel>
    </PageShell>
  );
}
