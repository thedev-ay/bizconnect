import type * as React from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  className,
  children,
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("app-canvas flex h-full flex-col gap-4 sm:gap-5 lg:gap-6", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  action,
  className,
  variant = "panel",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "panel" | "compact";
}) {
  const isCompact = variant === "compact";

  return (
    <header
      className={cn(
        isCompact
          ? "flex flex-col gap-3 px-1 py-1 sm:px-1 lg:flex-row lg:items-end lg:justify-between"
          : "app-panel flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className={cn("page-title", isCompact && "text-[1.45rem] sm:text-[1.7rem]")}>{title}</h1>
        {description ? (
          <p className={cn("page-subtitle", isCompact && "mt-0.5 text-xs leading-5 sm:text-sm")}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">{action}</div> : null}
    </header>
  );
}

export function ContentPanel({
  className,
  children,
}: React.ComponentProps<"div">) {
  return <div className={cn("app-panel min-h-0 overflow-hidden", className)}>{children}</div>;
}
