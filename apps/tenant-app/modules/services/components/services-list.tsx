"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Service } from "../types";
import { PRICING_TYPE_LABELS } from "../types";
import { toggleService, deleteService } from "../actions";
import { ServiceDialog } from "./service-dialog";

interface ServicesListProps {
  services: Service[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

export function ServicesList({ services, tenantSlug, tenantId, currencySymbol, currencyLocale }: ServicesListProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  async function handleToggle(service: Service, isActive: boolean) {
    try {
      await toggleService(tenantSlug, tenantId, service.id, isActive);
      router.refresh();
    } catch {
      toast.error("Failed to update service");
    }
  }

  async function handleDelete(service: Service) {
    if (!confirm(`Delete "${service.name}"? This cannot be undone.`)) return;
    try {
      await deleteService(tenantSlug, tenantId, service.id);
      toast.success(`"${service.name}" deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete service");
    }
  }

  // Group by category
  const categories = Array.from(new Set(services.map((s) => s.category ?? "Uncategorized"))).sort();

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {services.length} service{services.length !== 1 ? "s" : ""} ·{" "}
          {services.filter((s) => s.isActive).length} active
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-zinc-400">No services yet. Add your first service.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const group = services.filter((s) => (s.category ?? "Uncategorized") === cat);
            return (
              <div key={cat}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{cat}</p>
                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 overflow-hidden">
                  {group.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 bg-white transition-colors",
                        !service.isActive && "opacity-50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800">{service.name}</p>
                        {service.description && (
                          <p className="mt-0.5 text-xs text-zinc-400 truncate max-w-sm">{service.description}</p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                        {PRICING_TYPE_LABELS[service.pricingType]}
                      </span>

                      <span className="shrink-0 w-24 text-right text-sm font-semibold tabular-nums text-zinc-800">
                        {currencySymbol}{Number(service.price).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        {service.pricingType === "per_kilo" && <span className="text-xs font-normal text-zinc-400">/kg</span>}
                        {service.pricingType === "per_piece" && <span className="text-xs font-normal text-zinc-400">/pc</span>}
                      </span>

                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(v) => handleToggle(service, v)}
                        className="shrink-0"
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-zinc-400 hover:text-zinc-700" />
                        }>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingService(service)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(service)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ServiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        currencySymbol={currencySymbol}
      />

      {editingService && (
        <ServiceDialog
          open={!!editingService}
          onOpenChange={(o) => { if (!o) setEditingService(null); }}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          currencySymbol={currencySymbol}
          service={editingService}
        />
      )}
    </div>
  );
}
