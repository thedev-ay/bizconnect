"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteAsset } from "../actions";
import type { Asset } from "../types";
import { AssetDialog } from "./asset-dialog";
import { AssetDetailDialog } from "./asset-detail-dialog";

interface AssetsListProps {
  tenantSlug: string;
  tenantId: string;
  assets: Asset[];
  customers: Array<{ id: string; name: string; phone: string | null }>;
  branches: Array<{ id: string; name: string }>;
  initialCustomerId?: string;
}

export function AssetsList({
  tenantSlug,
  tenantId,
  assets,
  customers,
  branches,
  initialCustomerId,
}: AssetsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [assetType, setAssetType] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const assetTypes = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.assetType).filter(Boolean))).sort(),
    [assets]
  );

  const filteredAssets = assets.filter((asset) => {
    if (initialCustomerId && asset.customerId !== initialCustomerId) return false;
    if (status !== "all" && asset.status !== status) return false;
    if (assetType !== "all" && asset.assetType !== assetType) return false;
    if (branchId !== "all" && (asset.branchId ?? "none") !== branchId) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      asset.name,
      asset.assetType,
      asset.identifier ?? "",
      asset.serialNo ?? "",
      asset.customer.name,
      asset.brand ?? "",
      asset.model ?? "",
    ].some((value) => value.toLowerCase().includes(q));
  });

  async function handleDelete(asset: Asset) {
    if (!confirm(`Delete ${asset.name}?`)) return;
    try {
      await deleteAsset(tenantSlug, tenantId, asset.id);
      toast.success("Asset deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete asset");
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search asset, identifier, customer..."
            className="rounded-full"
          />
          <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assetType} onValueChange={(value) => setAssetType(value ?? "all")}>
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="Asset type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {assetTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchId} onValueChange={(value) => setBranchId(value ?? "all")}>
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              <SelectItem value="none">No branch</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Assets</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{assets.length}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{assets.filter((asset) => asset.status === "active").length}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">With Open Jobs</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{assets.filter((asset) => asset.openJobCount > 0).length}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent Added</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {assets.filter((asset) => Date.now() - new Date(asset.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 30).length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200/80 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Open Jobs</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-14 text-center text-sm text-muted-foreground">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} className="border-slate-200/80">
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => setSelectedAsset(asset)}>
                        <p className="text-sm font-semibold text-slate-950">{asset.name}</p>
                        <p className="text-xs text-slate-500">{[asset.brand, asset.model].filter(Boolean).join(" ") || asset.serialNo || "No extra details"}</p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-slate-900">{asset.customer.name}</p>
                        {asset.customer.phone && <p className="text-xs text-slate-500">{asset.customer.phone}</p>}
                        <Link href={`/${tenantSlug}/crm`} className="text-xs font-medium text-primary hover:text-primary/80">
                          CRM
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{asset.assetType}</TableCell>
                    <TableCell className="text-sm text-slate-700">{asset.identifier ?? asset.serialNo ?? "—"}</TableCell>
                    <TableCell className="text-sm text-slate-700">{asset.branch?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                        {asset.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{asset.openJobCount}</TableCell>
                    <TableCell className="text-sm text-slate-500">{format(new Date(asset.updatedAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedAsset(asset)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AssetDialog
                          tenantSlug={tenantSlug}
                          tenantId={tenantId}
                          customers={customers}
                          branches={branches}
                          asset={asset}
                          triggerLabel="Edit"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                          onClick={() => handleDelete(asset)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AssetDetailDialog asset={selectedAsset} open={Boolean(selectedAsset)} onOpenChange={(open) => !open && setSelectedAsset(null)} />
    </>
  );
}
