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
      <div className="flex h-screen flex-col overflow-hidden">
        <OfflineBanner />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar tenant={tenant} modules={session.user.moduleObjects} />
          <main className="flex-1 overflow-y-auto bg-zinc-50 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
