"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PERMISSIONS, type PermissionModule } from "@/lib/permissions";

interface PermissionEditorProps {
  value: Record<string, boolean>;
  onChange: (permissions: Record<string, boolean>) => void;
  activeModuleSlugs: string[];
}

export function PermissionEditor({ value, onChange, activeModuleSlugs }: PermissionEditorProps) {
  const visibleModules = (Object.keys(PERMISSIONS) as PermissionModule[]).filter((m) =>
    activeModuleSlugs.includes(m)
  );

  function toggleAction(module: string, action: string, on: boolean) {
    onChange({ ...value, [`${module}.${action}`]: on });
  }

  if (visibleModules.length === 0) {
    return <p className="text-sm text-zinc-400">No modules available.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {visibleModules.map((module) => {
        const def = PERMISSIONS[module];
        const actions = Object.entries(def.actions);

        return (
          <div key={module} className="rounded-lg border border-zinc-200 overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {def.label}
              </span>
            </div>
            <div className="divide-y divide-zinc-100">
              {actions.map(([action, label]) => {
                const key = `${module}.${action}`;
                const checked = value[key] === true;
                return (
                  <div key={action} className="flex items-center justify-between px-3 py-2">
                    <Label
                      htmlFor={key}
                      className="text-xs text-zinc-600 cursor-pointer select-none"
                    >
                      {label as string}
                    </Label>
                    <Switch
                      id={key}
                      size="sm"
                      checked={checked}
                      onCheckedChange={(on) => toggleAction(module, action, on)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
