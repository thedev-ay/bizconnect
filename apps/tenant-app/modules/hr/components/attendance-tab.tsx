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
import { cn } from "@/lib/utils";
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
  const [employeeKey, setEmployeeKey] = useState(0);
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
      await logAttendance(
        tenantSlug,
        tenantId,
        employeeId,
        date,
        `${date}T${clockIn}`,
        clockOut ? `${date}T${clockOut}` : undefined,
        undefined
      );
      toast.success("Attendance logged");
      setEmployeeId("");
      setEmployeeKey((k) => k + 1);
      setClockIn("");
      setClockOut("");
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
      <div className="rounded-lg border border-zinc-200 p-4">
        <p className="mb-3 text-sm font-semibold text-zinc-900">Log Attendance</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Employee</Label>
            <Select key={employeeKey} value={employeeId} onValueChange={(v) => { if (v) setEmployeeId(v); }}>
              <SelectTrigger className="h-8 text-xs">{employeeId ? employees.find((e) => e.id === employeeId)?.name : <span className="text-muted-foreground">Select...</span>}</SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Date</Label>
            <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Clock In</Label>
            <Input type="time" className="h-8 text-xs" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">Clock Out <span className="text-zinc-400">(optional)</span></Label>
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
          <TableRow className="border-zinc-100 hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Employee</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Date</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Clock In</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Clock Out</TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-400">No attendance records yet.</TableCell>
            </TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id} className="border-zinc-100 hover:bg-zinc-50/50">
                <TableCell className="text-sm font-medium text-zinc-900">{r.employeeName}</TableCell>
                <TableCell className="text-sm text-zinc-500">{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-sm text-zinc-700">{r.clockIn ? format(new Date(r.clockIn), "h:mm a") : <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className={cn("text-sm", r.clockOut ? "text-zinc-700" : "text-amber-600")}>
                  {r.clockOut ? format(new Date(r.clockOut), "h:mm a") : "Still in"}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-zinc-900">{hoursWorked(r)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
