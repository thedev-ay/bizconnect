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

  function toggleModule(module: string, on: boolean) {
    const actions = Object.keys(PERMISSIONS[module as PermissionModule].actions);
    const updates = Object.fromEntries(actions.map((a) => [`${module}.${a}`, on]));
    onChange({ ...value, ...updates });
  }

  if (visibleModules.length === 0) {
    return <p className="text-muted-foreground text-sm">No modules available.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visibleModules.map((module) => {
        const def = PERMISSIONS[module];
        const actions = Object.entries(def.actions);

        const allOn = actions.every(([action]) => value[`${module}.${action}`] === true);
        const someOn = !allOn && actions.some(([action]) => value[`${module}.${action}`] === true);

        return (
          <div
            key={module}
            className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <span className="text-xs font-semibold tracking-[0.22em] text-slate-500 uppercase">
                {def.label}
              </span>
              <Switch
                size="sm"
                checked={allOn}
                data-state={someOn ? "indeterminate" : undefined}
                onCheckedChange={(on) => toggleModule(module, on)}
                aria-label={`Toggle all ${def.label} permissions`}
                className="data-[state=indeterminate]:bg-primary/40"
              />
            </div>
            <div className="divide-y divide-slate-200/80">
              {actions.map(([action, label]) => {
                const key = `${module}.${action}`;
                const checked = value[key] === true;
                return (
                  <div key={action} className="flex items-center justify-between px-4 py-3">
                    <Label
                      htmlFor={key}
                      className="cursor-pointer text-sm text-slate-600 select-none"
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
