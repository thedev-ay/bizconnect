"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { MoreHorizontal, CheckCircle, XCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice } from "../types";
import { markInvoicePaid, voidInvoice, sendInvoice } from "../actions";

interface InvoiceListProps {
  invoices: Invoice[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

const STATUS_PILL: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-zinc-100 text-zinc-400 border-zinc-200",
};

export function InvoiceList({ invoices, tenantSlug, tenantId, currencySymbol, currencyLocale }: InvoiceListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    invoiceId: string,
    action: (slug: string, id: string, iid: string) => Promise<unknown>,
    successMsg: string
  ) {
    setLoading(invoiceId);
    try {
      await action(tenantSlug, tenantId, invoiceId);
      toast.success(successMsg);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-100 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Invoice #</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Customer</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Due Date</TableHead>
          <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Total</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Paid At</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-400">
              No invoices yet.
            </TableCell>
          </TableRow>
        ) : (
          invoices.map((inv) => {
            const isOverdue =
              inv.status !== "paid" &&
              inv.status !== "void" &&
              new Date(inv.dueDate) < new Date();

            return (
              <TableRow
                key={inv.id}
                className={cn("border-zinc-100 hover:bg-zinc-50/50", loading === inv.id && "opacity-50")}
              >
                <TableCell className="font-mono text-sm font-medium text-zinc-900">{inv.invoiceNo}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-zinc-900">{inv.customerName}</div>
                  {inv.customerEmail && (
                    <div className="text-xs text-zinc-400">{inv.customerEmail}</div>
                  )}
                </TableCell>
                <TableCell className={isOverdue ? "text-red-600" : "text-zinc-500"}>
                  <span className="text-sm">{format(new Date(inv.dueDate), "MMM d, yyyy")}</span>
                  {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-zinc-900">
                  {currencySymbol}{Number(inv.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_PILL[inv.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {inv.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {inv.paidAt ? format(new Date(inv.paidAt), "MMM d, yyyy") : <span className="text-zinc-300">—</span>}
                </TableCell>
                <TableCell>
                  {inv.status !== "void" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {inv.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleAction(inv.id, sendInvoice, "Invoice marked as sent")}
                          >
                            <Send className="mr-2 h-4 w-4" /> Mark as Sent
                          </DropdownMenuItem>
                        )}
                        {inv.status !== "paid" && (
                          <DropdownMenuItem
                            onClick={() => handleAction(inv.id, markInvoicePaid, "Invoice marked as paid")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleAction(inv.id, voidInvoice, "Invoice voided")}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Void
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
