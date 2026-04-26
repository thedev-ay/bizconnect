import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader eyebrow="Promotions" title="Promotions" description="Loading" />
      <ContentPanel className="overflow-hidden p-0">
        <DataSurfaceLoading showLabel={false} variant="table" rows={6} className="min-h-[380px]" />
      </ContentPanel>
    </PageShell>
  );
}
