"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, Sparkles, Building2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Invalid credentials. Super admin access only.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.12),_transparent_34%),linear-gradient(180deg,#f6fafc_0%,#eef5f8_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="hidden rounded-[36px] border border-white/10 bg-[linear-gradient(160deg,#13232a_0%,#182c34_50%,#122129_100%)] p-8 text-white shadow-[0_40px_120px_-56px_rgba(15,23,42,0.75)] lg:flex lg:min-h-[720px] lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/88">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cyan-200/80">BizConnect</p>
                <p className="font-semibold tracking-[-0.02em]">Platform Control</p>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <p className="text-[0.78rem] uppercase tracking-[0.3em] text-cyan-200/70">Super Admin</p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white">Manage tenants, modules, and platform operations.</h1>
              <p className="max-w-lg text-sm leading-6 text-white/68">
                One workspace for provisioning, access control, and platform oversight.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
              <Building2 className="h-4 w-4 text-cyan-200" />
              <p className="mt-4 text-sm font-medium text-white">Tenants</p>
              <p className="mt-1 text-xs text-white/60">Provision business workspaces.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
              <Gauge className="h-4 w-4 text-cyan-200" />
              <p className="mt-4 text-sm font-medium text-white">Modules</p>
              <p className="mt-1 text-xs text-white/60">Control product access cleanly.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              <p className="mt-4 text-sm font-medium text-white">Ops</p>
              <p className="mt-1 text-xs text-white/60">Oversee the full platform suite.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Card className="w-full max-w-xl">
            <CardHeader className="space-y-3 border-b border-border/60">
              <div>
                <p className="admin-eyebrow">Platform</p>
                <CardTitle className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Sign In</CardTitle>
                <CardDescription className="mt-2">Super admin access only.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@bizconnect.app"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="h-11 w-full rounded-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
