import { describe, expect, it } from "vitest";
import { CREDIT_BUNDLES, CREDIT_COSTS, getCreditBundle } from "@/lib/billing/plans";

describe("credit bundles", () => {
  it("defines the agreed INR one-time bundle prices and credits", () => {
    expect(CREDIT_BUNDLES.weekly).toMatchObject({
      amountInPaise: 100_000,
      credits: 300,
      id: "weekly",
    });
    expect(CREDIT_BUNDLES.monthly).toMatchObject({
      amountInPaise: 50_000,
      credits: 500,
      id: "monthly",
    });
    expect(CREDIT_BUNDLES.sixMonths).toMatchObject({
      amountInPaise: 200_000,
      credits: 699,
      id: "sixMonths",
    });
  });

  it("charges five credits per depth relief and PNG export", () => {
    expect(CREDIT_COSTS).toEqual({ depthRelief: 5, backgroundPng: 5 });
  });

  it("resolves only configured checkout bundle identifiers", () => {
    expect(getCreditBundle("sixMonths")).toBe(CREDIT_BUNDLES.sixMonths);
    expect(getCreditBundle("custom")).toBeNull();
  });
});
