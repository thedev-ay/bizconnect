import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Business Configuration" description="Loading" />
      <ContentPanel className="p-4 sm:p-5">
        <DataSurfaceLoading showLabel={false} variant="panel" rows={5} className="min-h-[320px]" />
      </ContentPanel>
      <ContentPanel className="p-4 sm:p-5">
        <DataSurfaceLoading showLabel={false} variant="panel" rows={4} className="min-h-[260px]" />
      </ContentPanel>
    </PageShell>
  );
}
