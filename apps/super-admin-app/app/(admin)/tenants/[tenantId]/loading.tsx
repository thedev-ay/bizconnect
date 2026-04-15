import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function TenantDetailLoading() {
  return (
    <div className="space-y-5">
      <div className="admin-surface px-6 py-5">
        <div className="h-2.5 w-20 rounded-full bg-primary/10" />
        <div className="mt-4 h-10 w-56 rounded-full bg-muted/70" />
      </div>
      <DataSurfaceLoading variant="cards" rows={3} showLabel={false} />
      <DataSurfaceLoading variant="panel" rows={5} showLabel={false} />
    </div>
  );
}
