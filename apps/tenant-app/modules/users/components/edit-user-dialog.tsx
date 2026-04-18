"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { updateUser } from "../actions";
import { PermissionEditor } from "./permission-editor";
import type { TenantUser } from "../types";

interface EditUserDialogProps {
  user: TenantUser;
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({
  user,
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(user.permissions ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user.name ?? "");
    setRole(user.role);
    setPermissions(user.permissions ?? {});
  }, [open, user]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateUser(tenantSlug, tenantId, user.id, { name, role: role as any, permissions });
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
        className="flex max-h-[94dvh] w-[min(95vw,64rem)] max-w-[64rem] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Users / Edit</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Edit user
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
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
                <Label className="text-xs font-medium text-foreground/80">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:max-w-xs">
                <Label className="text-xs font-medium text-foreground/80">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => { if (v) setRole(v); }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {{ owner: "Owner", admin: "Admin", member: "Member" }[role] ?? role}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                  </Select>
              </div>
            </div>
          </DialogFormSection>

          {role === "member" && (
            <DialogFormSection num="02" title="Access">
              <PermissionEditor
                value={permissions}
                onChange={setPermissions}
                activeModuleSlugs={activeModuleSlugs}
              />
            </DialogFormSection>
          )}
        </div>
        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
          <Button variant="outline" className="rounded-full px-4" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full px-4" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
