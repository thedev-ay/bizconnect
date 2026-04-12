"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/use-online-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, AlertTriangle, ArrowUpDown, Pencil, History, Boxes, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "../types";
import { deleteItem, getAdjustmentHistory } from "../actions";
import { EditItemDialog } from "./edit-item-dialog";
import { AdjustStockDialog } from "./adjust-stock-dialog";
import { AdjustmentHistory } from "./adjustment-history";
import { Paginator } from "./paginator";

const PAGE_SIZE = 10;

interface InventoryListProps {
  items: InventoryItem[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

export function InventoryList({ items, tenantSlug, tenantId, currencySymbol, currencyLocale }: InventoryListProps) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const slice = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  async function handleDelete(item: InventoryItem) {
    if (!isOnline) { toast.error("You're offline. Connect to delete items."); return; }
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteItem(tenantSlug, tenantId, item.id);
      toast.success(`"${item.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleViewHistory(item: InventoryItem) {
    setHistoryItem(item);
    try {
      const adjustments = await getAdjustmentHistory(tenantSlug, tenantId, item.id);
      setHistoryData(adjustments);
    } catch {
      toast.error("Failed to load adjustment history");
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Boxes className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">No items</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-4 sm:px-5">
        <div>
          <p className="eyebrow-label">Inventory</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Items</h2>
        </div>
        <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {items.length}
        </div>
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {slice.map((item) => {
          const isLow = item.quantity <= item.reorderAt;
          const isDeleting = deletingId === item.id;
          return (
            <div
              key={item.id}
              className={cn("rounded-[24px] border border-border/70 bg-white p-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.26)]", isDeleting && "opacity-50")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isLow && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />
                  }>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingItem(item)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAdjustingItem(item)}>
                      <ArrowUpDown className="mr-2 h-4 w-4" /> Adjust Stock
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewHistory(item)}>
                      <History className="mr-2 h-4 w-4" /> View History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.sku ? (
                  <code className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] text-foreground/75">
                    {item.sku}
                  </code>
                ) : null}
                {item.category?.name ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 text-primary/70" />
                    {item.category.name}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Stock</p>
                  <p className={cn("mt-1 font-semibold tabular-nums", isLow ? "text-amber-700" : "text-foreground")}>{item.quantity}</p>
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Price</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {currencySymbol}{Number(item.unitPrice).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Value</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {currencySymbol}{(Number(item.unitCost) * item.quantity).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="pl-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Item</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">SKU</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Category</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Stock</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Price</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((item) => {
              const isLow = item.quantity <= item.reorderAt;
              const isDeleting = deletingId === item.id;
              return (
                <TableRow
                  key={item.id}
                  className={cn("border-border/40 transition-colors hover:bg-muted/20", isDeleting && "opacity-50")}
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="max-w-48 truncate text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.sku ? (
                      <code className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] text-foreground/75">
                        {item.sku}
                      </code>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.category?.name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary/70" />
                        {item.category.name}
                      </span>
                    ) : <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      isLow ? "text-amber-700" : "text-foreground"
                    )}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-foreground">
                    {currencySymbol}{Number(item.unitPrice).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {currencySymbol}{(Number(item.unitCost) * item.quantity).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />
                      }>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingItem(item)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAdjustingItem(item)}>
                          <ArrowUpDown className="mr-2 h-4 w-4" /> Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewHistory(item)}>
                          <History className="mr-2 h-4 w-4" /> View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <Paginator
          page={page}
          totalPages={totalPages}
          onPage={setPage}
        />
      </div>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          currencySymbol={currencySymbol}
          open={!!editingItem}
          onOpenChange={(o) => { if (!o) setEditingItem(null); }}
        />
      )}

      {adjustingItem && (
        <AdjustStockDialog
          item={adjustingItem}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          open={!!adjustingItem}
          onOpenChange={(o) => { if (!o) setAdjustingItem(null); }}
        />
      )}

      {historyItem && (
        <AdjustmentHistory
          open={!!historyItem}
          onOpenChange={(o) => { if (!o) setHistoryItem(null); }}
          itemName={historyItem.name}
          adjustments={historyData}
        />
      )}
    </>
  );
}
