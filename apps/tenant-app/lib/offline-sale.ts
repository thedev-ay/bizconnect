import { db, type PendingSale } from "./local-db";
import { nanoid } from "./utils";
import { createSale } from "@/modules/pos/actions";

function generateOfflineReferenceNo() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `TXN-${date}-OFFLN`;
}

/** Queue a sale for later sync and optimistically decrement local stock. */
export async function queueOfflineSale(
  tenantSlug: string,
  tenantId: string,
  input: PendingSale["input"]
): Promise<string> {
  const localId = nanoid(12);
  const referenceNo = generateOfflineReferenceNo();

  await db.transaction("rw", db.pendingSales, db.posProducts, async () => {
    window.dispatchEvent(new Event("offline-sale-queued"));
    await db.pendingSales.add({
      id: localId,
      tenantSlug,
      tenantId,
      referenceNo,
      input,
      createdAt: Date.now(),
      attempts: 0,
    });

    // Optimistically decrement local product quantities
    for (const item of input.items) {
      if (item.itemType === "product" && item.itemId) {
        const product = await db.posProducts.get(item.itemId);
        if (product) {
          await db.posProducts.update(item.itemId, {
            quantity: Math.max(0, product.quantity - item.quantity),
          });
        }
      }
    }
  });

  return referenceNo;
}

/** Flush all pending sales for a tenant. Returns counts of successes and failures. */
export async function flushPendingSales(
  tenantSlug: string,
  tenantId: string
): Promise<{ succeeded: number; failed: number }> {
  const pending = await db.pendingSales
    .where("tenantId")
    .equals(tenantId)
    .toArray();

  if (pending.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      await createSale(tenantSlug, tenantId, sale.input);
      await db.pendingSales.delete(sale.id);
      succeeded++;
    } catch {
      await db.pendingSales.update(sale.id, { attempts: sale.attempts + 1 });
      failed++;
    }
  }

  window.dispatchEvent(new Event("offline-sale-flushed"));
  return { succeeded, failed };
}

/** Returns the number of pending (unsynced) sales for a tenant. */
export async function getPendingSaleCount(tenantId: string): Promise<number> {
  return db.pendingSales.where("tenantId").equals(tenantId).count();
}
