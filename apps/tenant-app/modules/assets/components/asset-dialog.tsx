"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-2xl border border-slate-200/80 bg-white p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)]">
        <DialogHeader>
          <p className="eyebrow-label text-primary">Assets</p>
          <DialogTitle>{isEditing ? "Edit Asset" : "New Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAssetFormSubmit} className="space-y-4">
          <div className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-white p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              {lockCustomer ? (
                <Input value={selectedCustomer?.name ?? ""} readOnly />
              ) : (
                <Select value={selectedCustomerId || undefined} onValueChange={(value) => setValue("customerId", value ?? "")}>
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
              {errors.customerId && <p className="text-sm text-destructive">{errors.customerId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Asset Name *</Label>
              <Input placeholder="Primary vehicle" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Input placeholder="Vehicle, equipment, device" {...register("assetType")} />
              {errors.assetType && <p className="text-sm text-destructive">{errors.assetType.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
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
            <div className="space-y-2">
              <Label>Status</Label>
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
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input placeholder="Toyota" {...register("brand")} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input placeholder="Hiace" {...register("model")} />
            </div>
            <div className="space-y-2">
              <Label>Identifier</Label>
              <Input placeholder="Plate no. or tag" {...register("identifier")} />
            </div>
            <div className="space-y-2">
              <Label>Serial No.</Label>
              <Input placeholder="Serial / unit code" {...register("serialNo")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} placeholder="Notes about this asset" {...register("notes")} />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200/80 pt-4">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
