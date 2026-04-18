"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Assets / Detail</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {asset.name}
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <section className="grid gap-4 rounded-[24px] border border-border/60 bg-background/62 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Customer</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{asset.customer.name}</p>
              {asset.customer.phone && <p className="text-sm text-muted-foreground">{asset.customer.phone}</p>}
              {asset.customer.email && <p className="text-sm text-muted-foreground">{asset.customer.email}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Details</p>
              <p className="mt-1 text-sm text-foreground/85">{asset.assetType}</p>
              <p className="text-sm text-muted-foreground">{[asset.brand, asset.model].filter(Boolean).join(" ") || "No brand/model"}</p>
              <p className="text-sm text-muted-foreground">{asset.identifier ?? asset.serialNo ?? "No identifier"}</p>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold capitalize text-foreground">{asset.status}</p>
            </div>
            <div className="rounded-[20px] border border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open Jobs</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{asset.openJobCount}</p>
            </div>
            <div className="rounded-[20px] border border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Invoices</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{asset.invoiceCount}</p>
            </div>
          </section>

          {asset.notes && (
            <section className="rounded-[24px] border border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
              <p className="mt-2 text-sm text-foreground/80">{asset.notes}</p>
            </section>
          )}

          <section className="rounded-[24px] border border-border/60 bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent Job Orders</p>
              <p className="text-xs text-muted-foreground">{asset.recentJobOrders.length} shown</p>
            </div>
            <div className="space-y-2">
              {asset.recentJobOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job orders yet.</p>
              ) : (
                asset.recentJobOrders.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-border/60 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold text-muted-foreground">{job.jobNo}</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{job.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs capitalize text-muted-foreground">{job.status}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(job.createdAt), "MMM d, yyyy")}</p>
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
