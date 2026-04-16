"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Asset } from "../types";

interface AssetDetailDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDetailDialog({ asset, open, onOpenChange }: AssetDetailDialogProps) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border border-slate-200/80 bg-white p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)]">
        <DialogHeader className="border-b border-slate-200/80 px-5 py-4">
          <p className="eyebrow-label text-primary">Assets</p>
          <DialogTitle>{asset.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <section className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Customer</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{asset.customer.name}</p>
              {asset.customer.phone && <p className="text-sm text-slate-600">{asset.customer.phone}</p>}
              {asset.customer.email && <p className="text-sm text-slate-600">{asset.customer.email}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Details</p>
              <p className="mt-1 text-sm text-slate-700">{asset.assetType}</p>
              <p className="text-sm text-slate-600">{[asset.brand, asset.model].filter(Boolean).join(" ") || "No brand/model"}</p>
              <p className="text-sm text-slate-600">{asset.identifier ?? asset.serialNo ?? "No identifier"}</p>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200/80 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p className="mt-2 text-lg font-semibold capitalize text-slate-950">{asset.status}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open Jobs</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{asset.openJobCount}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Invoices</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{asset.invoiceCount}</p>
            </div>
          </section>

          {asset.notes && (
            <section className="rounded-[24px] border border-slate-200/80 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Notes</p>
              <p className="mt-2 text-sm text-slate-700">{asset.notes}</p>
            </section>
          )}

          <section className="rounded-[24px] border border-slate-200/80 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent Job Orders</p>
              <p className="text-xs text-slate-500">{asset.recentJobOrders.length} shown</p>
            </div>
            <div className="space-y-2">
              {asset.recentJobOrders.length === 0 ? (
                <p className="text-sm text-slate-500">No job orders yet.</p>
              ) : (
                asset.recentJobOrders.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-slate-200/80 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold text-slate-500">{job.jobNo}</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">{job.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs capitalize text-slate-600">{job.status}</p>
                        <p className="text-xs text-slate-500">{format(new Date(job.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
