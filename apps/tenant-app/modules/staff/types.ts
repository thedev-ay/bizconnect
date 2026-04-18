export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number | null; // minutes
  price: string;
  isActive: boolean;
  availableForAppointments: boolean;
  availableForJobOrders: boolean;
  createdAt: Date;
}

export interface WorkingHours {
  id: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
}

export interface StaffMember {
  id: string;
  employeeNo: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  commissionRate: string | null;
  accessLevel: string;
  photoUrl: string | null;
  isActive: boolean;
  services: { serviceId: string; serviceName: string }[];
  workingHours: WorkingHours[];
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string | null;
  startAt: Date;
  endAt: Date;
  notes: string | null;
}

export interface StaffEmployee {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  isActive: boolean;
}
