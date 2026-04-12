"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="flex max-h-[90vh] min-w-[min(92vw,56rem)] w-[min(95vw,64rem)] max-w-none flex-col overflow-hidden border border-slate-200/80 bg-white p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label text-primary">Users</p>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>Workspace member</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
          <section className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-4">
            <div>
              <p className="eyebrow-label text-primary">Profile</p>
              <h3 className="text-sm font-semibold text-slate-950">Member Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2 md:max-w-xs">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => { if (v) setRole(v); }}
                >
                  <SelectTrigger className="bg-white">
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
          </section>

          {role === "member" && (
            <section className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-4">
              <div>
                <p className="eyebrow-label text-primary">Access</p>
                <h3 className="text-sm font-semibold text-slate-950">Module Permissions</h3>
              </div>
              <PermissionEditor
                value={permissions}
                onChange={setPermissions}
                activeModuleSlugs={activeModuleSlugs}
              />
            </section>
          )}
        </div>
        <DialogFooter className="-mx-5 -mb-5 mt-4 shrink-0 border-t border-slate-200/80 px-5 py-4">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
