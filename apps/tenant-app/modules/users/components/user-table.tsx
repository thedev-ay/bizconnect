"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import { MoreHorizontal, Shield, ShieldOff } from "lucide-react";
import type { TenantUser } from "../types";
import { updateUser, deleteUser } from "../actions";

interface UserTableProps {
  users: TenantUser[];
  tenantSlug: string;
  tenantId: string;
  currentUserId: string;
}

const ROLE_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

export function UserTable({ users, tenantSlug, tenantId, currentUserId }: UserTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
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
                <Badge variant={ROLE_BADGE[user.role] ?? "outline"} className="capitalize">
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                {user.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"/>}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                        {user.isActive ? (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" /> Deactivate
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" /> Reactivate
                          </>
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
  );
}
