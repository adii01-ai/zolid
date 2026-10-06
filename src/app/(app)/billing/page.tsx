import Link from "next/link";
import CheckoutButton from "@/components/billing/CheckoutButton";
import { CREDIT_BUNDLES } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
};

const ledgerLabels: Record<string, string> = {
  signup_bonus: "Welcome credits",
  job: "3D generation",
  job_refund: "Generation refund",
  background_export: "Background PNG export",
  purchase: "Credit purchase",
  subscription_grant: "Plan credit grant",
  admin: "Account adjustment",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    plan: string;
    credits: number;
    free_generations_used: number;
    free_generations_limit: number;
  } | null = null;
  let profileUnavailable = false;
  let activity: { delta: number; reason: string; created_at: string }[] | null =
    [];

  if (!user) {
    profileUnavailable = true;
    activity = null;
  } else {
    const [profileResult, ledgerResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan,credits,free_generations_used,free_generations_limit")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("credit_ledger")
        .select("delta,reason,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (profileResult.error || !profileResult.data) {
      profileUnavailable = true;
    } else {
      profile = profileResult.data;
    }
    activity = ledgerResult.error ? null : (ledgerResult.data ?? []);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 text-[#F3EDE2] sm:px-6 sm:py-10">
      <header className="mb-7">
        <p className="text-xs font-medium text-[#FFB547]">Account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F3EDE2]">
          Billing and credits
        </h1>
        <p className="mt-1 text-xs text-[#9D9484]">
          Credits pay for depth reliefs and background PNG exports.
        </p>
      </header>

      {params.checkout === "success" && (
        <p role="status" className="mb-4 rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3 text-xs text-emerald-200">
          Payment completed. Credits are added after Stripe confirms the payment; refresh this page if your balance has not updated yet.
        </p>
      )}
      {params.checkout === "cancelled" && (
        <p role="status" className="mb-4 rounded-md border border-[#37321F] px-4 py-3 text-xs text-[#9D9484]">
          Checkout was cancelled. No payment was taken.
        </p>
      )}

      <section
        aria-label="Current plan and credit balance"
        className="grid overflow-hidden rounded-lg border border-[#37321F] bg-[#1D1A15] sm:grid-cols-[0.78fr_1.12fr]"
      >
        <article className="border-b border-[#37321F] p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-[11px] text-[#9D9484]">Current plan</p>
          {profileUnavailable ? (
            <p role="status" className="mt-2 text-xl font-semibold text-[#F3EDE2]">
              Plan unavailable
            </p>
          ) : (
            <p className="mt-2 text-2xl font-semibold text-[#F3EDE2]">
              {profile ? (planLabels[profile.plan] ?? "Plan unavailable") : "Plan unavailable"}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-5 text-[#9D9484]">
            Credit packs are one-time purchases. There are no subscriptions.
          </p>
        </article>

        <article className="p-4 sm:p-5">
          <p className="text-[11px] text-[#9D9484]">Available credits</p>
          {profileUnavailable ? (
            <p role="status" className="mt-1 text-4xl font-semibold tabular-nums text-[#F3EDE2]">
              Unavailable
            </p>
          ) : (
            <p className="mt-1 text-5xl font-semibold leading-none tabular-nums text-[#F3EDE2]">
              {profile ? profile.credits : "Unavailable"}
            </p>
          )}
          <p className="mt-2 text-[11px] text-[#9D9484]">
            A depth relief and each background PNG export use 5 credits.
          </p>
          {profile && profile.credits < 5 && (
            <p className="mt-2 rounded bg-[#25211A] px-2.5 py-2 text-[11px] text-[#F3EDE2]">
              You need 5 credits to run a depth relief or export. Buy a pack to continue.
            </p>
          )}
          <Link
            href="/studio"
            className="mt-2 inline-flex min-h-8 items-center rounded-md bg-[#FFB547] px-3 py-1.5 text-[11px] font-semibold text-[#15130F] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
          >
            Back to studio
          </Link>
        </article>
      </section>

      <section aria-labelledby="plans-heading" className="mt-6">
        <div className="flex items-baseline justify-between gap-3 border-b border-[#37321F] pb-2">
          <h2 id="plans-heading" className="text-lg font-semibold text-[#F3EDE2]">
            Credit packs
          </h2>
          <p className="text-right text-[10px] text-[#9D9484]">
            One-time payments in INR. Purchased credits do not expire.
          </p>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {Object.values(CREDIT_BUNDLES).map((bundle) => (
            <article
              key={bundle.id}
              className="flex min-w-0 flex-col rounded-lg border border-[#37321F] bg-[#1D1A15] p-3"
            >
              <h3 className="text-sm font-semibold text-[#F3EDE2]">{bundle.name}</h3>
              <p className="mt-0.5 text-[10px] text-[#9D9484]">{bundle.credits} credits</p>
              <p className="mt-3 text-2xl font-semibold leading-none text-[#F3EDE2]">
                {bundle.displayPrice}
              </p>
              <p className="mt-1 text-[10px] text-[#9D9484]">
                ₹{((bundle.amountInPaise / 100) / bundle.credits).toFixed(2)} per credit
              </p>
              <CheckoutButton
                bundleId={bundle.id}
                className="mt-3 min-h-8 w-full rounded-md bg-[#FFB547] px-3 py-2 text-[11px] font-semibold text-[#15130F] hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
              />
            </article>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-[#9D9484]">
          Credits are added once payment is confirmed, so your balance can take a few seconds to update.
        </p>
      </section>

      <section aria-labelledby="credit-activity-heading" className="mt-6">
        <div className="flex items-baseline justify-between border-b border-[#37321F] pb-2">
          <h2 id="credit-activity-heading" className="text-lg font-semibold text-[#F3EDE2]">
            Credit activity
          </h2>
          <p className="text-[10px] text-[#9D9484]">Most recent first</p>
        </div>
        {activity === null ? (
          <p role="status" className="py-4 text-xs text-[#9D9484]">
            Credit activity is unavailable right now.
          </p>
        ) : activity.length === 0 ? (
          <p className="py-4 text-xs text-[#9D9484]">No credit activity yet.</p>
        ) : (
          <ul className="divide-y divide-[#37321F]">
            {activity.map((entry, index) => (
              <li
                key={`${entry.created_at}-${index}`}
                className="flex min-h-10 items-center justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-[11px] font-semibold text-[#F3EDE2]">
                    {ledgerLabels[entry.reason] ?? "Credit activity"}
                  </p>
                  <time dateTime={entry.created_at} className="mt-0.5 block text-[10px] text-[#9D9484]">
                    {new Date(entry.created_at).toLocaleString("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${entry.delta > 0 ? "text-emerald-300" : "text-[#F3EDE2]"}`}
                >
                  {entry.delta > 0 ? "+" : ""}{entry.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
