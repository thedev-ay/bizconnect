"use client";

import type { ReactNode } from "react";

interface DialogFormSectionProps {
  num: string;
  title: string;
  sub?: string;
  children: ReactNode;
}

function SectionNumber({ n }: { n: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-primary/80">
      {n}
    </span>
  );
}

export function DialogFormSection({
  num,
  title,
  sub,
  children,
}: DialogFormSectionProps) {
  return (
    <section className="border-b border-dashed border-border/60 py-5 last:border-b-0">
      <div className="mb-4 flex items-start gap-3">
        <SectionNumber n={num} />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
