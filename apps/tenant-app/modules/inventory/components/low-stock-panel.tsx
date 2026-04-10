"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Paginator } from "./paginator";
import type { InventoryItem } from "../types";

const PAGE_SIZE = 3;

interface LowStockPanelProps {
  items: InventoryItem[];
}

export function LowStockPanel({ items }: LowStockPanelProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const slice = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="shadow-none border-zinc-200">
      <CardContent className="p-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Low Stock Watchlist</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Items at or below reorder level</p>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 flex min-h-[172px] items-center justify-center text-sm text-zinc-400">
            Everything is above reorder level.
          </div>
        ) : (
          <>
            <div className="mt-4 min-h-[172px] space-y-2">
              {slice.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                    <p className="text-xs text-zinc-500">
                      Reorder at {item.reorderAt} · {item.category?.name ?? "Uncategorized"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-amber-600">{item.quantity} left</p>
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
