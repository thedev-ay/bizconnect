"use server";

import { prisma } from "@bizconnect/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function requestPasswordReset(email: string, tenantSlug: string) {
  // Clean up expired tokens first
  await prisma.passwordResetToken.deleteMany({
    where: { expires: { lt: new Date() } },
  });

  // Check if user exists
  const user = await prisma.user.findFirst({
    where: {
      email,
      tenant: { slug: tenantSlug, isActive: true },
      isActive: true,
    },
  });

  if (!user) {
    // Don't reveal if email exists for security reasons
    return { success: true, message: "If an account exists, a reset link will be sent." };
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store token
  await prisma.passwordResetToken.create({
    data: {
      identifier: email,
      token,
      expires: expiresAt,
    },
  });

  // Return reset link (in real app, this would be sent via email)
  const resetLink = `/login/reset-password?token=${token}&email=${encodeURIComponent(email)}&tenant=${tenantSlug}`;

  return {
    success: true,
    resetLink, // In production, this should only be sent via email
  };
}

export async function resetPassword(token: string, email: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Find and validate token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }

  if (resetToken.identifier !== email) {
    throw new Error("Email does not match token");
  }

  if (new Date() > resetToken.expires) {
    // Delete expired token
    await prisma.passwordResetToken.delete({ where: { token } });
    throw new Error("Reset token has expired");
  }

  // Update user password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  // Delete used token
  await prisma.passwordResetToken.delete({ where: { token } });

  return { success: true, message: "Password reset successfully" };
}

export async function validateResetToken(token: string, email: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return { valid: false, message: "Invalid or expired reset token" };
  }

  if (resetToken.identifier !== email) {
    return { valid: false, message: "Email does not match token" };
  }

  if (new Date() > resetToken.expires) {
    await prisma.passwordResetToken.delete({ where: { token } });
    return { valid: false, message: "Reset token has expired" };
  }

  return { valid: true };
}
