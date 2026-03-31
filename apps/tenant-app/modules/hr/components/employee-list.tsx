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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCheck, UserX } from "lucide-react";
import type { Employee } from "../types";
import { deactivateEmployee, reactivateEmployee } from "../actions";

interface EmployeeListProps {
  employees: Employee[];
  tenantSlug: string;
  tenantId: string;
}

export function EmployeeList({ employees, tenantSlug, tenantId }: EmployeeListProps) {
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
        <TableRow>
          <TableHead>Emp. No.</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Hire Date</TableHead>
          <TableHead className="text-right">Salary</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
              No employees yet.
            </TableCell>
          </TableRow>
        ) : (
          employees.map((emp) => (
            <TableRow key={emp.id} className={loading === emp.id ? "opacity-50" : ""}>
              <TableCell className="font-mono text-sm">{emp.employeeNo ?? "—"}</TableCell>
              <TableCell>
                <div className="font-medium">{emp.name}</div>
                {emp.email && (
                  <div className="text-xs text-muted-foreground">{emp.email}</div>
                )}
              </TableCell>
              <TableCell>{emp.position ?? "—"}</TableCell>
              <TableCell>{emp.department ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {emp.hireDate ? format(new Date(emp.hireDate), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell className="text-right">
                {emp.salary
                  ? `₱${Number(emp.salary).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={emp.isActive ? "default" : "outline"}>
                  {emp.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"/>}>
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
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
