"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PERMISSIONS, type PermissionModule } from "@/lib/permissions";
import { deleteUserGroup, updateUserGroup } from "../actions";
import { UserGroupDialog } from "./user-groups-panel";
import type { UserGroup } from "../types";

interface UserGroupsMatrixProps {
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  userGroups: UserGroup[];
  canManage: boolean;
}

export function UserGroupsMatrix({
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  userGroups,
  canManage,
}: UserGroupsMatrixProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<UserGroup | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, Record<string, boolean>>>(
    () =>
      Object.fromEntries(userGroups.map((group) => [group.id, { ...(group.permissions ?? {}) }]))
  );
  const [changeStack, setChangeStack] = useState<
    Array<{ groupId: string; permissionKey: string; previousValue: boolean }>
  >([]);
  const [isSaving, startSaving] = useTransition();

  const visibleModules = (Object.keys(PERMISSIONS) as PermissionModule[])
    .filter((moduleSlug) => activeModuleSlugs.includes(moduleSlug))
    .map((moduleSlug) => {
      const moduleDef = PERMISSIONS[moduleSlug];
      const permissions = Object.entries(moduleDef.actions).map(([actionKey, label]) => ({
        key: `${moduleSlug}.${actionKey}`,
        label: label as string,
      }));

      return {
        moduleSlug,
        moduleLabel: moduleDef.label,
        permissions,
      };
    })
    .filter((moduleDef) => moduleDef.permissions.length > 0);

  const isSingleGroup = userGroups.length === 1;
  const hasPendingChanges = userGroups.some((group) => {
    const current = draftPermissions[group.id] ?? {};
    return visibleModules.some((moduleDef) =>
      moduleDef.permissions.some(
        (permission) =>
          (group.permissions[permission.key] === true) !== (current[permission.key] === true)
      )
    );
  });

  useEffect(() => {
    setDraftPermissions(
      Object.fromEntries(userGroups.map((group) => [group.id, { ...(group.permissions ?? {}) }]))
    );
    setChangeStack([]);
  }, [userGroups]);

  useEffect(() => {
    if (!hasPendingChanges) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasPendingChanges]);

  useEffect(() => {
    function syncScrollState() {
      const node = scrollContainerRef.current;
      if (!node) return;
      setCanScrollLeft(node.scrollLeft > 8);
      setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 8);
    }

    syncScrollState();
    const node = scrollContainerRef.current;
    if (!node) return;

    node.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      node.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [userGroups.length, visibleModules.length]);

  const changeSummary = userGroups.reduce(
    (summary, group) => {
      const current = draftPermissions[group.id] ?? {};

      visibleModules.forEach((moduleDef) => {
        moduleDef.permissions.forEach((permission) => {
          const original = group.permissions[permission.key] === true;
          const next = current[permission.key] === true;

          if (original === next) return;

          const entry = {
            groupId: group.id,
            groupName: group.name,
            permissionKey: permission.key,
            permissionLabel: permission.label,
            type: next ? ("added" as const) : ("removed" as const),
          };

          summary.items.push(entry);
          summary.affectedGroups.add(group.name);
          if (entry.type === "added") summary.added += 1;
          else summary.removed += 1;
        });
      });

      return summary;
    },
    {
      items: [] as Array<{
        groupId: string;
        groupName: string;
        permissionKey: string;
        permissionLabel: string;
        type: "added" | "removed";
      }>,
      affectedGroups: new Set<string>(),
      added: 0,
      removed: 0,
    }
  );

  function togglePermission(groupId: string, permissionKey: string) {
    if (!canManage || isSaving) return;

    const currentValue = draftPermissions[groupId]?.[permissionKey] === true;

    setDraftPermissions((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] ?? {}),
        [permissionKey]: !currentValue,
      },
    }));
    setChangeStack((current) => [
      ...current,
      { groupId, permissionKey, previousValue: currentValue },
    ]);
  }

  function undoLastChange() {
    const lastChange = changeStack[changeStack.length - 1];
    if (!lastChange || isSaving) return;

    setDraftPermissions((current) => ({
      ...current,
      [lastChange.groupId]: {
        ...(current[lastChange.groupId] ?? {}),
        [lastChange.permissionKey]: lastChange.previousValue,
      },
    }));
    setChangeStack((current) => current.slice(0, -1));
  }

  function discardChanges() {
    if (isSaving) return;
    setDraftPermissions(
      Object.fromEntries(userGroups.map((group) => [group.id, { ...(group.permissions ?? {}) }]))
    );
    setChangeStack([]);
    setReviewOpen(false);
  }

  function saveChanges() {
    if (!hasPendingChanges) return;

    startSaving(async () => {
      try {
        const changedGroups = userGroups.filter((group) => {
          const current = draftPermissions[group.id] ?? {};
          return visibleModules.some((moduleDef) =>
            moduleDef.permissions.some(
              (permission) =>
                (group.permissions[permission.key] === true) !== (current[permission.key] === true)
            )
          );
        });

        await Promise.all(
          changedGroups.map((group) =>
            updateUserGroup(tenantSlug, tenantId, group.id, {
              name: group.name,
              description: group.description,
              permissions: draftPermissions[group.id] ?? {},
            })
          )
        );

        toast.success(
          `Saved ${changeSummary.items.length} change${changeSummary.items.length === 1 ? "" : "s"}`
        );
        setReviewOpen(false);
        setChangeStack([]);
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to save changes");
      }
    });
  }

  async function handleDelete(group: UserGroup) {
    try {
      await deleteUserGroup(tenantSlug, tenantId, group.id);
      setDeletingGroup(null);
      toast.success("Group deleted");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete group");
    }
  }

  return (
    <>
      {userGroups.length === 0 ? (
        <div className="text-muted-foreground px-6 py-10 text-center text-sm">
          No groups yet. Create your first group to compare shared access here.
        </div>
      ) : (
        <div className="pb-4">
          <div className="relative">
            {canScrollLeft && (
              <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-40 hidden w-[3.25rem] bg-gradient-to-r from-white via-white/94 to-transparent sm:block" />
            )}
            {canScrollRight && (
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-40 hidden w-[6.5rem] bg-gradient-to-l from-white via-white/98 via-45% to-transparent sm:block" />
            )}
            <div ref={scrollContainerRef} className="overflow-x-auto">
              <div className="text-muted-foreground px-4 pt-4 text-xs sm:hidden sm:px-6 sm:pt-5">
                Swipe sideways to compare all groups.
              </div>
              <table
                className={cn(
                  "w-full border-separate border-spacing-0",
                  isSingleGroup ? "min-w-[680px]" : "w-full min-w-[980px]"
                )}
              >
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-30 w-[280px] min-w-[280px] border-r border-b border-slate-200/80 bg-white px-5 py-5 text-left align-bottom shadow-[0_1px_0_rgba(226,232,240,0.9)] sm:px-6">
                      <span className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
                        Permission
                      </span>
                    </th>
                    {userGroups.map((group) => (
                      <th
                        key={group.id}
                        className={cn(
                          "group/column relative sticky top-0 border-b border-slate-200/80 bg-white py-4 align-bottom shadow-[0_1px_0_rgba(226,232,240,0.9)]",
                          isSingleGroup
                            ? "w-[220px] min-w-[220px] px-5 text-left sm:px-6"
                            : "min-w-[140px] px-3 text-center"
                        )}
                        title={group.name}
                      >
                        {canManage && (
                          <div
                            className={cn(
                              "absolute top-2 right-2 transition-all sm:opacity-0 sm:group-focus-within/column:opacity-100 sm:group-hover/column:opacity-100",
                              isSingleGroup ? "sm:right-3" : "sm:right-2"
                            )}
                          >
                            <div onClick={(event) => event.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-foreground hover:bg-muted/70 h-7 w-7 rounded-full"
                                    />
                                  }
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isSingleGroup ? "start" : "center"}>
                                  <DropdownMenuItem onClick={() => setEditingGroup(group)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit group
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeletingGroup(group)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete group
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex flex-col",
                            isSingleGroup ? "items-start pr-8" : "items-center px-5 pt-2 sm:pt-1"
                          )}
                        >
                          <div className="space-y-1">
                            <p
                              className={cn(
                                "text-foreground truncate text-sm font-semibold",
                                isSingleGroup ? "max-w-[180px]" : "max-w-[112px]"
                              )}
                            >
                              {group.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {group.userCount} user{group.userCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleModules.map((moduleDef) => (
                    <Fragment key={moduleDef.moduleSlug}>
                      <tr>
                        <td className="sticky left-0 z-20 border-r border-slate-200/80 bg-slate-50/95 px-5 py-3 text-left shadow-[0_1px_0_rgba(226,232,240,0.9)] sm:px-6">
                          <span className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
                            {moduleDef.moduleLabel}
                          </span>
                        </td>
                        <td
                          colSpan={userGroups.length}
                          className="bg-slate-50/90 shadow-[0_1px_0_rgba(226,232,240,0.9)]"
                        />
                      </tr>
                      {moduleDef.permissions.map((permission) => (
                        <tr key={permission.key}>
                          <td className="sticky left-0 z-20 border-t border-r border-slate-200/80 bg-white px-5 py-4 sm:px-6">
                            <p className="text-foreground text-sm font-medium">
                              {permission.label}
                            </p>
                          </td>
                          {userGroups.map((group) => {
                            const originalEnabled = group.permissions[permission.key] === true;
                            const enabled = draftPermissions[group.id]?.[permission.key] === true;
                            const isPending = originalEnabled !== enabled;
                            const pendingType = enabled ? "added" : "removed";

                            return (
                              <td
                                key={`${group.id}-${permission.key}`}
                                className={cn(
                                  "border-t border-slate-200/80 bg-white py-3 transition-colors duration-200",
                                  isPending && pendingType === "added" && "bg-emerald-50/40",
                                  isPending && pendingType === "removed" && "bg-rose-50/50",
                                  isSingleGroup ? "px-5 text-left sm:px-6" : "px-3 text-center"
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex",
                                    isSingleGroup ? "justify-start" : "justify-center"
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={cn(
                                      "relative inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-200 ease-out will-change-transform",
                                      canManage
                                        ? "focus-visible:ring-ring/50 cursor-pointer hover:scale-[1.04] focus-visible:ring-[3px] active:scale-[0.96]"
                                        : "cursor-default",
                                      enabled
                                        ? "bg-primary border-primary text-white"
                                        : "border-slate-400 bg-slate-100 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
                                      !enabled &&
                                        canManage &&
                                        "hover:border-slate-500 hover:bg-slate-200 hover:text-slate-600",
                                      isPending &&
                                        pendingType === "added" &&
                                        "border-emerald-300 bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.12)]",
                                      isPending &&
                                        pendingType === "removed" &&
                                        "border-rose-200 bg-rose-50 text-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
                                    )}
                                    onClick={() => togglePermission(group.id, permission.key)}
                                    aria-pressed={enabled}
                                    aria-label={`${enabled ? "Disable" : "Enable"} ${permission.label} for ${group.name}`}
                                    disabled={!canManage || isSaving}
                                  >
                                    {enabled ? (
                                      <Check
                                        className={cn(
                                          "h-3.5 w-3.5 transition-all duration-200",
                                          isPending ? "scale-110" : "scale-100"
                                        )}
                                      />
                                    ) : (
                                      <span
                                        className={cn(
                                          "h-3.5 w-3.5 rounded-[4px] border border-slate-400 bg-slate-50 transition-all duration-200",
                                          isPending && "scale-90 opacity-70"
                                        )}
                                      />
                                    )}
                                    {isPending && (
                                      <span
                                        className={cn(
                                          "animate-in fade-in-0 zoom-in-95 absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white duration-200",
                                          pendingType === "added" ? "bg-emerald-500" : "bg-rose-500"
                                        )}
                                      />
                                    )}
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <UserGroupDialog
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          activeModuleSlugs={activeModuleSlugs}
          group={editingGroup}
          open={!!editingGroup}
          onOpenChange={(open) => {
            if (!open) setEditingGroup(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingGroup?.name ?? "group"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user group. You can only delete groups that have no
              assigned users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingGroup && handleDelete(deletingGroup)}
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <div>
              <p className="eyebrow-label">Users / Review</p>
              <DialogTitle className="mt-1">Review pending access changes</DialogTitle>
              <p className="text-muted-foreground mt-2 text-sm">
                Confirm these access updates before they become the live group permissions.
              </p>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
            {changeSummary.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending changes.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                    <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.18em] uppercase">
                      Pending
                    </p>
                    <p className="text-foreground mt-2 text-2xl font-semibold">
                      {changeSummary.items.length}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                    <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-emerald-700 uppercase">
                      Grants
                    </p>
                    <p className="text-foreground mt-2 text-2xl font-semibold">
                      +{changeSummary.added}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-rose-200 bg-rose-50/80 px-4 py-3">
                    <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-rose-700 uppercase">
                      Removals
                    </p>
                    <p className="text-foreground mt-2 text-2xl font-semibold">
                      -{changeSummary.removed}
                    </p>
                  </div>
                </div>

                {userGroups
                  .filter((group) => changeSummary.items.some((item) => item.groupId === group.id))
                  .map((group) => (
                    <section
                      key={group.id}
                      className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-foreground text-sm font-semibold">{group.name}</h3>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {changeSummary.items.filter((item) => item.groupId === group.id).length}{" "}
                            change
                            {changeSummary.items.filter((item) => item.groupId === group.id)
                              .length === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                        <span className="inline-flex rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                          {changeSummary.items.filter((item) => item.groupId === group.id).length}{" "}
                          pending
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {changeSummary.items
                          .filter((item) => item.groupId === group.id)
                          .map((item) => (
                            <div
                              key={`${item.groupId}-${item.permissionKey}`}
                              className={cn(
                                "animate-in fade-in-0 slide-in-from-bottom-1 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm duration-200",
                                item.type === "added"
                                  ? "border-emerald-200 bg-emerald-50/70"
                                  : "border-rose-200 bg-rose-50/80"
                              )}
                            >
                              <div>
                                <p className="text-foreground font-medium">
                                  {item.permissionLabel}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  {item.permissionKey}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  item.type === "added" ? "text-emerald-700" : "text-rose-700"
                                )}
                              >
                                {item.type === "added" ? "Will be granted" : "Will be removed"}
                              </span>
                            </div>
                          ))}
                      </div>
                    </section>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-border/60 bg-muted/30 mx-0 mt-0 mb-0 shrink-0 rounded-b-[inherit] border-t px-6 py-4">
            <Button variant="outline" className="rounded-full" onClick={() => setReviewOpen(false)}>
              Back
            </Button>
            <Button className="rounded-full" onClick={saveChanges} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {hasPendingChanges && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-4 rounded-[22px] border border-slate-200/80 bg-slate-950 px-4 py-3 text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.5)] duration-200 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {changeSummary.items.length} unsaved change
                  {changeSummary.items.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-300">
                  +{changeSummary.added} added · -{changeSummary.removed} removed ·{" "}
                  {changeSummary.affectedGroups.size} group
                  {changeSummary.affectedGroups.size === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                className="rounded-full text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={undoLastChange}
                disabled={changeStack.length === 0 || isSaving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => setReviewOpen(true)}
                disabled={isSaving}
              >
                Review
              </Button>
              <Button
                variant="ghost"
                className="rounded-full text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                onClick={discardChanges}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button
                className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={saveChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
