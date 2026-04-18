"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAssetSchema, type CreateAssetInput } from "../schema";
import { createAsset, updateAsset } from "../actions";
import type { Asset } from "../types";

interface AssetDialogProps {
  tenantSlug: string;
  tenantId: string;
  customers: Array<{ id: string; name: string; phone: string | null }>;
  branches: Array<{ id: string; name: string }>;
  asset?: Asset | null;
  initialCustomerId?: string;
  triggerLabel?: string;
  lockCustomer?: boolean;
  onSaved?: (asset: {
    id: string;
    customerId: string;
    name: string;
    assetType: string;
    identifier: string | null;
    brand: string | null;
    model: string | null;
    status: string;
  }) => void;
}

export function AssetDialog({
  tenantSlug,
  tenantId,
  customers,
  branches,
  asset,
  initialCustomerId,
  triggerLabel,
  lockCustomer,
  onSaved,
}: AssetDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = Boolean(asset);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssetInput>({
    resolver: zodResolver(createAssetSchema as any),
    defaultValues: {
      customerId: asset?.customerId ?? initialCustomerId ?? "",
      branchId: asset?.branchId ?? "",
      name: asset?.name ?? "",
      assetType: asset?.assetType ?? "",
      brand: asset?.brand ?? "",
      model: asset?.model ?? "",
      identifier: asset?.identifier ?? "",
      serialNo: asset?.serialNo ?? "",
      status: asset?.status ?? "active",
      notes: asset?.notes ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      customerId: asset?.customerId ?? initialCustomerId ?? "",
      branchId: asset?.branchId ?? "",
      name: asset?.name ?? "",
      assetType: asset?.assetType ?? "",
      brand: asset?.brand ?? "",
      model: asset?.model ?? "",
      identifier: asset?.identifier ?? "",
      serialNo: asset?.serialNo ?? "",
      status: asset?.status ?? "active",
      notes: asset?.notes ?? "",
    });
  }, [open, asset, initialCustomerId, reset]);

  async function onSubmit(data: CreateAssetInput) {
    try {
      if (asset) {
        const updated = await updateAsset(tenantSlug, tenantId, asset.id, data);
        onSaved?.({
          id: updated.id,
          customerId: updated.customerId,
          name: updated.name,
          assetType: updated.assetType,
          identifier: updated.identifier ?? null,
          brand: updated.brand ?? null,
          model: updated.model ?? null,
          status: updated.status,
        });
        toast.success("Asset updated");
      } else {
        const created = await createAsset(tenantSlug, tenantId, data);
        onSaved?.({
          id: created.id,
          customerId: created.customerId,
          name: created.name,
          assetType: created.assetType,
          identifier: created.identifier ?? null,
          brand: created.brand ?? null,
          model: created.model ?? null,
          status: created.status,
        });
        toast.success("Asset created");
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save asset");
    }
  }

  function handleAssetFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    void handleSubmit(onSubmit)(event);
  }

  const selectedCustomerId = watch("customerId");
  const selectedBranchId = watch("branchId") || "none";
  const selectedStatus = watch("status") ?? "active";
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const selectedBranch = selectedBranchId === "none"
    ? null
    : branches.find((branch) => branch.id === selectedBranchId);
  const statusLabels: Record<CreateAssetInput["status"], string> = {
    active: "Active",
    inactive: "Inactive",
    archived: "Archived",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant={asset ? "outline" : "default"} className="rounded-full px-4" />
        }
      >
        {asset ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
        {triggerLabel ?? (asset ? "Edit" : "New")}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(860px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Assets / {isEditing ? "Edit" : "New"}</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {isEditing ? "Edit asset" : "Add asset"}
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleAssetFormSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Ownership">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/80">Customer *</Label>
                {lockCustomer ? (
                  <Input value={selectedCustomer?.name ?? ""} readOnly />
                ) : (
                  <Select value={selectedCustomerId ?? ""} onValueChange={(value) => setValue("customerId", value ?? "")}>
                    <SelectTrigger>
                      {selectedCustomer
                        ? `${selectedCustomer.name}${selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}`
                        : <SelectValue placeholder="Select customer" />}
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Identity">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Asset Name *</Label>
                  <Input placeholder="Primary vehicle" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Asset Type *</Label>
                  <Input placeholder="Vehicle, equipment, device" {...register("assetType")} />
                  {errors.assetType && <p className="text-xs text-destructive">{errors.assetType.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Brand</Label>
                  <Input placeholder="Toyota" {...register("brand")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Model</Label>
                  <Input placeholder="Hiace" {...register("model")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="03" title="Tracking">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Branch</Label>
                  <Select value={selectedBranchId} onValueChange={(value) => setValue("branchId", !value || value === "none" ? "" : value)}>
                    <SelectTrigger>
                      {selectedBranch
                        ? selectedBranch.name
                        : <SelectValue placeholder="No branch" />}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Status</Label>
                  <Select value={selectedStatus} onValueChange={(value) => setValue("status", (value ?? "active") as CreateAssetInput["status"])}>
                    <SelectTrigger>
                      {statusLabels[selectedStatus]}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Identifier</Label>
                  <Input placeholder="Plate no. or tag" {...register("identifier")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Serial No.</Label>
                  <Input placeholder="Serial / unit code" {...register("serialNo")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="04" title="Details">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/80">Notes</Label>
                <Textarea rows={3} placeholder="Notes about this asset" {...register("notes")} />
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
