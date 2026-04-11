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
    <Card className="shadow-none border-zinc-200">
      <CardContent className="p-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Recent Stock Activity</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Latest adjustments and movement</p>
        </div>

        {adjustments.length === 0 ? (
          <div className="mt-4 flex min-h-[172px] items-center justify-center text-sm text-zinc-400">
            No stock adjustments yet.
          </div>
        ) : (
          <>
            <div className="mt-4 min-h-[172px] space-y-2">
              {slice.map((adj) => (
                <div key={adj.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{adj.item.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(adj.reason ?? "manual").replaceAll("_", " ")} ·{" "}
                      {new Date(adj.createdAt).toLocaleDateString("nl-NL", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${adj.quantityChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
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
