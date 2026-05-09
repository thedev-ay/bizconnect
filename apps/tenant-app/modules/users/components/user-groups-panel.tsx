"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactElement } from "react";
import { Pencil, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPermissionLabel } from "@/lib/permissions";
import { createUserGroup, deleteUserGroup, updateUserGroup } from "../actions";
import { PermissionEditor } from "./permission-editor";
import type { UserGroup } from "../types";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";

interface UserGroupsPanelProps {
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  userGroups: UserGroup[];
  canManage: boolean;
}

interface UserGroupDialogProps {
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  group?: UserGroup;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UserGroupDialog({
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  group,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UserGroupDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(group?.permissions ?? {});
  const [saving, setSaving] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setPermissions(group?.permissions ?? {});
  }, [group, open]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name,
        description: description.trim() || null,
        permissions,
      };

      if (group) {
        await updateUserGroup(tenantSlug, tenantId, group.id, payload);
        toast.success("Group updated");
      } else {
        await createUserGroup(tenantSlug, tenantId, payload);
        toast.success("Group created");
      }

      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent
        showCloseButton={false}
        className="border-border/70 bg-popover flex max-h-[94dvh] w-[min(95vw,64rem)] max-w-[64rem] flex-col gap-0 overflow-hidden border p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-border/60 border-b px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Users / Groups</p>
              <DialogTitle className="text-foreground mt-1 text-xl font-semibold tracking-tight">
                {group ? "Edit group" : "Create group"}
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground mt-1 h-8 w-8 shrink-0 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <DialogFormSection num="01" title="Details">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-medium">Group name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Front Desk"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-foreground/80 text-xs font-medium">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Who belongs in this group and what they should be able to do."
                  className="min-h-24"
                />
              </div>
            </div>
          </DialogFormSection>

          <DialogFormSection num="02" title="Permissions">
            <p className="text-muted-foreground mb-4 text-sm">
              Group permissions become the default access set for assigned members.
            </p>
            <PermissionEditor
              value={permissions}
              onChange={setPermissions}
              activeModuleSlugs={activeModuleSlugs}
            />
          </DialogFormSection>
        </div>

        <DialogFooter className="border-border/60 bg-muted/30 mx-0 mt-0 mb-0 shrink-0 rounded-b-[inherit] border-t px-6 py-4">
          <Button
            variant="outline"
            className="rounded-full px-4"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="rounded-full px-4" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateUserGroupDialogTrigger({
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  showTrigger = true,
}: {
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  showTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useTopbarCta("Create Group", () => setOpen(true));

  return (
    <UserGroupDialog
      tenantSlug={tenantSlug}
      tenantId={tenantId}
      activeModuleSlugs={activeModuleSlugs}
      open={open}
      onOpenChange={setOpen}
      trigger={showTrigger ? <Button className="rounded-full px-4">Create Group</Button> : undefined}
    />
  );
}

export function UserGroupsPanel({
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  userGroups,
  canManage,
}: UserGroupsPanelProps) {
  const router = useRouter();
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);

  async function handleDelete(group: UserGroup) {
    try {
      await deleteUserGroup(tenantSlug, tenantId, group.id);
      toast.success("Group deleted");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete group");
    }
  }

  return (
    <>
      <div className="border-border/60 flex flex-col gap-4 border-b px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow-label">Users / Groups</p>
          <h2 className="text-foreground mt-1 text-xl font-semibold tracking-tight">User groups</h2>
        </div>
      </div>

      <div className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3">
        {userGroups.length === 0 ? (
          <div className="border-border/80 bg-muted/20 text-muted-foreground rounded-[28px] border border-dashed px-6 py-10 text-center text-sm md:col-span-2 xl:col-span-3">
            No groups yet. Create your first group to standardize access for shared roles.
          </div>
        ) : (
          userGroups.map((group) => (
            <Card key={group.id} className="bg-white/95">
              <CardHeader>
                <CardDescription>Shared access profile</CardDescription>
                <CardTitle>{group.name}</CardTitle>
                <CardAction className="flex items-center gap-2">
                  {canManage ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setEditingGroup(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive h-8 w-8 rounded-full"
                            />
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the user group. You can only delete
                              groups that have no assigned users.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(group)}
                            >
                              Delete Group
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : null}
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground min-h-10 text-sm">
                  {group.description || "No description added yet."}
                </p>
                <div className="text-foreground flex items-center gap-2 text-sm">
                  <Users className="text-muted-foreground h-4 w-4" />
                  <span>{group.userCount} assigned</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(group.permissions)
                    .filter(([, enabled]) => enabled)
                    .slice(0, 6)
                    .map(([permission]) => (
                      <Badge key={permission} variant="outline" className="rounded-full">
                        {getPermissionLabel(permission)}
                      </Badge>
                    ))}
                  {Object.values(group.permissions).filter(Boolean).length === 0 && (
                    <Badge variant="outline" className="rounded-full">
                      No shared permissions
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
    </>
  );
}
