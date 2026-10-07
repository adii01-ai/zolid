export const CREDIT_COSTS = {
  depthRelief: 5,
  backgroundPng: 5,
} as const;

export const CREDIT_BUNDLES = {
  weekly: {
    id: "weekly",
    name: "1 Week",
    credits: 200,
    amountInPaise: 50_000,
    displayPrice: "₹500",
    description: "200 credits, purchased once. Credits do not expire.",
  },
  monthly: {
    id: "monthly",
    name: "1 Month",
    credits: 500,
    amountInPaise: 100_000,
    displayPrice: "₹1,000",
    description: "500 credits, purchased once. Credits do not expire.",
  },
  sixMonths: {
    id: "sixMonths",
    name: "6 Months",
    credits: 1_000,
    amountInPaise: 200_000,
    displayPrice: "₹2,000",
    description: "1,000 credits, purchased once. Credits do not expire.",
  },
} as const;

export type CreditBundleId = keyof typeof CREDIT_BUNDLES;

export function getCreditBundle(id: string) {
  return CREDIT_BUNDLES[id as CreditBundleId] ?? null;
}
