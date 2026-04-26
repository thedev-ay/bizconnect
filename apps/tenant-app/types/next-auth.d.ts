import { DefaultSession, DefaultJWT } from "next-auth";

interface SessionModule {
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isCore: boolean;
}

interface SessionUserGroup {
  id: string;
  name: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      tenantSlug: string;
      tenantId: string;
      tenantName: string;
      role: string;
      permissions: Record<string, boolean>;
      directPermissions: Record<string, boolean>;
      userGroup: SessionUserGroup | null;
      modules: string[];
      moduleObjects: SessionModule[];
      currentBranchId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    tenantSlug: string;
    tenantId: string;
    tenantName: string;
    role: string;
    permissions: Record<string, boolean>;
    directPermissions: Record<string, boolean>;
    userGroup: SessionUserGroup | null;
    modules: string[];
    moduleObjects: SessionModule[];
    currentBranchId: string | null;
  }
}
