import { ContentPanel, PageHeader, PageShell } from "@/components/layout/page-shell";
import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <PageShell className="h-auto min-h-full">
      <PageHeader eyebrow="CRM" title="Customers" description="Loading" />
      <ContentPanel className="p-4 sm:p-5">
        <DataSurfaceLoading label="Loading customers" variant="table" rows={6} className="min-h-[420px]" />
      </ContentPanel>
    </PageShell>
  );
}
