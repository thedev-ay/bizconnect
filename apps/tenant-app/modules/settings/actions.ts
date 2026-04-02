"use server";

import { prisma } from "@bizconnect/db";
import { revalidatePath } from "next/cache";
import type { BusinessHoursEntry } from "./types";

export async function updateBusinessProfile(
  tenantSlug: string,
  tenantId: string,
  data: { name: string; address?: string; phone?: string; email?: string }
) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
    },
  });
  revalidatePath(`/${tenantSlug}/settings`);
}

export async function updateCurrencySettings(
  tenantSlug: string,
  tenantId: string,
  data: { currencySymbol: string; currencyLocale: string; defaultTaxRate: number }
) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      currencySymbol: data.currencySymbol,
      currencyLocale: data.currencyLocale,
      defaultTaxRate: data.defaultTaxRate,
    },
  });
  revalidatePath(`/${tenantSlug}/settings`);
}

export async function updateBusinessHours(
  tenantSlug: string,
  tenantId: string,
  hours: BusinessHoursEntry[]
) {
  await prisma.$transaction(
    hours.map((h) =>
      prisma.businessHours.upsert({
        where: { tenantId_dayOfWeek: { tenantId, dayOfWeek: h.dayOfWeek } },
        update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        create: {
          tenantId,
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
        },
      })
    )
  );
  revalidatePath(`/${tenantSlug}/settings`);
}
