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
        <TableRow className="border-zinc-100 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Emp. No.</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Name</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Position</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Department</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Hire Date</TableHead>
          <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Salary</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-12 text-center text-sm text-zinc-400">
              No employees yet.
            </TableCell>
          </TableRow>
        ) : (
          employees.map((emp) => {
            const staffMember = staffMembers.find((s) => s.id === emp.id);
            return (
              <TableRow
                key={emp.id}
                className={cn("border-zinc-100 hover:bg-zinc-50/50", loading === emp.id && "opacity-50")}
              >
                <TableCell className="font-mono text-sm text-zinc-500">{emp.employeeNo ?? <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{emp.name}</div>
                      {emp.email && (
                        <div className="text-xs text-zinc-400">{emp.email}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">{emp.position ?? <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className="text-sm text-zinc-500">{emp.department ?? <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {emp.hireDate ? format(new Date(emp.hireDate), "MMM d, yyyy") : <span className="text-zinc-300">—</span>}
                </TableCell>
                <TableCell className="text-right text-sm text-zinc-700">
                  {emp.salary
                    ? `${currencySymbol}${Number(emp.salary).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`
                    : <span className="text-zinc-300">—</span>}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    emp.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
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
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" />}>
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
