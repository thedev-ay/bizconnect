"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil } from "lucide-react";
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
    <div className="space-y-6">
      <div className="border-b border-border/50 px-5 py-4">
        <div>
          <p className="eyebrow-label">Services</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Catalog</h2>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">No services</p>
        </div>
      ) : (
        <div className="space-y-6 px-5 pb-5">
          {categories.map((cat) => {
            const group = services.filter((s) => (s.category ?? "Uncategorized") === cat);
            return (
              <div key={cat}>
                <p className="mb-2 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{cat}</p>
                <div className="overflow-hidden rounded-[26px] border border-border/60 bg-background/72">
                  {group.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-center gap-4 border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/20",
                        !service.isActive && "opacity-50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{service.name}</p>
                        {service.description && (
                          <p className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">{service.description}</p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/75">
                        {PRICING_TYPE_LABELS[service.pricingType]}
                      </span>

                      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                        {currencySymbol}{Number(service.price).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        {service.pricingType === "per_kilo" && <span className="text-xs font-normal text-muted-foreground">/kg</span>}
                        {service.pricingType === "per_piece" && <span className="text-xs font-normal text-muted-foreground">/pc</span>}
                      </span>

                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(v) => handleToggle(service, v)}
                        className="shrink-0"
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground" />
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
