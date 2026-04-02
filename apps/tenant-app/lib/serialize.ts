import { Prisma } from "@bizconnect/db";

/**
 * Recursively converts Prisma Decimal objects to strings so they can be safely
 * passed from Server Components to Client Components.
 *
 * Uses Prisma.Decimal.isDecimal() — the canonical detection method.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeValue(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "function") return undefined;
  if (Prisma.Decimal.isDecimal(obj)) return obj.toString();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeValue);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => typeof v !== "function")
        .map(([k, v]) => [k, serializeValue(v)])
    );
  }
  return obj;
}

export function serialize<T>(obj: T): T {
  return serializeValue(obj) as T;
}

export function serializeArray<T>(arr: T[]): T[] {
  return arr.map(serializeValue) as T[];
}
