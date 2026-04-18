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
  showDuration: boolean;
  showAppointmentsAvailability: boolean;
  showJobOrdersAvailability: boolean;
}

export function ServicesList({
  services,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  showDuration,
  showAppointmentsAvailability,
  showJobOrdersAvailability,
}: ServicesListProps) {
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
    <div className="space-y-4">
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-foreground">No services yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first catalog item to start using services across enabled modules.</p>
        </div>
      ) : (
        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          {categories.map((cat) => {
            const group = services.filter((s) => (s.category ?? "Uncategorized") === cat);
            return (
              <section key={cat} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{cat}</p>
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                    {group.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-background/85 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.2)]">
                  {group.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/20 md:grid-cols-[minmax(0,1.2fr)_auto_auto]",
                        !service.isActive && "opacity-50"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-semibold text-foreground">{service.name}</p>
                          {!service.isActive && (
                            <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        {service.description ? (
                          <p className="mt-1 max-w-xl truncate text-xs text-muted-foreground">{service.description}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground/60">No description</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/75">
                          {PRICING_TYPE_LABELS[service.pricingType]}
                        </span>

                        {showAppointmentsAvailability && service.availableForAppointments && (
                          <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 ring-1 ring-teal-100">
                            Appointments
                          </span>
                        )}

                        {showJobOrdersAvailability && service.availableForJobOrders && (
                          <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 ring-1 ring-sky-100">
                            Job Orders
                          </span>
                        )}

                        {showDuration && (
                          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/75">
                            {service.duration ? `${service.duration} min` : "No duration"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <div className="min-w-[96px] text-left md:text-right">
                          <p className="text-base font-semibold tabular-nums text-foreground">
                            {currencySymbol}{Number(service.price).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {service.pricingType === "per_kilo" ? "per kg" : service.pricingType === "per_piece" ? "per piece" : "flat rate"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1">
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
                      </div>
                    </div>
                  ))}
                </div>
              </section>
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
          showDuration={showDuration}
          showAppointmentsAvailability={showAppointmentsAvailability}
          showJobOrdersAvailability={showJobOrdersAvailability}
        />
      )}
    </div>
  );
}
