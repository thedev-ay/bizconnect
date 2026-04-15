"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DataSurfaceLoadingVariant = "table" | "cards" | "panel";

interface DataSurfaceLoadingProps {
  label?: string;
  rows?: number;
  className?: string;
  variant?: DataSurfaceLoadingVariant;
  showLabel?: boolean;
}

function LoadingHeader({ label, showLabel }: { label: string; showLabel: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="h-4.5 w-4.5 animate-spin" />
      </div>
      {showLabel ? (
        <div className="space-y-1">
          <div className="h-2.5 w-20 rounded-full bg-primary/10" />
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
      ) : (
        <div className="h-2.5 w-20 rounded-full bg-primary/10" />
      )}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60 bg-background/90">
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-4">
        <div className="h-3 w-24 rounded-full bg-muted/70" />
        <div className="h-3 w-16 rounded-full bg-muted/55" />
        <div className="ml-auto h-3 w-12 rounded-full bg-muted/55" />
      </div>
      <div className="divide-y divide-border/45">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded-full bg-muted/75" />
              <div className="h-3 w-24 rounded-full bg-muted/45" />
            </div>
            <div className="hidden w-20 rounded-full bg-muted/45 sm:block sm:h-8" />
            <div className="h-3.5 w-14 rounded-full bg-muted/55" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60 bg-background/90 p-4">
      <div className="mb-4 space-y-2">
        <div className="h-2.5 w-16 rounded-full bg-primary/10" />
        <div className="h-4 w-28 rounded-full bg-muted/70" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-11 rounded-2xl border border-border/50 bg-muted/35" />
        ))}
      </div>
    </div>
  );
}

function CardsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-[24px] border border-border/60 bg-background/92 p-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 rounded-full bg-muted/65" />
              <div className="h-4 w-24 rounded-full bg-muted/80" />
              <div className="h-3 w-20 rounded-full bg-muted/45" />
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataSurfaceLoading({
  label = "Loading",
  rows = 4,
  className,
  variant = "table",
  showLabel = true,
}: DataSurfaceLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-[260px] flex-col gap-5 rounded-[28px] border border-border/60 bg-background/80 p-5",
        className
      )}
    >
      <LoadingHeader label={label} showLabel={showLabel} />
      {variant === "table" && <TableSkeleton rows={rows} />}
      {variant === "cards" && <CardsSkeleton rows={rows} />}
      {variant === "panel" && <PanelSkeleton rows={rows} />}
    </div>
  );
}
