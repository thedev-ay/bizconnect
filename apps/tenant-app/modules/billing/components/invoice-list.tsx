"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  highlightedInvoiceId?: string;
}

const STATUS_PILL: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-zinc-100 text-zinc-400 border-zinc-200",
};

export function InvoiceList({
  invoices,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  highlightedInvoiceId,
}: InvoiceListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(highlightedInvoiceId ?? null);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;

  useEffect(() => {
    if (!highlightedInvoiceId) return;
    setSelectedInvoiceId(highlightedInvoiceId);
    const row = document.getElementById(`invoice-row-${highlightedInvoiceId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedInvoiceId]);

  function updateInvoiceQuery(invoiceId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (invoiceId) {
      params.set("invoiceId", invoiceId);
    } else {
      params.delete("invoiceId");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    updateInvoiceQuery(invoiceId);
  }

  function closeInvoice() {
    setSelectedInvoiceId(null);
    updateInvoiceQuery(null);
  }

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
    <>
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
                  id={`invoice-row-${inv.id}`}
                  onClick={() => openInvoice(inv.id)}
                  className={cn(
                    "cursor-pointer border-zinc-100 hover:bg-zinc-50/50",
                    loading === inv.id && "opacity-50",
                    highlightedInvoiceId === inv.id && "bg-emerald-50/60 ring-1 ring-emerald-200"
                  )}
                >
                  <TableCell className="font-mono text-sm font-medium text-zinc-900">{inv.invoiceNo}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-zinc-900">{inv.customerName}</div>
                    {inv.jobOrderId && (
                      <div className="text-[11px] text-zinc-400">From completed job order</div>
                    )}
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
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" />}
                          onClick={(event) => event.stopPropagation()}
                        >
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
      <Sheet open={Boolean(selectedInvoice)} onOpenChange={(open) => { if (!open) closeInvoice(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          {selectedInvoice && (
            <>
            <SheetHeader className="border-b border-zinc-100 pb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono text-lg">{selectedInvoice.invoiceNo}</SheetTitle>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_PILL[selectedInvoice.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                    )}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
                <SheetDescription>
                  Review invoice details, then send or settle it without leaving billing.
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <section className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Customer</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{selectedInvoice.customerName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{selectedInvoice.customerEmail ?? "No email on file"}</p>
                  {selectedInvoice.jobOrderId && (
                    <p className="mt-2 text-xs font-medium text-emerald-700">Generated from a completed job order</p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500">Issued</span>
                    <span className="font-medium text-zinc-900">{format(new Date(selectedInvoice.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500">Due</span>
                    <span className="font-medium text-zinc-900">{format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500">Paid</span>
                    <span className="font-medium text-zinc-900">
                      {selectedInvoice.paidAt ? format(new Date(selectedInvoice.paidAt), "MMM d, yyyy") : "Not yet"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">Line Items</h3>
                  <span className="text-xs text-zinc-400">
                    {selectedInvoice.items.length} item{selectedInvoice.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <div className="divide-y divide-zinc-100">
                    {selectedInvoice.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{item.description}</p>
                          <p className="text-xs text-zinc-500">
                            {item.quantity} × {currencySymbol}{Number(item.unitPrice).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {currencySymbol}{Number(item.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-medium text-zinc-900">
                    {currencySymbol}{Number(selectedInvoice.subtotal).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Tax</span>
                  <span className="font-medium text-zinc-900">
                    {currencySymbol}{Number(selectedInvoice.tax).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="text-base font-bold text-zinc-900">
                    {currencySymbol}{Number(selectedInvoice.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedInvoice.notes && (
                  <div className="border-t border-zinc-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Notes</p>
                    <p className="mt-1 text-sm text-zinc-600">{selectedInvoice.notes}</p>
                  </div>
                )}
              </section>
            </div>

            <SheetFooter className="border-t border-zinc-100">
              <div className="flex w-full flex-wrap justify-end gap-2">
                {selectedInvoice.status === "draft" && (
                  <Button
                    variant="outline"
                    disabled={loading === selectedInvoice.id}
                    onClick={() => handleAction(selectedInvoice.id, sendInvoice, "Invoice marked as sent")}
                  >
                    Mark as Sent
                  </Button>
                )}
                {selectedInvoice.status !== "paid" && selectedInvoice.status !== "void" && (
                  <Button
                    disabled={loading === selectedInvoice.id}
                    onClick={() => handleAction(selectedInvoice.id, markInvoicePaid, "Invoice marked as paid")}
                  >
                    Mark as Paid
                  </Button>
                )}
                {selectedInvoice.status !== "void" && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={loading === selectedInvoice.id}
                    onClick={() => handleAction(selectedInvoice.id, voidInvoice, "Invoice voided")}
                  >
                    Void Invoice
                  </Button>
                )}
              </div>
            </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
