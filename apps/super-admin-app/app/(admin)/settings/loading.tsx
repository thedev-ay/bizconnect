import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function SettingsLoading() {
  return (
    <div className="space-y-5">
      <div className="admin-surface px-6 py-5">
        <div className="h-2.5 w-20 rounded-full bg-primary/10" />
        <div className="mt-4 h-10 w-52 rounded-full bg-muted/70" />
      </div>
      <DataSurfaceLoading variant="panel" rows={4} showLabel={false} />
    </div>
  );
}
