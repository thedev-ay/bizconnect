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
  admin: "bg-zinc-100 text-zinc-700",
  member: "bg-zinc-50 text-zinc-500 border border-zinc-200",
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-zinc-500">Name</TableHead>
            <TableHead className="text-zinc-500">Email</TableHead>
            <TableHead className="text-zinc-500">Role</TableHead>
            <TableHead className="text-zinc-500">Status</TableHead>
            <TableHead className="text-zinc-500">Joined</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className={loading === user.id ? "opacity-50" : ""}>
                <TableCell className="font-medium">
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
                    user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {user.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
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
