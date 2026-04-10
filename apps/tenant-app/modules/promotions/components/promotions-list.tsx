"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Plus, Tag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { togglePromotion, deletePromotion } from "../actions";
import { PROMO_TYPE_LABELS, DAY_LABELS, type Promotion } from "../types";
import { PromotionDialog } from "./promotion-dialog";

interface ProductOption {
  id: string;
  name: string;
  category: string | null;
}

interface PromotionsListProps {
  promotions: Promotion[];
  tenantSlug: string;
  tenantId: string;
  products: ProductOption[];
}

type FilterTab = "all" | "active" | "inactive" | "expired";

const TYPE_PILL: Record<string, string> = {
  percent_off: "bg-blue-50 text-blue-700",
  flat_off: "bg-violet-50 text-violet-700",
  fixed_price: "bg-amber-50 text-amber-700",
  buy_x_get_y: "bg-emerald-50 text-emerald-700",
  day_time: "bg-pink-50 text-pink-700",
};

const STATUS_STYLES = {
  active:    "bg-emerald-50 text-emerald-700",
  inactive:  "bg-zinc-100 text-zinc-500",
  expired:   "bg-red-50 text-red-600",
  scheduled: "bg-blue-50 text-blue-700",
};

const STATUS_LABELS = {
  active:    "Active",
  inactive:  "Inactive",
  expired:   "Expired",
  scheduled: "Scheduled",
};

function getStatus(p: Promotion): keyof typeof STATUS_STYLES {
  const now = new Date();
  if (p.endsAt && new Date(p.endsAt) < now) return "expired";
  if (!p.isActive) return "inactive";
  if (p.startsAt && new Date(p.startsAt) > now) return "scheduled";
  return "active";
}

function isExpiringSoon(p: Promotion): boolean {
  if (!p.endsAt) return false;
  const endsAt = new Date(p.endsAt);
  const now = new Date();
  const weekFromNow = new Date(now); weekFromNow.setDate(now.getDate() + 7);
  return endsAt >= now && endsAt <= weekFromNow;
}

function promoSummary(p: Promotion): string {
  if (p.type === "percent_off") return `${p.value}% off`;
  if (p.type === "flat_off") return `Flat ${p.value} off`;
  if (p.type === "fixed_price") return `Fixed at ${p.value}`;
  if (p.type === "buy_x_get_y") return `Buy ${p.buyQty} get ${p.getQty} free`;
  if (p.type === "day_time") {
    const days = (p.daysOfWeek as number[] | null)?.map((d) => DAY_LABELS[d]).join(", ") ?? "All days";
    const time = p.startTime && p.endTime ? ` · ${p.startTime}–${p.endTime}` : "";
    return `${p.value}% off · ${days}${time}`;
  }
  return "";
}

export function PromotionsList({ promotions, tenantSlug, tenantId, products }: PromotionsListProps) {
  const router = useRouter();
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = promotions.filter((p) => {
    const status = getStatus(p);
    if (filter === "all") return true;
    if (filter === "active") return status === "active" || status === "scheduled";
    if (filter === "inactive") return status === "inactive";
    if (filter === "expired") return status === "expired";
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: promotions.length },
    {
      key: "active",
      label: "Active",
      count: promotions.filter((p) => { const s = getStatus(p); return s === "active" || s === "scheduled"; }).length,
    },
    {
      key: "inactive",
      label: "Inactive",
      count: promotions.filter((p) => getStatus(p) === "inactive").length,
    },
    {
      key: "expired",
      label: "Expired",
      count: promotions.filter((p) => getStatus(p) === "expired").length,
    },
  ];

  async function handleToggle(promo: Promotion) {
    setTogglingId(promo.id);
    try {
      await togglePromotion(tenantSlug, tenantId, promo.id, !promo.isActive);
      router.refresh();
    } catch {
      toast.error("Failed to update promotion");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(promo: Promotion) {
    if (!confirm(`Delete "${promo.name}"? This cannot be undone.`)) return;
    try {
      await deletePromotion(tenantSlug, tenantId, promo.id);
      toast.success(`"${promo.name}" deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete promotion");
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-100">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === tab.key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                  filter === tab.key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-400"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New Promotion
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="h-8 w-8 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-400">
            {promotions.length === 0 ? "No promotions yet." : `No ${filter} promotions.`}
          </p>
          {promotions.length === 0 && (
            <p className="text-xs text-zinc-300 mt-1">Create one to offer discounts at checkout.</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {filtered.map((promo) => {
            const status = getStatus(promo);
            const expiring = isExpiringSoon(promo);
            const isInactive = status === "inactive" || status === "expired";

            return (
              <div
                key={promo.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition-colors",
                  isInactive && "bg-zinc-50/60"
                )}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-semibold", isInactive ? "text-zinc-500" : "text-zinc-800")}>
                      {promo.name}
                    </p>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      TYPE_PILL[promo.type] ?? "bg-zinc-100 text-zinc-500"
                    )}>
                      {PROMO_TYPE_LABELS[promo.type]}
                    </span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      STATUS_STYLES[status]
                    )}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  <p className={cn("text-xs", isInactive ? "text-zinc-400" : "text-zinc-500")}>
                    {promoSummary(promo)}
                  </p>

                  {promo.description && (
                    <p className="text-xs text-zinc-400">{promo.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    {promo.items.length > 0 ? (
                      <span>{promo.items.length} product{promo.items.length !== 1 ? "s" : ""}</span>
                    ) : (
                      <span>All products</span>
                    )}
                    {promo.startsAt && (
                      <span>From {format(new Date(promo.startsAt), "MMM d, yyyy")}</span>
                    )}
                    {promo.endsAt && (
                      <span>Until {format(new Date(promo.endsAt), "MMM d, yyyy")}</span>
                    )}
                    {expiring && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Expiring soon
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    size="sm"
                    checked={promo.isActive}
                    onCheckedChange={() => handleToggle(promo)}
                    disabled={togglingId === promo.id}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700" />
                    }>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingPromo(promo)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(promo)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PromotionDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        products={products}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editingPromo && (
        <PromotionDialog
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          products={products}
          promotion={editingPromo}
          open={!!editingPromo}
          onOpenChange={(o) => { if (!o) setEditingPromo(null); }}
        />
      )}
    </>
  );
}
