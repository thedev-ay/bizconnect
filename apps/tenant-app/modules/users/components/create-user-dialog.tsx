"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" />
        New
      </DialogTrigger>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100%-1rem)] max-w-[64rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)] sm:w-[min(95vw,64rem)] sm:p-5">
        <DialogHeader>
          <p className="eyebrow-label text-primary">New User</p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
            <section className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-4">
              <div>
                <p className="eyebrow-label text-primary">Profile</p>
                <h3 className="text-sm font-semibold text-slate-950">Member Details</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="John Doe" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2 md:max-w-xs">
                  <Label>Role</Label>
                  <Select
                    defaultValue="member"
                    onValueChange={(v) => {
                      if (v) setRole(v);
                      setValue("role", v as any);
                    }}
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
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
