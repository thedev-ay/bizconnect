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
  draft: "border-border bg-muted text-muted-foreground",
  sent: "border-sky-200 bg-sky-50 text-sky-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  void: "border-border bg-muted text-muted-foreground",
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
      <div className="space-y-3 p-4 sm:hidden">
        {invoices.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</div>
        ) : (
          invoices.map((inv) => {
            const isOverdue =
              inv.status !== "paid" &&
              inv.status !== "void" &&
              new Date(inv.dueDate) < new Date();

            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => openInvoice(inv.id)}
                className={cn(
                  "w-full rounded-[24px] border border-border/70 bg-white p-4 text-left shadow-[0_18px_36px_-30px_rgba(15,23,42,0.25)]",
                  loading === inv.id && "opacity-50",
                  highlightedInvoiceId === inv.id && "border-primary/25 ring-2 ring-primary/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-foreground">{inv.invoiceNo}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{inv.customerName}</p>
                    {inv.customerEmail && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{inv.customerEmail}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground">
                    {currencySymbol}{Number(inv.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_PILL[inv.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {inv.status}
                  </span>
                  {inv.jobOrderId && (
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Job order
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Due</p>
                    <p className={cn("mt-1 font-medium", isOverdue ? "text-red-600" : "text-foreground")}>
                      {format(new Date(inv.dueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Paid</p>
                    <p className="mt-1 font-medium text-foreground">
                      {inv.paidAt ? format(new Date(inv.paidAt), "MMM d, yyyy") : "Not yet"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">Invoice</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Customer</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Due</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Total</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Paid</TableHead>
              <TableHead className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
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
                      "cursor-pointer border-border/60 hover:bg-muted/20",
                      loading === inv.id && "opacity-50",
                      highlightedInvoiceId === inv.id && "bg-primary/5 ring-1 ring-primary/20"
                    )}
                  >
                    <TableCell className="pl-5 font-mono text-sm font-medium text-foreground">{inv.invoiceNo}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{inv.customerName}</div>
                      {inv.jobOrderId && (
                        <div className="text-[11px] text-muted-foreground">From job order</div>
                      )}
                      {inv.customerEmail && (
                        <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>
                      )}
                    </TableCell>
                    <TableCell className={isOverdue ? "text-red-600" : "text-muted-foreground"}>
                      <span className="text-sm">{format(new Date(inv.dueDate), "MMM d, yyyy")}</span>
                      {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-foreground">
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
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.paidAt ? format(new Date(inv.paidAt), "MMM d, yyyy") : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="pr-4">
                      {inv.status !== "void" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />}
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
      </div>
      <Sheet open={Boolean(selectedInvoice)} onOpenChange={(open) => { if (!open) closeInvoice(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          {selectedInvoice && (
            <>
            <SheetHeader className="border-b border-border/60 pb-4">
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
                  Review and settle.
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <section className="grid gap-4 rounded-[24px] border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Customer</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selectedInvoice.customerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedInvoice.customerEmail ?? "No email on file"}</p>
                  {selectedInvoice.jobOrderId && (
                    <p className="mt-2 text-xs font-medium text-emerald-700">Generated from a completed job order</p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Issued</span>
                    <span className="font-medium text-foreground">{format(new Date(selectedInvoice.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Due</span>
                    <span className="font-medium text-foreground">{format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-foreground">
                      {selectedInvoice.paidAt ? format(new Date(selectedInvoice.paidAt), "MMM d, yyyy") : "Not yet"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedInvoice.items.length} item{selectedInvoice.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[24px] border border-border/70">
                  <div className="divide-y divide-border/60">
                    {selectedInvoice.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {currencySymbol}{Number(item.unitPrice).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {currencySymbol}{Number(item.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-2 rounded-[24px] border border-border/70 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">
                    {currencySymbol}{Number(selectedInvoice.subtotal).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium text-foreground">
                    {currencySymbol}{Number(selectedInvoice.tax).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-base font-bold text-foreground">
                    {currencySymbol}{Number(selectedInvoice.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedInvoice.notes && (
                  <div className="border-t border-border/60 pt-3">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Notes</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                  </div>
                )}
              </section>
            </div>

            <SheetFooter className="border-t border-border/60">
              <div className="flex w-full flex-wrap justify-end gap-2">
                {selectedInvoice.status === "draft" && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={loading === selectedInvoice.id}
                    onClick={() => handleAction(selectedInvoice.id, sendInvoice, "Invoice marked as sent")}
                  >
                    Mark as Sent
                  </Button>
                )}
                {selectedInvoice.status !== "paid" && selectedInvoice.status !== "void" && (
                  <Button
                    className="rounded-full"
                    disabled={loading === selectedInvoice.id}
                    onClick={() => handleAction(selectedInvoice.id, markInvoicePaid, "Invoice marked as paid")}
                  >
                    Mark as Paid
                  </Button>
                )}
                {selectedInvoice.status !== "void" && (
                  <Button
                    variant="ghost"
                    className="rounded-full text-destructive hover:text-destructive"
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
