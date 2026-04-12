"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Paginator } from "./paginator";

const PAGE_SIZE = 3;

interface Adjustment {
  id: string;
  quantityChange: number;
  reason: string | null;
  createdAt: Date | string;
  item: { name: string };
}

interface RecentActivityPanelProps {
  adjustments: Adjustment[];
}

export function RecentActivityPanel({ adjustments }: RecentActivityPanelProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(adjustments.length / PAGE_SIZE);
  const slice = adjustments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div>
          <p className="eyebrow-label">Activity</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">Recent</h2>
        </div>

        {adjustments.length === 0 ? (
          <div className="mt-4 flex min-h-[172px] items-center justify-center text-sm text-muted-foreground">
            No activity
          </div>
        ) : (
          <>
            <div className="mt-4 min-h-[172px] space-y-2">
              {slice.map((adj) => (
                <div key={adj.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{adj.item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(adj.reason ?? "manual").replaceAll("_", " ")} ·{" "}
                      {new Date(adj.createdAt).toLocaleDateString("nl-NL", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${adj.quantityChange >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {adj.quantityChange >= 0 ? "+" : ""}{adj.quantityChange}
                  </p>
                </div>
              ))}
            </div>

            <Paginator
              page={page}
              totalPages={totalPages}
              onPage={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
