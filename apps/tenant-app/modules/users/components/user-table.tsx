"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Shield, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TenantUser } from "../types";
import { updateUser, deleteUser } from "../actions";
import { EditUserDialog } from "./edit-user-dialog";

const ROLE_PILL: Record<string, string> = {
  owner: "bg-zinc-900 text-white",
  admin: "bg-primary/10 text-primary",
  member: "bg-muted text-muted-foreground border border-border",
};

interface UserTableProps {
  users: TenantUser[];
  tenantSlug: string;
  tenantId: string;
  currentUserId: string;
  activeModuleSlugs: string[];
}

export function UserTable({ users, tenantSlug, tenantId, currentUserId, activeModuleSlugs }: UserTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);

  async function handleToggleActive(user: TenantUser) {
    setLoading(user.id);
    try {
      await updateUser(tenantSlug, tenantId, user.id, { isActive: !user.isActive });
      toast.success(`${user.name} ${user.isActive ? "deactivated" : "reactivated"}`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(user: TenantUser) {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    setLoading(user.id);
    try {
      await deleteUser(tenantSlug, tenantId, user.id);
      toast.success(`${user.name} deleted`);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="space-y-3 p-4 sm:hidden">
        {users.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No users found.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className={cn("rounded-[24px] border border-border/70 bg-white p-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.26)]", loading === user.id && "opacity-50")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {user.name ?? "—"}
                    {user.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
                </div>
                {user.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                        {user.isActive ? (
                          <><ShieldOff className="mr-2 h-4 w-4" /> Deactivate</>
                        ) : (
                          <><Shield className="mr-2 h-4 w-4" /> Reactivate</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(user)}
                      >
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", ROLE_PILL[user.role] ?? ROLE_PILL.member)}>
                  {user.role}
                </span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                )}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</p>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">Name</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Joined</TableHead>
              <TableHead className="w-16 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={cn("border-border/60 hover:bg-muted/20", loading === user.id && "opacity-50")}>
                  <TableCell className="pl-5 font-medium text-foreground">
                    {user.name ?? "—"}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", ROLE_PILL[user.role] ?? ROLE_PILL.member)}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                    )}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="pr-5">
                    {user.id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                            {user.isActive ? (
                              <><ShieldOff className="mr-2 h-4 w-4" /> Deactivate</>
                            ) : (
                              <><Shield className="mr-2 h-4 w-4" /> Reactivate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(user)}
                          >
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          activeModuleSlugs={activeModuleSlugs}
          open={!!editingUser}
          onOpenChange={(o) => { if (!o) setEditingUser(null); }}
        />
      )}
    </>
  );
}
