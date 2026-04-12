"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Paginator } from "./paginator";
import type { InventoryItem } from "../types";

const PAGE_SIZE = 5;

interface LowStockPanelProps {
  items: InventoryItem[];
  embedded?: boolean;
}

export function LowStockPanel({ items, embedded = false }: LowStockPanelProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const slice = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="border-border/60 bg-card/95">
      <CardContent className="p-5">
        {!embedded ? (
          <div>
            <p className="eyebrow-label">Watchlist</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Low stock</h2>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className={embedded ? "flex min-h-[172px] items-center justify-center text-sm text-muted-foreground" : "mt-4 flex min-h-[172px] items-center justify-center text-sm text-muted-foreground"}>
            All clear
          </div>
        ) : (
          <>
            <div className={embedded ? "min-h-[172px] space-y-2" : "mt-4 min-h-[172px] space-y-2"}>
              {slice.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Reorder at {item.reorderAt} · {item.category?.name ?? "Uncategorized"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-amber-700">{item.quantity}</p>
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
