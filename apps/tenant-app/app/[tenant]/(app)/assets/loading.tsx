import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Customer Assets" description="Loading" />
      <ContentPanel className="overflow-hidden p-0">
        <DataSurfaceLoading showLabel={false} variant="table" rows={7} className="min-h-[420px]" />
      </ContentPanel>
    </PageShell>
  );
}
