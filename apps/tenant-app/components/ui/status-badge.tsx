import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.02em]",
  {
    variants: {
      tone: {
        neutral: "border-border/70 bg-muted/80 text-muted-foreground",
        primary: "border-primary/15 bg-primary/10 text-primary",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        danger: "border-rose-200 bg-rose-50 text-rose-700",
        violet: "border-violet-200 bg-violet-50 text-violet-700",
        blue: "border-sky-200 bg-sky-50 text-sky-700",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export function StatusBadge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />;
}
