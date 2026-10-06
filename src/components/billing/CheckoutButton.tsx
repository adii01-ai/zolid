"use client";

import { useState } from "react";
import type { CreditBundleId } from "@/lib/billing/plans";

export default function CheckoutButton({
  bundleId,
  className,
  labels,
}: {
  bundleId: CreditBundleId;
  className?: string;
  labels?: {
    buy: string;
    opening: string;
    error: string;
    connectionError: string;
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      const result = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (response.status === 401) {
        window.location.assign("/auth/login?next=%2Fbilling");
        return;
      }
      if (!response.ok || !result?.url) {
        setError(result?.error ?? labels?.error ?? "Checkout could not start. Please try again.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError(labels?.connectionError ?? "Checkout could not start. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        className={className}
        type="button"
        disabled={isLoading}
        onClick={() => void startCheckout()}
      >
        {isLoading ? labels?.opening ?? "Opening checkout..." : labels?.buy ?? "Buy credits"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p>}
    </div>
  );
}
