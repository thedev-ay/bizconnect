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
import { MoreHorizontal, CheckCircle, XCircle, Send, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice } from "../types";
import { markInvoicePaid, sendReminder, voidInvoice, sendInvoice } from "../actions";
import { LogFollowUpDialog } from "./log-follow-up-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";

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
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  void: "border-border bg-muted text-muted-foreground",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank transfer",
  other: "Other",
};

const ACTIVITY_LABEL: Record<string, string> = {
  invoice_sent: "Initial invoice issue",
  follow_up_logged: "Manual follow-up",
  payment_recorded: "Payment recorded",
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
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
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Balance</p>
                    <p className="mt-1 font-medium text-foreground">
                      {currencySymbol}{Number(inv.balanceDue).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
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
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Balance</TableHead>
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
                      {currencySymbol}{Number(inv.balanceDue).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
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
                                <Send className="mr-2 h-4 w-4" /> Mark as Issued
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "paid" && Number(inv.balanceDue) > 0 && (
                              <DropdownMenuItem
                                onClick={() => handleAction(inv.id, sendReminder, "Follow-up logged")}
                              >
                                <BellRing className="mr-2 h-4 w-4" /> Quick Follow-up
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "paid" && Number(inv.balanceDue) > 0 && (
                              <DropdownMenuItem
                                onClick={() => handleAction(inv.id, markInvoicePaid, "Invoice marked as paid")}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {Number(inv.amountPaid) <= 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleAction(inv.id, voidInvoice, "Invoice voided")}
                                >
                                  <XCircle className="mr-2 h-4 w-4" /> Void
                                </DropdownMenuItem>
                              </>
                            )}
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
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full border-l-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,250,0.92)_100%)] sm:max-w-2xl"
        >
          {selectedInvoice && (
            <>
            <SheetHeader className="border-b border-border/70 pr-10 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Billing / Detail</p>
                  <SheetTitle className="font-mono text-base">{selectedInvoice.invoiceNo}</SheetTitle>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_PILL[selectedInvoice.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}
                >
                  {selectedInvoice.status}
                </span>
              </div>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">
                Issued {format(new Date(selectedInvoice.createdAt), "MMM d, yyyy")} · Due {format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <section className="rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80 p-4">
                <div className="flex gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Customer</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{selectedInvoice.customerName}</p>
                    {selectedInvoice.customerEmail && (
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">{selectedInvoice.customerEmail}</p>
                    )}
                  </div>
                  <div className="shrink-0 space-y-3 text-right">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Issued</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{format(new Date(selectedInvoice.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Due</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5">
                <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                <div className="overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80">
                  <div className="divide-y divide-border/60">
                    {selectedInvoice.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {currencySymbol}{Number(item.unitPrice).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {currencySymbol}{Number(item.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{currencySymbol}{Number(selectedInvoice.subtotal).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{currencySymbol}{Number(selectedInvoice.tax).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums">{currencySymbol}{Number(selectedInvoice.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount paid</span>
                  <span className="tabular-nums">{currencySymbol}{Number(selectedInvoice.amountPaid).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance due</span>
                  <span className={cn("tabular-nums", Number(selectedInvoice.balanceDue) > 0 ? "text-foreground" : "text-emerald-700")}>
                    {currencySymbol}{Number(selectedInvoice.balanceDue).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedInvoice.paidAt && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid in full</span>
                    <span className="tabular-nums">{format(new Date(selectedInvoice.paidAt), "MMM d, yyyy")}</span>
                  </div>
                )}
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedInvoice.payments.length} payment{selectedInvoice.payments.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80">
                  {selectedInvoice.payments.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No payments recorded yet.</div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {selectedInvoice.payments.map((payment) => (
                        <div key={payment.id} className="flex items-start justify-between gap-4 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {PAYMENT_LABEL[payment.paymentMethod] ?? payment.paymentMethod}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.receivedAt), "MMM d, yyyy")}
                            </p>
                            {payment.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {currencySymbol}{Number(payment.amount).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Collection Activity</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedInvoice.activities.length} event{selectedInvoice.activities.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80">
                  {selectedInvoice.activities.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">No reminder or send activity yet.</div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {selectedInvoice.activities.map((activity) => (
                        <div key={activity.id} className="flex items-start justify-between gap-4 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {ACTIVITY_LABEL[activity.type] ?? activity.type.replaceAll("_", " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.createdAt), "MMM d, yyyy")}
                            </p>
                            {activity.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{activity.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {selectedInvoice.notes && (
                <section className="rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </section>
              )}
            </div>

            <SheetFooter className="border-t border-border/70 p-4 sm:p-5">
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                {selectedInvoice.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                  className="rounded-full"
                  disabled={loading === selectedInvoice.id}
                  onClick={() => handleAction(selectedInvoice.id, sendInvoice, "Invoice marked as sent")}
                >
                    Mark as Issued
                  </Button>
                )}
                {selectedInvoice.status !== "paid" && selectedInvoice.status !== "void" && Number(selectedInvoice.balanceDue) > 0 && (
                  <LogFollowUpDialog
                    tenantSlug={tenantSlug}
                    tenantId={tenantId}
                    invoiceId={selectedInvoice.id}
                    invoiceNo={selectedInvoice.invoiceNo}
                    onLogged={() => router.refresh()}
                    triggerClassName="rounded-full"
                  />
                )}
                {selectedInvoice.status !== "paid" && selectedInvoice.status !== "void" && Number(selectedInvoice.balanceDue) > 0 && (
                  <RecordPaymentDialog
                    tenantSlug={tenantSlug}
                    tenantId={tenantId}
                    invoiceId={selectedInvoice.id}
                    invoiceNo={selectedInvoice.invoiceNo}
                    currencySymbol={currencySymbol}
                    maxAmount={Number(selectedInvoice.balanceDue)}
                    onRecorded={() => router.refresh()}
                    triggerClassName="rounded-full"
                  />
                )}
                {selectedInvoice.status !== "paid" && selectedInvoice.status !== "void" && Number(selectedInvoice.balanceDue) > 0 && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={loading === selectedInvoice.id}
                    onClick={() => handleAction(selectedInvoice.id, markInvoicePaid, "Invoice marked as paid")}
                  >
                    Mark as Paid
                  </Button>
                )}
                {selectedInvoice.status !== "void" && Number(selectedInvoice.amountPaid) <= 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
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
