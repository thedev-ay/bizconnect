import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[220px]" />
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[220px]" />
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[220px]" />
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[220px]" />
      </div>

      <ContentPanel className="p-4 sm:p-5">
        <DataSurfaceLoading showLabel={false} variant="panel" rows={5} className="min-h-[320px]" />
      </ContentPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ContentPanel className="p-4 sm:p-5">
          <DataSurfaceLoading showLabel={false} variant="table" rows={4} className="min-h-[300px]" />
        </ContentPanel>
        <ContentPanel className="p-4 sm:p-5">
          <DataSurfaceLoading showLabel={false} variant="panel" rows={4} className="min-h-[300px]" />
        </ContentPanel>
      </div>
    </PageShell>
  );
}
