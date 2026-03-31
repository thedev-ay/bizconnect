export interface JobOrder {
  id: string;
  jobNo: string;
  customerName: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}
