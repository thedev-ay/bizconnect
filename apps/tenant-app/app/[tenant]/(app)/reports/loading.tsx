import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Overview" />

      <ContentPanel className="space-y-4 p-4">
        <DataSurfaceLoading showLabel={false} variant="panel" rows={2} className="min-h-[180px]" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[210px]" />
          <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[210px]" />
          <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[210px]" />
          <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[210px]" />
        </div>

        <DataSurfaceLoading showLabel={false} variant="panel" rows={5} className="min-h-[320px]" />
        <DataSurfaceLoading showLabel={false} variant="table" rows={5} className="min-h-[320px]" />
      </ContentPanel>
    </PageShell>
  );
}
