export interface LoyaltyCard {
  id: string;
  customerName: string;
  phone: string | null;
  currentStamps: number;
  totalStamps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltySetting {
  stampsPerReward: number;
  rewardDescription: string;
  isActive: boolean;
}

export interface LoyaltyActivity {
  id: string;
  type: "stamp" | "redemption";
  note: string | null;
  stampsUsed?: number;
  createdAt: Date;
}
