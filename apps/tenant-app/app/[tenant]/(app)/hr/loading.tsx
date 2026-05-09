import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Staff" description="Loading" />
      <ContentPanel className="p-4 sm:p-5">
        <DataSurfaceLoading label="Loading staff" variant="table" rows={6} className="min-h-[420px]" />
      </ContentPanel>
    </PageShell>
  );
}
