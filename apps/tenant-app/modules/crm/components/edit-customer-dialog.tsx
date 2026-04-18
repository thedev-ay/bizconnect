"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCustomerSchema, type CreateCustomerInput } from "../schema";
import { updateCustomer } from "../actions";
import type { Customer } from "../types";
import { AssetDialog } from "@/modules/assets/components/asset-dialog";
import { deleteAsset } from "@/modules/assets";

interface EditCustomerDialogProps {
  customer: Customer;
  tenantSlug: string;
  tenantId: string;
  assetsEnabled: boolean;
  assets: Array<{ id: string; customerId: string; name: string; assetType: string; identifier: string | null; brand: string | null; model: string | null; serialNo: string | null; status: string }>;
  branches: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({
  customer,
  tenantSlug,
  tenantId,
  assetsEnabled,
  assets,
  branches,
  open,
  onOpenChange,
}: EditCustomerDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        notes: customer.notes ?? "",
        tags: customer.tags.join(", "),
      });
    }
  }, [open, customer, reset]);

  async function onSubmit(data: CreateCustomerInput) {
    try {
      await updateCustomer(tenantSlug, tenantId, customer.id, data);
      await queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
      toast.success("Customer updated");
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update customer");
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!confirm("Delete this asset?")) return;
    setDeletingAssetId(assetId);
    try {
      await deleteAsset(tenantSlug, tenantId, assetId);
      toast.success("Asset deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete asset");
    } finally {
      setDeletingAssetId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(920px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">CRM / Edit</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Edit customer
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Identity">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-foreground/80">Name *</Label>
                  <Input placeholder="Alex Morgan" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Email <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input type="email" placeholder="juan@example.com" {...register("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="+31 6 12345678" {...register("phone")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Details">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Address <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="Street, City, Province" {...register("address")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Tags <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="vip, wholesale" {...register("tags")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea placeholder="Notes" rows={2} {...register("notes")} />
                </div>
              </div>
            </DialogFormSection>

            {assetsEnabled ? (
              <DialogFormSection num="03" title="Assets">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{assets.length} linked</p>
                    <AssetDialog
                      tenantSlug={tenantSlug}
                      tenantId={tenantId}
                      customers={[{ id: customer.id, name: customer.name, phone: customer.phone }]}
                      branches={branches}
                      initialCustomerId={customer.id}
                      lockCustomer
                      triggerLabel="Add Asset"
                    />
                  </div>

                  <div className="overflow-hidden rounded-[20px] border border-border/60">
                    {assets.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">No assets yet.</div>
                    ) : (
                      assets.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {asset.name}{asset.identifier ? ` · ${asset.identifier}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {asset.assetType}{asset.brand || asset.model ? ` · ${[asset.brand, asset.model].filter(Boolean).join(" ")}` : ""}{asset.serialNo ? ` · ${asset.serialNo}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <AssetDialog
                              tenantSlug={tenantSlug}
                              tenantId={tenantId}
                              customers={[{ id: customer.id, name: customer.name, phone: customer.phone }]}
                              branches={branches}
                              asset={{ ...asset, tenantId, branchId: null, notes: null, createdAt: new Date(), updatedAt: new Date(), customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }, branch: null, openJobCount: 0, invoiceCount: 0, recentJobOrders: [] } as any}
                              initialCustomerId={customer.id}
                              lockCustomer
                              triggerLabel="Edit"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                              disabled={deletingAssetId === asset.id}
                              onClick={() => handleDeleteAsset(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogFormSection>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
