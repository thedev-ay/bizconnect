"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logAttendance } from "../actions";
import type { Employee, AttendanceRecord } from "../types";

interface AttendanceTabProps {
  employees: Employee[];
  records: AttendanceRecord[];
  tenantSlug: string;
  tenantId: string;
}

export function AttendanceTab({ employees, records, tenantSlug, tenantId }: AttendanceTabProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleLog() {
    if (!employeeId || !date || !clockIn) {
      toast.error("Employee, date, and clock-in time are required");
      return;
    }
    setSaving(true);
    try {
      await logAttendance(tenantSlug, tenantId, employeeId, date, `${date}T${clockIn}`, clockOut ? `${date}T${clockOut}` : `${date}T${clockIn}`, undefined);
      toast.success("Attendance logged");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to log attendance");
    } finally {
      setSaving(false);
    }
  }

  function hoursWorked(record: AttendanceRecord) {
    if (!record.clockIn || !record.clockOut) return "—";
    const diff = (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 3600000;
    return `${diff.toFixed(1)}h`;
  }

  return (
    <div className="space-y-6">
      {/* Log form */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Log Attendance</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select onValueChange={(v) => { if (v) setEmployeeId(v as string); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Clock In</Label>
            <Input type="time" className="h-8 text-xs" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Clock Out</Label>
            <Input type="time" className="h-8 text-xs" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button size="sm" className="h-8 w-full" onClick={handleLog} disabled={saving}>
              {saving ? "Saving..." : "Log"}
            </Button>
          </div>
        </div>
      </div>

      {/* Records table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No attendance records yet.</TableCell>
            </TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell>{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                <TableCell>{r.clockIn ? format(new Date(r.clockIn), "h:mm a") : "—"}</TableCell>
                <TableCell>{r.clockOut ? format(new Date(r.clockOut), "h:mm a") : "—"}</TableCell>
                <TableCell className="font-medium">{hoursWorked(r)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
