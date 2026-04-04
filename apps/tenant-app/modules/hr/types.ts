export interface Employee {
  id: string;
  employeeNo: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  hireDate: Date | null;
  salary: string | null;
  commissionRate: string | null;
  accessLevel: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  notes: string | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: Date;
  endDate: Date | null;
  reason: string | null;
  status: string;
  createdAt: Date;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: Date;
  periodEnd: Date;
  baseSalary: string;
  commission: string;
  deductions: string;
  netPay: string;
  status: string;
  notes: string | null;
  createdAt: Date;
}
