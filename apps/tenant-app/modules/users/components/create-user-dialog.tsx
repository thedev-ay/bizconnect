"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPermissionLabel } from "@/lib/permissions";
import { createUserSchema, type CreateUserInput } from "../schema";
import { createUser } from "../actions";
import { PermissionEditor } from "./permission-editor";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";
import {
  USER_GROUP_NONE_LABEL,
  USER_GROUP_NONE_VALUE,
  USER_ROLE_LABELS,
  type UserGroup,
} from "../types";

interface CreateUserDialogProps {
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
  userGroups: UserGroup[];
  showTrigger?: boolean;
}

export function CreateUserDialog({
  tenantSlug,
  tenantId,
  activeModuleSlugs,
  userGroups,
  showTrigger = true,
}: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  useTopbarCta("New User", () => setOpen(true));
  const [role, setRole] = useState<string>("member");
  const [userGroupId, setUserGroupId] = useState<string>(USER_GROUP_NONE_VALUE);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const selectedGroup = userGroups.find((group) => group.id === userGroupId) ?? null;
  const selectedGroupPermissions = selectedGroup
    ? Object.entries(selectedGroup.permissions).filter(([, enabled]) => enabled)
    : [];
  const selectedGroupPermissionCount = selectedGroup ? selectedGroupPermissions.length : 0;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema as any),
    defaultValues: { role: "member", permissions: {} },
  });

  async function onSubmit(data: CreateUserInput) {
    try {
      await createUser(tenantSlug, tenantId, {
        ...data,
        userGroupId:
          role === "member" && userGroupId !== USER_GROUP_NONE_VALUE ? userGroupId : null,
        permissions: role === "member" && userGroupId === USER_GROUP_NONE_VALUE ? permissions : {},
      });
      toast.success(`${data.name} added successfully`);
      setOpen(false);
      reset();
      setRole("member");
      setUserGroupId(USER_GROUP_NONE_VALUE);
      setPermissions({});
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setRole("member");
      setUserGroupId(USER_GROUP_NONE_VALUE);
      setPermissions({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <DialogTrigger render={<Button className="rounded-full px-4" />}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </DialogTrigger>
      ) : null}
      <DialogContent
        showCloseButton={false}
        className="border-border/70 bg-popover flex max-h-[94dvh] w-[min(95vw,64rem)] max-w-[64rem] flex-col gap-0 overflow-hidden border p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-border/60 border-b px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Users / New</p>
              <DialogTitle className="text-foreground mt-1 text-xl font-semibold tracking-tight">
                Add user
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground mt-1 h-8 w-8 shrink-0 rounded-full"
              onClick={() => handleOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Profile">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="name" className="text-foreground/80 text-xs font-medium">
                    Name
                  </Label>
                  <Input id="name" placeholder="John Doe" {...register("name")} />
                  {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground/80 text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-foreground/80 text-xs font-medium">
                    Initial Password
                  </Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-destructive text-xs">{errors.password.message}</p>
                  )}
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
                      setValue("role", v as any);
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
                        <SelectItem value={USER_GROUP_NONE_VALUE}>
                          {USER_GROUP_NONE_LABEL}
                        </SelectItem>
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
                        Use direct permissions only when this user should not inherit a shared
                        group.
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
                    This user will inherit access from the selected group. Manage permissions at the
                    group level to keep access rules consistent.
                  </p>
                )}
                {userGroupId !== USER_GROUP_NONE_VALUE && selectedGroup && (
                  <div className="border-border/70 bg-muted/20 rounded-[24px] border px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-foreground font-medium">{selectedGroup.name}</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {selectedGroupPermissionCount} shared permission
                          {selectedGroupPermissionCount === 1 ? "" : "s"} configured
                        </p>
                      </div>
                    </div>
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
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
