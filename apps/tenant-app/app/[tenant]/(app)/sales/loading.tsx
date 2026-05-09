import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <ContentPanel className="overflow-hidden p-0">
        <DataSurfaceLoading showLabel={false} variant="table" rows={8} className="min-h-[480px]" />
      </ContentPanel>
    </PageShell>
  );
}
