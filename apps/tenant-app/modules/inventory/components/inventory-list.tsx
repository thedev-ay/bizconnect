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
import { MoreHorizontal, AlertTriangle, ArrowUpDown, Pencil, History, Boxes, Tag, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const q = searchQuery.trim().toLowerCase();
  const filteredItems = q
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q) ||
          i.category?.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      )
    : items;

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const slice = filteredItems.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 text-muted-foreground shadow-sm">
          <Boxes className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No inventory items yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first item to start tracking stock.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none text-muted-foreground/55" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search items, SKUs, categories…"
            className="w-full rounded-full border border-border/60 bg-muted/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-border focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No items matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : null}
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
            {filteredItems.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-3 py-20 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 text-muted-foreground shadow-sm">
                      <Boxes className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">No items matching &ldquo;{searchQuery}&rdquo;</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try a different search term.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
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
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        isLow ? "text-amber-700" : "text-foreground"
                      )}>
                        {item.quantity}
                        <span className="font-normal text-muted-foreground/60"> / {item.reorderAt}</span>
                      </span>
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-border/60">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isLow ? "bg-amber-500" : "bg-primary/60"
                          )}
                          style={{
                            width: `${Math.min(100, Math.round((item.quantity / Math.max(1, item.reorderAt * 2)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 data-[state=open]:opacity-100 hover:text-foreground" />
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
