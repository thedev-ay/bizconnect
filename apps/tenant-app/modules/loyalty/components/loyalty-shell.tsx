"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Star, Gift, Phone, Plus, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LoyaltyCard, LoyaltySetting, LoyaltyActivity } from "../types";
import { addStamp, redeemReward, deleteLoyaltyCard } from "../actions";
import { LoyaltySettingsDialog } from "./loyalty-settings-dialog";
import { NewCardDialog, NewCardButton } from "./new-card-dialog";

interface LoyaltyCardWithActivity extends LoyaltyCard {
  recentActivity: LoyaltyActivity[];
}

interface LoyaltyShellProps {
  cards: LoyaltyCardWithActivity[];
  settings: LoyaltySetting;
  tenantSlug: string;
  tenantId: string;
}

function StampGrid({ current, total }: { current: number; total: number }) {
  const cells = Array.from({ length: total }, (_, i) => i < current);
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.min(total, 5)}, 1fr)` }}
    >
      {cells.map((filled, i) => (
        <div
          key={i}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
            filled
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-zinc-200 bg-zinc-50 text-zinc-300"
          )}
        >
          <Star className={cn("h-4 w-4", filled ? "fill-white" : "fill-none")} />
        </div>
      ))}
    </div>
  );
}

export function LoyaltyShell({ cards, settings, tenantSlug, tenantId }: LoyaltyShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(cards[0]?.id ?? null);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState<"stamp" | "redeem" | "delete" | null>(null);

  const q = search.toLowerCase();
  const filtered = cards.filter((c) =>
    !q ||
    c.customerName.toLowerCase().includes(q) ||
    c.phone?.toLowerCase().includes(q)
  );

  const selected = cards.find((c) => c.id === selectedId) ?? null;
  const canRedeem = selected ? selected.currentStamps >= settings.stampsPerReward : false;
  const noMatchAndSearch = q.length > 0 && filtered.length === 0;

  async function handleAddStamp() {
    if (!selected) return;
    setActionLoading("stamp");
    try {
      await addStamp(tenantSlug, tenantId, selected.id);
      toast.success("Stamp added!");
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add stamp");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRedeem() {
    if (!selected || !canRedeem) return;
    setActionLoading("redeem");
    try {
      await redeemReward(tenantSlug, tenantId, selected.id, settings.stampsPerReward);
      toast.success(`Reward redeemed! (${settings.rewardDescription})`);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to redeem");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setActionLoading("delete");
    try {
      await deleteLoyaltyCard(tenantSlug, tenantId, selected.id);
      toast.success("Card deleted");
      setSelectedId(cards.find((c) => c.id !== selected.id)?.id ?? null);
      setConfirmDelete(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Failed to delete");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      <div className="flex h-full gap-4">
        {/* Left panel — search + list */}
        <div className="flex w-72 shrink-0 flex-col gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
            {filtered.length === 0 && !noMatchAndSearch && (
              <p className="py-8 text-center text-xs text-zinc-300">No cards yet</p>
            )}

            {noMatchAndSearch && (
              <div className="flex flex-col items-center gap-2 py-6 px-4">
                <p className="text-xs text-zinc-400 text-center">No card for "{search}"</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => setNewCardOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                  Create card
                </Button>
              </div>
            )}

            <div className="divide-y divide-zinc-100">
              {filtered.map((card) => {
                const progress = Math.min(card.currentStamps, settings.stampsPerReward);
                const isReady = card.currentStamps >= settings.stampsPerReward;
                return (
                  <button
                    key={card.id}
                    onClick={() => { setSelectedId(card.id); setConfirmDelete(false); }}
                    className={cn(
                      "w-full px-3 py-2.5 text-left transition-colors hover:bg-zinc-50",
                      selectedId === card.id && "bg-zinc-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-800">{card.customerName}</p>
                        {card.phone && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <Phone className="h-2.5 w-2.5" />
                            {card.phone}
                          </div>
                        )}
                      </div>
                      {isReady ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Ready!
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-semibold text-zinc-400 tabular-nums">
                          {progress}/{settings.stampsPerReward}
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isReady ? "bg-emerald-500" : "bg-blue-400"
                        )}
                        style={{ width: `${(progress / settings.stampsPerReward) * 100}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel — card detail */}
        <div className="min-w-0 flex-1">
          {selected ? (
            <div className="flex h-full flex-col gap-4">
              {/* Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{selected.customerName}</h2>
                    {selected.phone && (
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-zinc-400">
                        <Phone className="h-3.5 w-3.5" />
                        {selected.phone}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      Member since {format(new Date(selected.createdAt), "MMM d, yyyy")}
                      {" · "}{selected.totalStamps} total stamps
                    </p>
                  </div>

                  {canRedeem && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
                      <Gift className="mx-auto h-5 w-5 text-emerald-600" />
                      <p className="mt-0.5 text-xs font-semibold text-emerald-700">Ready to redeem!</p>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Stamp progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-700">Stamps</p>
                    <p className="text-sm font-bold tabular-nums text-zinc-900">
                      {selected.currentStamps} / {settings.stampsPerReward}
                    </p>
                  </div>
                  <StampGrid
                    current={selected.currentStamps}
                    total={settings.stampsPerReward}
                  />
                  <p className="text-xs text-zinc-400">
                    Reward: <span className="font-medium text-zinc-600">{settings.rewardDescription}</span>
                    {" · "}
                    {canRedeem
                      ? "Ready to claim!"
                      : `${settings.stampsPerReward - selected.currentStamps} more stamp${settings.stampsPerReward - selected.currentStamps !== 1 ? "s" : ""} needed`}
                  </p>
                </div>

                <Separator className="my-4" />

                {/* Actions */}
                {confirmDelete ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                    <p className="text-sm font-medium text-red-700">Delete this loyalty card? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleDelete} disabled={actionLoading === "delete"}>
                        {actionLoading === "delete" ? "Deleting..." : "Yes, delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive border-destructive/30"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex gap-2 ml-auto">
                      {canRedeem && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={handleRedeem}
                          disabled={!!actionLoading}
                        >
                          <Gift className="h-3.5 w-3.5" />
                          {actionLoading === "redeem" ? "Redeeming..." : "Redeem Reward"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleAddStamp}
                        disabled={!!actionLoading}
                        className="gap-1.5"
                      >
                        <Star className="h-3.5 w-3.5" />
                        {actionLoading === "stamp" ? "Adding..." : "Add Stamp"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity */}
              {selected.recentActivity.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="border-b border-zinc-100 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Recent Activity
                    </p>
                  </div>
                  <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                    {selected.recentActivity.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {a.type === "stamp" ? (
                            <Star className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <Gift className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          <span className="text-sm text-zinc-700">
                            {a.type === "stamp" ? "Stamp added" : `Reward redeemed (${a.stampsUsed} stamps)`}
                            {a.note && <span className="text-zinc-400"> · {a.note}</span>}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {format(new Date(a.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-200">
              <div className="text-center">
                <Star className="mx-auto h-8 w-8 text-zinc-200" />
                <p className="mt-2 text-sm text-zinc-400">Select a card or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewCardDialog
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        open={newCardOpen}
        defaultName={search}
        onOpenChange={setNewCardOpen}
        onCreated={(id) => setSelectedId(id)}
      />
    </>
  );
}
