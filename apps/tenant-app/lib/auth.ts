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

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
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
            tenant: { select: { id: true, slug: true, name: true } },
          },
        });

        if (!user || !user.passwordHash || !user.tenant) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantSlug: user.tenant.slug,
          tenantId: user.tenant.id,
          tenantName: user.tenant.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          tenantSlug: string;
          tenantId: string;
          tenantName: string;
          role: string;
        };
        token.tenantSlug = u.tenantSlug;
        token.tenantId = u.tenantId;
        token.tenantName = u.tenantName;
        token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
