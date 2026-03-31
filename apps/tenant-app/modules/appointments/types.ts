export interface Appointment {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  startAt: Date;
  endAt: Date;
  status: string; // pending, confirmed, in-progress, done, cancelled, no-show
  employeeId: string | null;
  employeeName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  createdAt: Date;
}
