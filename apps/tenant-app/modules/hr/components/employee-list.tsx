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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { StaffProfileDialog } from "@/modules/staff";
import type { StaffMember, Service } from "@/modules/staff";
import type { Employee } from "../types";
import { deactivateEmployee, reactivateEmployee } from "../actions";

interface EmployeeListProps {
  employees: Employee[];
  staffMembers: StaffMember[];
  services: Service[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function EmployeeList({ employees, staffMembers, services, tenantSlug, tenantId, currencySymbol, currencyLocale }: EmployeeListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggle(id: string, isActive: boolean) {
    setLoading(id);
    try {
      if (isActive) {
        await deactivateEmployee(tenantSlug, tenantId, id);
        toast.success("Employee deactivated");
      } else {
        await reactivateEmployee(tenantSlug, tenantId, id);
        toast.success("Employee reactivated");
      }
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
          <TableHead className="pl-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">ID</TableHead>
          <TableHead className="pl-14 text-xs uppercase tracking-[0.22em] text-muted-foreground">Name</TableHead>
          <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Position</TableHead>
          <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Department</TableHead>
          <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Hire</TableHead>
          <TableHead className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground">Salary</TableHead>
          <TableHead className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</TableHead>
          <TableHead className="w-20 pr-4" />
          </TableRow>
        </TableHeader>
      <TableBody>
        {employees.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
              No employees yet.
            </TableCell>
          </TableRow>
        ) : (
          employees.map((emp) => {
            const staffMember = staffMembers.find((s) => s.id === emp.id);
            return (
              <TableRow
                key={emp.id}
                className={cn("border-border/60 hover:bg-muted/20", loading === emp.id && "opacity-50")}
              >
                <TableCell className="pl-5 font-mono text-sm text-muted-foreground">{emp.employeeNo ?? <span className="text-muted-foreground/50">—</span>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{emp.name}</div>
                      {emp.email && (
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.position ?? <span className="text-muted-foreground/50">—</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.department ?? <span className="text-muted-foreground/50">—</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {emp.hireDate ? format(new Date(emp.hireDate), "MMM d, yyyy") : <span className="text-muted-foreground/50">—</span>}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  {emp.salary
                    ? `${currencySymbol}${Number(emp.salary).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`
                    : <span className="text-muted-foreground/50">—</span>}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    emp.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1">
                    {staffMember && (
                      <StaffProfileDialog
                        staff={staffMember}
                        services={services}
                        tenantSlug={tenantSlug}
                        tenantId={tenantId}
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {emp.isActive ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleToggle(emp.id, true)}
                          >
                            <UserX className="mr-2 h-4 w-4" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleToggle(emp.id, false)}>
                            <UserCheck className="mr-2 h-4 w-4" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
