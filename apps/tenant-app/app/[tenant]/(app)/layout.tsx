import { getTenant } from "@/lib/tenant";
import { getActiveModules } from "@/lib/module-registry";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
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
  const [tenant, activeModules] = await Promise.all([
    getTenant(slug),
    getActiveModules(slug),
  ]);

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <Sidebar tenant={tenant} modules={activeModules} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
