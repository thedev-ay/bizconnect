import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader eyebrow="Stock" title="Inventory" description="Loading" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[120px]" />
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[120px]" />
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[120px]" />
        <DataSurfaceLoading showLabel={false} variant="cards" rows={1} className="min-h-[120px]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.85fr)]">
        <ContentPanel className="p-4 sm:p-5">
          <DataSurfaceLoading showLabel={false} variant="table" rows={7} className="min-h-[420px]" />
        </ContentPanel>
        <div className="hidden content-start gap-4 sm:grid">
          <DataSurfaceLoading showLabel={false} variant="panel" rows={3} className="min-h-[220px]" />
          <DataSurfaceLoading showLabel={false} variant="panel" rows={4} className="min-h-[260px]" />
        </div>
      </div>
    </PageShell>
  );
}
