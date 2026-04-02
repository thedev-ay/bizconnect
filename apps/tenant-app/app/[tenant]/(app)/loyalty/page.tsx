import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { LoyaltyShell, LoyaltySettingsDialog, NewCardButton } from "@/modules/loyalty";
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
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Loyalty Cards</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {totalCards} card{totalCards !== 1 ? "s" : ""}
            {redeemableCards > 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {redeemableCards} ready to redeem
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LoyaltySettingsDialog
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
            settings={settings}
          />
          <NewCardButton
            tenantSlug={tenantSlug}
            tenantId={tenant.id}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <LoyaltyShell
          cards={cards}
          settings={settings}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
        />
      </div>
    </div>
  );
}
