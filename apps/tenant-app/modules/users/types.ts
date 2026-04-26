export type UserRole = "owner" | "admin" | "member";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const USER_GROUP_NONE_VALUE = "none";
export const USER_GROUP_NONE_LABEL = "No group";

export interface TenantUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  permissions: Record<string, boolean>;
  userGroupId: string | null;
  userGroupName: string | null;
  createdAt: Date;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  userCount: number;
  createdAt: Date;
}
