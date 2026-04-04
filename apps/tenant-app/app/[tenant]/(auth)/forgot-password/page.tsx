"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/password-reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email, tenantSlug);
      if (result.success) {
        setSubmitted(true);
        // In production, the reset link would be sent via email
        // For demo purposes, we'll show it to the user
        if (result.resetLink) {
          toast.success("Reset link generated. Check your email or use the link below.");
        }
      }
    } catch (error) {
      toast.error("Failed to process password reset request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Link href={`/${tenantSlug}/(auth)/login`}>
                <Button type="button" variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </form>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-sm text-emerald-900">
                  ✓ Password reset link has been sent to your email. Check your inbox and follow the link to reset your password.
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                The link will expire in 24 hours.
              </p>
              <Link href={`/${tenantSlug}/(auth)/login`}>
                <Button type="button" variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
