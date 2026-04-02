"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, AlertTriangle, ArrowUpDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "../types";
import { deleteItem } from "../actions";
import { EditItemDialog } from "./edit-item-dialog";
import { AdjustStockDialog } from "./adjust-stock-dialog";

interface InventoryListProps {
  items: InventoryItem[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

export function InventoryList({ items, tenantSlug, tenantId, currencySymbol, currencyLocale }: InventoryListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteItem(tenantSlug, tenantId, item.id);
      toast.success(`"${item.name}" deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-zinc-400">No items yet. Add your first inventory item.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 hover:bg-transparent">
            <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Item</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SKU</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Category</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Stock</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Unit Price</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Cost Value</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isLow = item.quantity <= item.reorderAt;
            const isDeleting = deletingId === item.id;
            return (
              <TableRow
                key={item.id}
                className={cn("border-zinc-100 transition-colors", isDeleting && "opacity-50")}
              >
                <TableCell className="pl-5">
                  <div className="flex items-center gap-2">
                    {isLow && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                      {item.description && (
                        <p className="max-w-48 truncate text-xs text-zinc-400">{item.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {item.sku ? (
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                      {item.sku}
                    </code>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {item.category?.name ?? <span className="text-zinc-300">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    isLow ? "text-amber-600" : "text-zinc-800"
                  )}>
                    {item.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-zinc-800">
                  {currencySymbol}{Number(item.unitPrice).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-sm text-zinc-500">
                  {currencySymbol}{(Number(item.unitCost) * item.quantity).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700" />
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
    </>
  );
}
