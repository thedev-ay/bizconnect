"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Lock } from "lucide-react";

interface ModuleToggleProps {
  tenantId: string;
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
  isCore: boolean;
  isEnabled: boolean;
  enabledAt: Date | null;
}

export function ModuleToggle({
  tenantId,
  moduleId,
  moduleName,
  moduleDescription,
  isCore,
  isEnabled: initialEnabled,
  enabledAt,
}: ModuleToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle(checked: boolean) {
    if (isCore) return;

    setLoading(true);
    const previous = isEnabled;
    setIsEnabled(checked); // optimistic update

    const res = await fetch(`/api/tenants/${tenantId}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, isEnabled: checked }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to update module");
      setIsEnabled(previous); // rollback
      return;
    }

    toast.success(`${moduleName} ${checked ? "enabled" : "disabled"} successfully`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{moduleName}</span>
          {isCore && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Lock className="h-2.5 w-2.5" />
              Core
            </Badge>
          )}
          {isEnabled && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{moduleDescription}</p>
        {isEnabled && enabledAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Enabled {format(new Date(enabledAt), "MMM d, yyyy")}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between rounded-full border border-border/70 bg-muted/45 px-3 py-2 sm:min-w-[88px] sm:justify-center sm:bg-transparent sm:p-0">
        <span className="text-xs font-medium text-muted-foreground sm:hidden">Access</span>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isCore || loading}
          aria-label={`Toggle ${moduleName}`}
        />
      </div>
    </div>
  );
}
