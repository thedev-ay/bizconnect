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
    <div className="flex items-start justify-between gap-4">
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
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isCore || loading}
        aria-label={`Toggle ${moduleName}`}
      />
    </div>
  );
}
