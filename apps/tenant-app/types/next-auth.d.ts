import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      tenantSlug: string;
      tenantId: string;
      tenantName: string;
      role: string;
      permissions: Record<string, boolean>;
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
  }
}
