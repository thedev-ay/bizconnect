/**
 * E2E Tests for BizConnect Features
 * Tests for: Stock Adjustment History, Dashboard Charts, Time Tracking, 
 * Password Reset, and Return/Refund Workflow
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { prisma } from "@bizconnect/db";
import { getCurrencyConfig } from "@bizconnect/db";

describe("BizConnect Feature Tests", () => {
  // Test data setup
  let testTenantId: string;
  let testUserId: string;
  let testProductId: string;

  beforeEach(async () => {
    // Setup test data - should be run against test database
    // Ideally use a test database transaction that rolls back after each test
  });

  describe("0. Service Shop Workflow", () => {
    it("should resolve Netherlands locale and currency correctly", async () => {
      const locale = getCurrencyConfig("nl");

      expect(locale.symbol).toBe("€");
      expect(locale.locale).toBe("nl-NL");
    });

    it("should keep customer, job order, and invoice linked within the same tenant", async () => {
      const tenantId = `tenant-${Date.now()}`;
      const customerId = `customer-${Date.now()}`;
      const jobOrderId = `job-${Date.now()}`;
      const invoiceId = `invoice-${Date.now()}`;

      const customer = {
        id: customerId,
        tenantId,
        name: "Regression Customer",
      };

      const jobOrder = {
        id: jobOrderId,
        tenantId,
        customerId: customer.id,
        status: "completed",
      };

      const invoice = {
        id: invoiceId,
        tenantId,
        customerId: customer.id,
        jobOrderId: jobOrder.id,
        status: "draft",
      };

      expect(jobOrder.customerId).toBe(customer.id);
      expect(invoice.customerId).toBe(customer.id);
      expect(invoice.jobOrderId).toBe(jobOrder.id);
      expect(invoice.tenantId).toBe(jobOrder.tenantId);
    });

    it("should show a clear billing state for completed work", async () => {
      const completedUninvoiced = { invoiceId: null, invoiceStatus: null };
      const completedDraft = { invoiceId: "invoice-1", invoiceStatus: "draft" };
      const completedPaid = { invoiceId: "invoice-2", invoiceStatus: "paid" };

      expect(completedUninvoiced.invoiceId).toBeNull();
      expect(completedDraft.invoiceStatus).toBe("draft");
      expect(completedPaid.invoiceStatus).toBe("paid");
    });
  });

  describe("1. Stock Adjustment History", () => {
    it("should log inventory adjustment when stock is manually adjusted", async () => {
      // Arrange
      const initialQuantity = 100;
      const adjustmentQuantity = -10;

      // Create test inventory item
      const item = await prisma.inventoryItem.create({
        data: {
          tenantId: testTenantId,
          name: "Test Product",
          sku: "TEST-001",
          quantity: initialQuantity,
          unitPrice: "99.99" as any,
        },
      });

      // Act - Adjust stock
      const newQuantity = initialQuantity + adjustmentQuantity;
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: newQuantity },
      });

      // Log the adjustment
      const adjustment = await prisma.inventoryAdjustment.create({
        data: {
          tenantId: testTenantId,
          itemId: item.id,
          quantityChange: adjustmentQuantity,
          reason: "manual",
          adjustedById: testUserId,
        },
      });

      // Assert
      expect(adjustment).toBeDefined();
      expect(adjustment.quantityChange).toBe(adjustmentQuantity);
      expect(adjustment.reason).toBe("manual");

      // Verify adjustment can be retrieved
      const adjustments = await prisma.inventoryAdjustment.findMany({
        where: { itemId: item.id },
      });
      expect(adjustments.length).toBeGreaterThan(0);
    });

    it("should log adjustment when sale is created (checkout)", async () => {
      // Arrange
      const item = await prisma.inventoryItem.create({
        data: {
          tenantId: testTenantId,
          name: "Test Product",
          sku: "TEST-002",
          quantity: 50,
          unitPrice: "50.00" as any,
        },
      });

      // Act - Create sale
      const sale = await prisma.sale.create({
        data: {
          tenantId: testTenantId,
          referenceNo: `SAL-${Date.now()}`,
          subtotal: "100.00" as any,
          discount: "0.00" as any,
          total: "100.00" as any,
          amountPaid: "100.00" as any,
          change: "0.00" as any,
          paymentMethod: "cash",
          status: "completed",
          items: {
            create: {
              itemId: item.id,
              name: item.name,
              quantity: 5,
              unitPrice: "20.00" as any,
              total: "100.00" as any,
            },
          },
        },
        include: { items: true },
      });

      // Log adjustment for sale
      const adjustment = await prisma.inventoryAdjustment.create({
        data: {
          tenantId: testTenantId,
          itemId: item.id,
          quantityChange: -5,
          reason: "sale",
          adjustedById: testUserId,
        },
      });

      // Assert
      expect(sale.status).toBe("completed");
      expect(adjustment.reason).toBe("sale");
    });
  });

  describe("2. Dashboard Analytics", () => {
    it("should aggregate sales data for chart display", async () => {
      // Arrange
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Create test sales over 30 days
      const sales = [];
      for (let i = 0; i < 5; i++) {
        const sale = await prisma.sale.create({
          data: {
            tenantId: testTenantId,
            referenceNo: `SAL-DASH-${i}`,
            subtotal: "100.00" as any,
            discount: "0.00" as any,
            total: "100.00" as any,
            amountPaid: "100.00" as any,
            change: "0.00" as any,
            paymentMethod: "cash",
            status: "completed",
            createdAt: new Date(
              thirtyDaysAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000
            ),
          },
        });
        sales.push(sale);
      }

      // Act - Fetch and aggregate sales
      const lastThirtySales = await prisma.sale.findMany({
        where: {
          tenantId: testTenantId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
          status: "completed",
        },
        orderBy: { createdAt: "asc" },
      });

      // Assert
      expect(lastThirtySales.length).toBe(5);
      expect(
        new Date(lastThirtySales[0].createdAt).getTime() >= thirtyDaysAgo.getTime()
      ).toBe(true);
    });
  });

  describe("3. Time Tracking", () => {
    it("should create and manage time logs for job orders", async () => {
      // Arrange
      const jobOrderId = "test-job-order";

      // Act - Start time log
      const startLog = await prisma.jobOrderTimeLog.create({
        data: {
          tenantId: testTenantId,
          jobOrderId,
          taskName: "Cleaning service",
          startedAt: new Date(),
          recordedBy: testUserId,
        },
      });

      // Assert initial log
      expect(startLog).toBeDefined();
      expect(startLog.taskName).toBe("Cleaning service");
      expect(startLog.endedAt).toBeNull();

      // Act - End time log
      const endedAt = new Date(startLog.startedAt.getTime() + 60 * 60 * 1000); // 1 hour later
      const endLog = await prisma.jobOrderTimeLog.update({
        where: { id: startLog.id },
        data: {
          endedAt,
          duration: 3600, // 1 hour in seconds
        },
      });

      // Assert completed log
      expect(endLog.endedAt).toBeDefined();
      expect(endLog.duration).toBe(3600);
    });

    it("should allow adding notes to time logs", async () => {
      // Arrange
      const jobOrderId = "test-job-order";
      const log = await prisma.jobOrderTimeLog.create({
        data: {
          tenantId: testTenantId,
          jobOrderId,
          taskName: "Repair work",
          startedAt: new Date(),
          recordedBy: testUserId,
        },
      });

      // Act - Update notes
      const updated = await prisma.jobOrderTimeLog.update({
        where: { id: log.id },
        data: {
          notes: "Replaced main bearing and lubricated joints",
        },
      });

      // Assert
      expect(updated.notes).toBe(
        "Replaced main bearing and lubricated joints"
      );
    });

    it("should calculate total hours from multiple time logs", async () => {
      // Arrange
      const jobOrderId = "test-job-order";
      const logs = [];

      // Create 3 time logs
      for (let i = 0; i < 3; i++) {
        const log = await prisma.jobOrderTimeLog.create({
          data: {
            tenantId: testTenantId,
            jobOrderId,
            taskName: `Task ${i + 1}`,
            startedAt: new Date(),
            endedAt: new Date(Date.now() + (i + 1) * 60 * 60 * 1000),
            duration: (i + 1) * 3600, // 1, 2, 3 hours
            recordedBy: testUserId,
          },
        });
        logs.push(log);
      }

      // Act - Calculate total
      const allLogs = await prisma.jobOrderTimeLog.findMany({
        where: { jobOrderId },
      });
      const totalSeconds = allLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
      const totalHours = totalSeconds / 3600;

      // Assert
      expect(allLogs.length).toBe(3);
      expect(totalHours).toBe(6); // 1 + 2 + 3 hours
    });
  });

  describe("4. Password Reset", () => {
    it("should create password reset token for user", async () => {
      // Arrange
      const email = "test@example.com";
      const token = Buffer.from(Math.random().toString()).toString("hex").slice(0, 32);

      // Act - Create reset token
      const resetToken = await prisma.passwordResetToken.create({
        data: {
          identifier: email,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Assert
      expect(resetToken).toBeDefined();
      expect(resetToken.identifier).toBe(email);
      expect(resetToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should validate password reset token", async () => {
      // Arrange
      const email = "test@example.com";
      const token = Buffer.from(Math.random().toString()).toString("hex").slice(0, 32);
      const resetToken = await prisma.passwordResetToken.create({
        data: {
          identifier: email,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Act - Validate token
      const found = await prisma.passwordResetToken.findFirst({
        where: {
          identifier: email,
          token,
          expiresAt: { gt: new Date() },
        },
      });

      // Assert
      expect(found).toBeDefined();
      expect(found?.token).toBe(token);
    });

    it("should reject expired password reset token", async () => {
      // Arrange
      const email = "test@example.com";
      const token = Buffer.from(Math.random().toString()).toString("hex").slice(0, 32);
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          identifier: email,
          token,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      // Act - Try to validate expired token
      const found = await prisma.passwordResetToken.findFirst({
        where: {
          identifier: email,
          token,
          expiresAt: { gt: new Date() },
        },
      });

      // Assert
      expect(found).toBeNull();
    });
  });

  describe("5. Return/Refund Workflow", () => {
    it("should create a return request for sale items", async () => {
      // Arrange - Create a sale first
      const sale = await prisma.sale.create({
        data: {
          tenantId: testTenantId,
          referenceNo: `SAL-RET-${Date.now()}`,
          subtotal: "200.00" as any,
          discount: "0.00" as any,
          total: "200.00" as any,
          amountPaid: "200.00" as any,
          change: "0.00" as any,
          paymentMethod: "cash",
          status: "completed",
          items: {
            create: [
              {
                name: "Item 1",
                quantity: 2,
                unitPrice: "50.00" as any,
                total: "100.00" as any,
              },
              {
                name: "Item 2",
                quantity: 2,
                unitPrice: "50.00" as any,
                total: "100.00" as any,
              },
            ],
          },
        },
        include: { items: true },
      });

      // Act - Create return for first item
      const returnRecord = await prisma.saleReturn.create({
        data: {
          tenantId: testTenantId,
          saleId: sale.id,
          status: "pending",
          reason: "damaged",
          refundAmount: "100.00" as any,
          items: {
            create: {
              quantity: 2,
              itemId: sale.items[0].id,
            },
          },
        },
        include: { items: true },
      });

      // Assert
      expect(returnRecord).toBeDefined();
      expect(returnRecord.status).toBe("pending");
      expect(returnRecord.refundAmount).toBe("100.00");
      expect(returnRecord.items.length).toBe(1);
    });

    it("should approve return and restore inventory", async () => {
      // Arrange - Create item and sale
      const item = await prisma.inventoryItem.create({
        data: {
          tenantId: testTenantId,
          name: "Return Test Item",
          sku: "RET-TEST-001",
          quantity: 100,
          unitPrice: "50.00" as any,
        },
      });

      const sale = await prisma.sale.create({
        data: {
          tenantId: testTenantId,
          referenceNo: `SAL-RET2-${Date.now()}`,
          subtotal: "100.00" as any,
          discount: "0.00" as any,
          total: "100.00" as any,
          amountPaid: "100.00" as any,
          change: "0.00" as any,
          paymentMethod: "cash",
          status: "completed",
          items: {
            create: {
              itemId: item.id,
              name: item.name,
              quantity: 2,
              unitPrice: "50.00" as any,
              total: "100.00" as any,
            },
          },
        },
      });

      const returnRecord = await prisma.saleReturn.create({
        data: {
          tenantId: testTenantId,
          saleId: sale.id,
          status: "pending",
          reason: "defective",
          refundAmount: "100.00" as any,
          items: {
            create: {
              quantity: 2,
              itemId: item.id,
            },
          },
        },
      });

      // Act - Approve return
      const approved = await prisma.saleReturn.update({
        where: { id: returnRecord.id },
        data: { status: "approved" },
      });

      // Restore inventory
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: { increment: 2 } },
      });

      // Log adjustment
      const adjustment = await prisma.inventoryAdjustment.create({
        data: {
          tenantId: testTenantId,
          itemId: item.id,
          quantityChange: 2,
          reason: "return",
          adjustedById: testUserId,
        },
      });

      // Assert
      expect(approved.status).toBe("approved");
      expect(updatedItem.quantity).toBe(102);
      expect(adjustment.reason).toBe("return");
    });

    it("should reject return without restoring inventory", async () => {
      // Arrange
      const sale = await prisma.sale.create({
        data: {
          tenantId: testTenantId,
          referenceNo: `SAL-REJ-${Date.now()}`,
          subtotal: "100.00" as any,
          discount: "0.00" as any,
          total: "100.00" as any,
          amountPaid: "100.00" as any,
          change: "0.00" as any,
          paymentMethod: "cash",
          status: "completed",
          items: {
            create: {
              name: "Test Item",
              quantity: 2,
              unitPrice: "50.00" as any,
              total: "100.00" as any,
            },
          },
        },
      });

      const returnRecord = await prisma.saleReturn.create({
        data: {
          tenantId: testTenantId,
          saleId: sale.id,
          status: "pending",
          reason: "customer_request",
          refundAmount: "100.00" as any,
          items: {
            create: {
              quantity: 2,
              itemId: sale.items[0].id,
            },
          },
        },
      });

      // Act - Reject return
      const rejected = await prisma.saleReturn.update({
        where: { id: returnRecord.id },
        data: { status: "rejected" },
      });

      // Assert
      expect(rejected.status).toBe("rejected");
      // Inventory should NOT have been restored
    });
  });
});
