"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import { createLeaveRequest, updateLeaveStatus } from "../actions";
import type { Employee, LeaveRequest } from "../types";

interface LeaveTabProps {
  employees: Employee[];
  requests: LeaveRequest[];
  tenantSlug: string;
  tenantId: string;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

export function LeaveTab({ employees, requests, tenantSlug, tenantId }: LeaveTabProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubmit() {
    if (!employeeId || !type || !startDate || !endDate) {
      toast.error("All fields except reason are required");
      return;
    }
    setSaving(true);
    try {
      await createLeaveRequest(tenantSlug, tenantId, { employeeId, type, startDate, endDate, reason });
      toast.success("Leave request created");
      setEmployeeId(""); setType(""); setStartDate(""); setEndDate(""); setReason("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create request");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: string, status: "approved" | "rejected") {
    setLoading(id);
    try {
      await updateLeaveStatus(tenantSlug, tenantId, id, status);
      toast.success(`Leave ${status}`);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">New Leave Request</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select onValueChange={(v) => { if (v) setEmployeeId(v as string); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Leave Type</Label>
            <Select onValueChange={(v) => { if (v) setType(v as string); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start Date</Label>
            <Input type="date" className="h-8 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Date</Label>
            <Input type="date" className="h-8 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea className="text-xs" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Submit Request"}</Button>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No leave requests.</TableCell></TableRow>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id} className={loading === r.id ? "opacity-50" : ""}>
                <TableCell className="font-medium">{r.employeeName}</TableCell>
                <TableCell className="capitalize">{r.type}</TableCell>
                <TableCell>{format(new Date(r.startDate), "MMM d, yyyy")}</TableCell>
                <TableCell>{format(new Date(r.endDate), "MMM d, yyyy")}</TableCell>
                <TableCell className="max-w-[150px] truncate text-muted-foreground">{r.reason ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[r.status] ?? "outline"} className="capitalize">{r.status}</Badge>
                </TableCell>
                <TableCell>
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleStatus(r.id, "approved")}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleStatus(r.id, "rejected")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
