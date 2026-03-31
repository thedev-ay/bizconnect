export type UserRole = "owner" | "admin" | "member";

export interface TenantUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}
