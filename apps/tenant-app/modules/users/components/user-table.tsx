"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import type { TenantUser, UserGroup } from "../types";
import { updateUser, deleteUser } from "../actions";
import { EditUserDialog } from "./edit-user-dialog";

const ROLE_PILL: Record<string, string> = {
  owner: "bg-zinc-900 text-white",
  admin: "bg-primary/10 text-primary",
  member: "bg-muted text-muted-foreground border border-border",
};

function getAccessLabel(user: TenantUser) {
  if (user.role === "owner" || user.role === "admin") return "Full access";
  if (user.userGroupName) return user.userGroupName;
  return "Custom access";
}

interface UserTableProps {
  users: TenantUser[];
  tenantSlug: string;
  tenantId: string;
  currentUserId: string;
  activeModuleSlugs: string[];
  userGroups: UserGroup[];
}

export function UserTable({
  users,
  tenantSlug,
  tenantId,
  currentUserId,
  activeModuleSlugs,
  userGroups,
}: UserTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<TenantUser | null>(null);

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
    setLoading(user.id);
    try {
      await deleteUser(tenantSlug, tenantId, user.id);
      toast.success(`${user.name} deleted`);
      setDeletingUser(null);
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
          <div className="text-muted-foreground py-8 text-center">No users found.</div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={cn(
                "border-border/70 rounded-[24px] border bg-white p-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.26)]",
                loading === user.id && "opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground font-medium">
                    {user.name ?? "—"}
                    {user.id === currentUserId && (
                      <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm break-all">{user.email}</p>
                </div>
                {user.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
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
                        onClick={() => setDeletingUser(user)}
                      >
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    ROLE_PILL[user.role] ?? ROLE_PILL.member
                  )}
                >
                  {user.role}
                </span>
                {user.userGroupName && (
                  <Badge variant="outline" className="rounded-full">
                    {user.userGroupName}
                  </Badge>
                )}
                {!user.userGroupName && user.role === "member" && (
                  <Badge variant="outline" className="rounded-full">
                    Custom access
                  </Badge>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    user.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-muted-foreground pl-5 text-xs tracking-[0.22em] uppercase">
                Name
              </TableHead>
              <TableHead className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
                Email
              </TableHead>
              <TableHead className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
                Role
              </TableHead>
              <TableHead className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
                Access
              </TableHead>
              <TableHead className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
                Status
              </TableHead>
              <TableHead className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
                Joined
              </TableHead>
              <TableHead className="w-16 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground px-5 py-8 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className={cn(
                    "border-border/60 hover:bg-muted/20",
                    loading === user.id && "opacity-50"
                  )}
                >
                  <TableCell className="text-foreground pl-5 font-medium">
                    {user.name ?? "—"}
                    {user.id === currentUserId && (
                      <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        ROLE_PILL[user.role] ?? ROLE_PILL.member
                      )}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.userGroupName || user.role !== "member" ? (
                      <Badge variant="outline" className="rounded-full">
                        {getAccessLabel(user)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full">
                        Custom access
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="pr-5">
                    {user.id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
                            />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
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
                            onClick={() => setDeletingUser(user)}
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
          userGroups={userGroups}
          open={!!editingUser}
          onOpenChange={(o) => {
            if (!o) setEditingUser(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingUser?.name ?? "user"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingUser && handleDelete(deletingUser)}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
