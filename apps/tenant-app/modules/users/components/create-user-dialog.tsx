"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import { createUserSchema, type CreateUserInput } from "../schema";
import { createUser } from "../actions";
import { PermissionEditor } from "./permission-editor";

interface CreateUserDialogProps {
  tenantSlug: string;
  tenantId: string;
  activeModuleSlugs: string[];
}

export function CreateUserDialog({ tenantSlug, tenantId, activeModuleSlugs }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("member");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const router = useRouter();

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
      await createUser(tenantSlug, tenantId, { ...data, permissions });
      toast.success(`${data.name} added successfully`);
      setOpen(false);
      reset();
      setRole("member");
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
      setPermissions({});
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" />
        New
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[94dvh] w-[min(95vw,64rem)] max-w-[64rem] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Users / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Add user
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
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
                  <Label htmlFor="name" className="text-xs font-medium text-foreground/80">Name</Label>
                  <Input id="name" placeholder="John Doe" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-foreground/80">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground/80">Initial Password</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5 md:max-w-xs">
                  <Label className="text-xs font-medium text-foreground/80">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => {
                      if (v) setRole(v);
                      setValue("role", v as any);
                    }}
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
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => handleOpenChange(false)}>
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
