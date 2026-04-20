import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@bizconnect/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string(),
});

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  cookies: {
    sessionToken: { name: "tenant.session-token" },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, tenantSlug } = parsed.data;

        const user = await prisma.user.findFirst({
          where: {
            email,
            isActive: true,
            tenant: { slug: tenantSlug, isActive: true },
          },
          include: {
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                tenantModules: {
                  where: { isEnabled: true },
                  select: {
                    module: {
                      select: {
                        slug: true,
                        name: true,
                        icon: true,
                        sortOrder: true,
                        isCore: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.passwordHash || !user.tenant) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId: user.tenant.id, isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantSlug: user.tenant.slug,
          tenantId: user.tenant.id,
          tenantName: user.tenant.name,
          role: user.role,
          permissions: (user.permissions as Record<string, boolean>) ?? {},
          modules: user.tenant.tenantModules.map((tm) => tm.module.slug),
          moduleObjects: user.tenant.tenantModules.map((tm) => tm.module),
          currentBranchId: firstBranch?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.currentBranchId !== undefined) {
        token.currentBranchId = session.currentBranchId;
      }
      if (user) {
        const u = user as {
          tenantSlug: string;
          tenantId: string;
          tenantName: string;
          role: string;
          permissions: Record<string, boolean>;
          modules: string[];
          moduleObjects: {
            slug: string;
            name: string;
            icon: string | null;
            sortOrder: number;
            isCore: boolean;
          }[];
          currentBranchId: string | null;
        };
        token.tenantSlug = u.tenantSlug;
        token.tenantId = u.tenantId;
        token.tenantName = u.tenantName;
        token.role = u.role;
        token.permissions = u.permissions;
        token.modules = u.modules;
        token.moduleObjects = u.moduleObjects;
        token.currentBranchId = u.currentBranchId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.user.role = token.role as string;
        session.user.permissions = (token.permissions as Record<string, boolean>) ?? {};
        session.user.modules = (token.modules as string[]) ?? [];
        session.user.moduleObjects =
          (token.moduleObjects as {
            slug: string;
            name: string;
            icon: string | null;
            sortOrder: number;
            isCore: boolean;
          }[]) ?? [];
        session.user.currentBranchId = (token.currentBranchId as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
