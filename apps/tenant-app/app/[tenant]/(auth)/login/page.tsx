"use client";

import { signIn } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function TenantLoginPage() {
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenant;
  const [loginError, setLoginError] = useState<string | null>(null);
  const hasAttemptedQueryLogin = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoginError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        tenantSlug,
        redirect: false,
      });

      if (!result) {
        const message = "Sign-in did not complete. Check your connection and try again.";
        setLoginError(message);
        toast.error(message);
        return;
      }

      if (result.error) {
        const message =
          result.error === "CredentialsSignin"
            ? "Invalid email or password."
            : "We couldn't sign you in from this device. Check the server URL and try again.";
        setLoginError(message);
        toast.error(message);
        return;
      }

      if (!result.ok) {
        const message = "Sign-in failed. Please try again.";
        setLoginError(message);
        toast.error(message);
        return;
      }

      router.push(`/${tenantSlug}/dashboard`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The sign-in request failed. Check your network connection and try again.";
      setLoginError(message);
      toast.error(message);
    }
  }

  useEffect(() => {
    const email = searchParams.get("email");
    const password = searchParams.get("password");

    if (!email || !password || hasAttemptedQueryLogin.current) return;

    hasAttemptedQueryLogin.current = true;
    router.replace(`/${tenantSlug}/login`);
    void onSubmit({ email, password });
  }, [router, searchParams, tenantSlug]);

  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to <strong className="capitalize">{tenantSlug.replace(/-/g, " ")}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href={`/${tenantSlug}/(auth)/forgot-password`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
            {loginError && (
              <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
                {loginError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
