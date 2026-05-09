import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { TopbarPageBridge } from "@/components/layout/topbar-page-bridge";
import { ContentPanel, PageShell } from "@/components/layout/page-shell";
import { LoyaltyShell, LoyaltySettingsDialog } from "@/modules/loyalty";
import type { LoyaltyCard, LoyaltyActivity } from "@/modules/loyalty";

interface LoyaltyPageProps {
  params: Promise<{ tenant: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export default async function LoyaltyPage({ params }: LoyaltyPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const [rawCards, rawSetting] = await Promise.all([
    db.loyaltyCard.findMany({
      where: { tenantId: tenant.id },
      include: {
        stamps: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        redemptions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.loyaltySetting.findUnique({
      where: { tenantId: tenant.id },
    }),
  ]);

  const settings = {
    stampsPerReward: rawSetting?.stampsPerReward ?? 10,
    rewardDescription: rawSetting?.rewardDescription ?? "1 Free Wash",
    isActive: rawSetting?.isActive ?? true,
  };

  const cards: (LoyaltyCard & { recentActivity: LoyaltyActivity[] })[] = rawCards.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => {
      const stampActivity: LoyaltyActivity[] = c.stamps.map((s: any) => ({
        id: s.id,
        type: "stamp" as const,
        note: s.note,
        createdAt: s.createdAt,
      }));
      const redemptionActivity: LoyaltyActivity[] = c.redemptions.map((r: any) => ({
        id: r.id,
        type: "redemption" as const,
        note: r.note,
        stampsUsed: r.stampsUsed,
        createdAt: r.createdAt,
      }));
      const recentActivity = [...stampActivity, ...redemptionActivity]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        id: c.id,
        customerName: c.customerName,
        phone: c.phone,
        currentStamps: c.currentStamps,
        totalStamps: c.totalStamps,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        recentActivity,
      };
    }
  );

  const totalCards = cards.length;
  const redeemableCards = cards.filter((c) => c.currentStamps >= settings.stampsPerReward).length;

  return (
    <PageShell className="h-auto min-h-full">
      <TopbarPageBridge title="Cards" description={`${totalCards} total${redeemableCards > 0 ? ` · ${redeemableCards} ready` : ""}`} />
      <LoyaltySettingsDialog
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        settings={settings}
        showTrigger={false}
      />

      <ContentPanel className="min-h-0 flex-1 overflow-hidden border-slate-200/70 bg-white/82 p-4 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.18)]">
        <LoyaltyShell
          cards={cards}
          settings={settings}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
        />
      </ContentPanel>
    </PageShell>
  );
}
