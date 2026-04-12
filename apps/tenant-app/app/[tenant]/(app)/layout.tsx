import { getTenant } from "@/lib/tenant";
import { authorize } from "@/lib/authorize";
import { Sidebar } from "@/components/layout/sidebar";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { Providers } from "@/components/providers";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  return { title: `${tenant.name} — BizConnect` };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: slug } = await params;
  const [tenant, session] = await Promise.all([
    getTenant(slug),
    authorize(slug),
  ]);

  return (
    <Providers>
      <div className="flex h-screen flex-col overflow-hidden bg-transparent">
        <OfflineBanner />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <Sidebar tenant={tenant} modules={session.user.moduleObjects} />
          <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
