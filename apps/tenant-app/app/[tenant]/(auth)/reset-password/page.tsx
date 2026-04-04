"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { resetPassword, validateResetToken } from "@/lib/password-reset";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenant;

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!token || !email) {
        setValidating(false);
        setIsValid(false);
        return;
      }

      try {
        const result = await validateResetToken(token, email);
        setIsValid(result.valid);
        if (!result.valid) {
          toast.error(result.message);
        }
      } catch (error) {
        setIsValid(false);
        toast.error("Failed to validate reset token");
      } finally {
        setValidating(false);
      }
    }

    validate();
  }, [token, email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password || !passwordConfirm) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!token || !email) {
      toast.error("Invalid reset request");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, email, password);
      toast.success(result.message);
      setSubmitted(true);
      setTimeout(() => {
        router.push(`/${tenantSlug}/(auth)/login`);
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            Validating reset link...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Invalid Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href={`/${tenantSlug}/(auth)/forgot-password`}>
              <Button type="button" className="w-full gap-2">
                Request New Link
              </Button>
            </Link>
            <Link href={`/${tenantSlug}/(auth)/login`}>
              <Button type="button" variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4 py-8">
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900">
                ✓ Your password has been successfully reset. Redirecting to login...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <p className="text-xs text-zinc-400">
                Must be at least 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-confirm">Confirm Password</Label>
              <Input
                id="password-confirm"
                type="password"
                placeholder="Confirm new password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <Link href={`/${tenantSlug}/(auth)/login`}>
              <Button type="button" variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
