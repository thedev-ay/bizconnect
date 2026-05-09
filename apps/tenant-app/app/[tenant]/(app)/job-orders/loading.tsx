import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { PageShell, ContentPanel } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Job Orders" description="Loading" />
      <ContentPanel className="min-h-0 flex-1 p-3 sm:p-4 lg:p-5">
        <DataSurfaceLoading showLabel={false} variant="kanban" className="min-h-[480px]" />
      </ContentPanel>
    </PageShell>
  );
}
