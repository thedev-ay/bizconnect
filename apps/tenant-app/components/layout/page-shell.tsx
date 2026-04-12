import type * as React from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  className,
  children,
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("app-canvas flex h-full flex-col gap-6", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "app-panel flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow-label">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </header>
  );
}

export function ContentPanel({
  className,
  children,
}: React.ComponentProps<"div">) {
  return <div className={cn("app-panel min-h-0", className)}>{children}</div>;
}
