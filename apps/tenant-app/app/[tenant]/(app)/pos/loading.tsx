import { DataSurfaceLoading } from "@/components/ui/data-surface-loading";

export default function Loading() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <DataSurfaceLoading label="Loading POS" variant="panel" rows={4} className="w-full max-w-sm" />
    </div>
  );
}
