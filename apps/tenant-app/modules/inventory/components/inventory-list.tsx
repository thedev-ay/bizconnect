"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { MoreHorizontal, Plus, Minus } from "lucide-react";
import type { InventoryItem } from "../types";
import { adjustStock, deleteItem } from "../actions";

interface InventoryListProps {
  items: InventoryItem[];
  tenantSlug: string;
  tenantId: string;
}

export function InventoryList({ items, tenantSlug, tenantId }: InventoryListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAdjust(itemId: string, delta: number, name: string) {
    setLoading(itemId);
    try {
      await adjustStock(tenantSlug, tenantId, itemId, delta);
      toast.success(`Stock ${delta > 0 ? "added to" : "removed from"} ${name}`);
      router.refresh();
    } catch {
      toast.error("Failed to adjust stock");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(itemId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setLoading(itemId);
    try {
      await deleteItem(tenantSlug, tenantId, itemId);
      toast.success(`"${name}" deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
              No items yet. Add your first inventory item.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => {
            const isLow = item.quantity <= item.reorderAt;
            return (
              <TableRow key={item.id} className={loading === item.id ? "opacity-50" : ""}>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </TableCell>
                <TableCell>
                  {item.sku ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.sku}</code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.category?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleAdjust(item.id, -1, item.name)}
                      disabled={item.quantity <= 0 || loading === item.id}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className={`w-8 text-center font-medium ${isLow ? "text-destructive" : ""}`}>
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleAdjust(item.id, 1, item.name)}
                      disabled={loading === item.id}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ₱{Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  {isLow ? (
                    <Badge variant="destructive" className="text-xs">
                      Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      In Stock
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"></Button>}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(item.id, item.name)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
