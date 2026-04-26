"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPermissionLabel } from "@/lib/permissions";
import { updateUser } from "../actions";
import { PermissionEditor } from "./permission-editor";
import {
  USER_GROUP_NONE_LABEL,
  USER_GROUP_NONE_VALUE,
  USER_ROLE_LABELS,
  type TenantUser,
  type UserGroup,
} from "../types";

interface EditUserDialogProps {
  user: TenantUser;
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  userGroups: UserGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({
  user,
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  userGroups,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [role, setRole] = useState(user.role);
  const [userGroupId, setUserGroupId] = useState(user.userGroupId ?? USER_GROUP_NONE_VALUE);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(user.permissions ?? {});
  const [saving, setSaving] = useState(false);
  const selectedGroup = userGroups.find((group) => group.id === userGroupId) ?? null;
  const selectedGroupPermissions = selectedGroup
    ? Object.entries(selectedGroup.permissions).filter(([, enabled]) => enabled)
    : [];
  const selectedGroupPermissionCount = selectedGroup ? selectedGroupPermissions.length : 0;

  useEffect(() => {
    if (!open) return;
    setName(user.name ?? "");
    setRole(user.role);
    setUserGroupId(user.userGroupId ?? USER_GROUP_NONE_VALUE);
    setPermissions(user.permissions ?? {});
  }, [open, user]);

  async function handleSave() {
    setSaving(true);
    try {
      const nextUserGroupId =
        role === "member" && userGroupId !== USER_GROUP_NONE_VALUE ? userGroupId : null;
      await updateUser(tenantSlug, tenantId, user.id, {
        name,
        role: role as any,
        userGroupId: nextUserGroupId,
        permissions: role === "member" && nextUserGroupId === null ? permissions : {},
      });
      toast.success("User updated");
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-border/70 bg-popover flex max-h-[94dvh] w-[min(95vw,64rem)] max-w-[64rem] flex-col gap-0 overflow-hidden border p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-border/60 border-b px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Users / Edit</p>
              <DialogTitle className="text-foreground mt-1 text-xl font-semibold tracking-tight">
                Edit user
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
          <DialogFormSection num="01" title="Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-foreground/80 text-xs font-medium">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:max-w-xs">
                <Label className="text-foreground/80 text-xs font-medium">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    if (v) setRole(v);
                    if (v && v !== "member") {
                      setUserGroupId(USER_GROUP_NONE_VALUE);
                      setPermissions({});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS] ?? role}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {role === "member" && (
                <div className="space-y-1.5 md:max-w-xs">
                  <Label className="text-foreground/80 text-xs font-medium">Group</Label>
                  <Select
                    value={userGroupId}
                    onValueChange={(v) => {
                      if (!v) return;
                      setUserGroupId(v);
                      if (v !== USER_GROUP_NONE_VALUE) {
                        setPermissions({});
                      }
                    }}
                  >
                    <SelectTrigger>
                      {userGroupId === USER_GROUP_NONE_VALUE ? (
                        <SelectValue>{USER_GROUP_NONE_LABEL}</SelectValue>
                      ) : (
                        <SelectValue>{selectedGroup?.name ?? USER_GROUP_NONE_LABEL}</SelectValue>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USER_GROUP_NONE_VALUE}>{USER_GROUP_NONE_LABEL}</SelectItem>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </DialogFormSection>

          {role === "member" && (
            <DialogFormSection num="02" title="Access">
              {userGroupId === USER_GROUP_NONE_VALUE ? (
                <>
                  {userGroups.length > 0 && (
                    <p className="text-muted-foreground mb-4 text-sm">
                      Use direct permissions only when this user should not inherit a shared group.
                    </p>
                  )}
                  <PermissionEditor
                    value={permissions}
                    onChange={setPermissions}
                    activeModuleSlugs={activeModuleSlugs}
                  />
                </>
              ) : (
                <p className="text-muted-foreground mb-4 text-sm">
                  Group-managed access keeps this user aligned with the selected team profile. Edit
                  the group itself to change what they can do.
                </p>
              )}
              {userGroupId !== USER_GROUP_NONE_VALUE && selectedGroup && (
                <div className="border-border/70 bg-muted/20 rounded-[24px] border px-4 py-4">
                  <p className="text-foreground font-medium">{selectedGroup.name}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {selectedGroupPermissionCount} shared permission
                    {selectedGroupPermissionCount === 1 ? "" : "s"} configured
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedGroupPermissions.length > 0 ? (
                      selectedGroupPermissions.map(([permission]) => (
                        <Badge key={permission} variant="outline" className="rounded-full">
                          {getPermissionLabel(permission)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="rounded-full">
                        No shared permissions
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </DialogFormSection>
          )}
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
