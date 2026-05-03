"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentPanel } from "@/components/layout/page-shell";
import { InvoiceList } from "./invoice-list";
import type { Invoice } from "../types";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = ["all", "unpaid", "partial", "overdue", "paid"] as const;
type BillingFilter = typeof FILTER_OPTIONS[number];

function isOverdueInvoice(invoice: Invoice) {
  return invoice.status !== "void" && Number(invoice.balanceDue) > 0 && new Date(invoice.dueDate) < new Date();
}

function matchesBillingFilter(invoice: Invoice, filter: BillingFilter) {
  if (filter === "all") return true;
  if (filter === "overdue") return isOverdueInvoice(invoice);
  if (filter === "paid") return invoice.status === "paid";
  if (filter === "partial") return invoice.status === "partial";
  if (filter === "unpaid") return invoice.status !== "paid" && invoice.status !== "void" && Number(invoice.balanceDue) > 0;
  return true;
}

function getInitialFilter(): BillingFilter {
  if (typeof window === "undefined") return "all";
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("filter");
  return FILTER_OPTIONS.includes((raw ?? "") as BillingFilter) ? (raw as BillingFilter) : "all";
}

interface BillingLedgerProps {
  invoices: Invoice[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
  highlightedInvoiceId?: string;
}

export function BillingLedger({
  invoices,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  highlightedInvoiceId,
}: BillingLedgerProps) {
  const [filter, setFilter] = useState<BillingFilter>("all");

  useEffect(() => {
    setFilter(getInitialFilter());
  }, []);

  const filterCounts = useMemo<Record<BillingFilter, number>>(() => ({
    all: invoices.length,
    unpaid: invoices.filter((invoice) => matchesBillingFilter(invoice, "unpaid")).length,
    partial: invoices.filter((invoice) => invoice.status === "partial").length,
    overdue: invoices.filter((invoice) => isOverdueInvoice(invoice)).length,
    paid: invoices.filter((invoice) => invoice.status === "paid").length,
  }), [invoices]);

  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => matchesBillingFilter(invoice, filter)),
    [filter, invoices]
  );

  function updateFilter(nextFilter: BillingFilter) {
    setFilter(nextFilter);

    const params = new URLSearchParams(window.location.search);
    if (nextFilter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", nextFilter);
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <ContentPanel className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: "all", label: "All invoices" },
            { key: "unpaid", label: "Unpaid" },
            { key: "partial", label: "Partial" },
            { key: "overdue", label: "Overdue" },
            { key: "paid", label: "Paid" },
          ] as const).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateFilter(option.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === option.key
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  filter === option.key ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                )}
              >
                {filterCounts[option.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <InvoiceList
        invoices={filteredInvoices}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        currencySymbol={currencySymbol}
        currencyLocale={currencyLocale}
        highlightedInvoiceId={highlightedInvoiceId}
      />
    </ContentPanel>
  );
}
