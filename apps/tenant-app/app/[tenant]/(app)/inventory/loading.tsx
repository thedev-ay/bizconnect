import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
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
