export const CREDIT_COSTS = {
  depthRelief: 5,
  backgroundPng: 5,
} as const;

export const CREDIT_BUNDLES = {
  weekly: {
    id: "weekly",
    name: "1 week",
    credits: 300,
    amountInPaise: 100_000,
    displayPrice: "₹1,000",
    description: "300 credits, purchased once. Credits do not expire.",
  },
  monthly: {
    id: "monthly",
    name: "Monthly",
    credits: 500,
    amountInPaise: 50_000,
    displayPrice: "₹500",
    description: "500 credits, purchased once. Credits do not expire.",
  },
  sixMonths: {
    id: "sixMonths",
    name: "6 months",
    credits: 699,
    amountInPaise: 200_000,
    displayPrice: "₹2,000",
    description: "699 credits, purchased once. Credits do not expire.",
  },
} as const;

export type CreditBundleId = keyof typeof CREDIT_BUNDLES;

export function getCreditBundle(id: string) {
  return CREDIT_BUNDLES[id as CreditBundleId] ?? null;
}
