import CheckoutButton from "@/components/billing/CheckoutButton";
import { CREDIT_BUNDLES, CREDIT_COSTS } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    credits: number;
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
        .select("credits")
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
    <main className="mx-auto w-full max-w-[602px] px-4 pb-9 pt-6 text-[#F0EEE9] sm:px-0 sm:pt-7">
      <header className="mb-4">
        <p className="text-[8px] font-semibold uppercase tracking-[0.09em] text-[#FFB547]">
          Account
        </p>
        <h1 className="mt-1 text-[23px] font-bold leading-tight text-[#F0EEE9]">
          Billing and credits
        </h1>
        <p className="mt-1.5 text-[9px] leading-[1.5] text-[#97938A]">
          Credits pay for depth reliefs and background PNG exports. Buy a pack once; there are no subscriptions.
        </p>
      </header>

      {params.checkout === "success" && (
        <p role="status" className="mb-3 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2.5 text-[10px] leading-4 text-emerald-200">
          Payment completed. Credits are added after Stripe confirms the payment; refresh this page if your balance has not updated yet.
        </p>
      )}
      {params.checkout === "cancelled" && (
        <p role="status" className="mb-3 rounded-lg border border-[#2A2823] px-3 py-2.5 text-[10px] leading-4 text-[#97938A]">
          Checkout was cancelled. No payment was taken.
        </p>
      )}

      <section aria-label="Credit balance and usage" className="grid gap-2.5 sm:grid-cols-2">
        <article className="min-h-[139px] rounded-[11px] border border-[#2A2823] bg-[#181714] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] text-[#AAA59B]">Available credits</p>
            <span className="rounded-full bg-[#2A2113] px-2 py-1 text-[7px] text-[#FFB547]">
              {profileUnavailable
                ? "Balance unavailable"
                : profile && profile.credits > 0
                  ? "Credits available"
                  : "No active pack"}
            </span>
          </div>
          {profileUnavailable ? (
            <p role="status" className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-[#F0EEE9]">
              Unavailable
            </p>
          ) : (
            <p className="mt-2 flex items-baseline gap-1.5">
              <strong className="text-[37px] font-semibold leading-none tabular-nums text-[#F5F3EE]">
                {profile?.credits ?? "Unavailable"}
              </strong>
              <span className="text-[9px] text-[#97938A]">credits</span>
            </p>
          )}
          <div aria-hidden="true" className="mt-3 h-1 rounded-full bg-[#302D27]" />
          <p className="mt-2.5 text-[8px] leading-[1.45] text-[#A7A298]">
            {profileUnavailable
              ? "Your balance could not be loaded. Refresh the page or try again later."
              : profile && profile.credits < CREDIT_COSTS.depthRelief
                ? `Choose a pack below to start creating. Each relief or PNG export uses ${CREDIT_COSTS.depthRelief} credits.`
                : "Credits are shared between depth reliefs and background PNG exports."}
          </p>
        </article>

        <article className="min-h-[139px] rounded-[11px] border border-[#2A2823] bg-[#181714] p-4">
          <p className="text-[8px] text-[#AAA59B]">What credits cost</p>
          <div className="mt-2.5">
            <div className="flex items-center justify-between border-b border-[#24221E] py-[7px] text-[8px]">
              <span className="text-[#D8D5CE]">Depth relief</span>
              <strong className="text-[9px] text-[#F0EEE9]">{CREDIT_COSTS.depthRelief} credits</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[#24221E] py-[7px] text-[8px]">
              <span className="text-[#D8D5CE]">Background PNG export</span>
              <strong className="text-[9px] text-[#F0EEE9]">{CREDIT_COSTS.backgroundPng} credits</strong>
            </div>
            <p className="mt-2.5 text-[8px] text-[#A7A298]">
              Pay as you go. Packs are one-time purchases.
            </p>
          </div>
        </article>
      </section>

      <section aria-labelledby="plans-heading" className="mt-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="plans-heading" className="text-[14px] font-semibold text-[#F0EEE9]">
            Credit packs
          </h2>
          <p className="text-right text-[7px] text-[#97938A]">
            One-time purchases. Credits do not expire.
          </p>
        </div>
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
          {Object.values(CREDIT_BUNDLES).map((bundle) => {
            const useCount = Math.floor(
              bundle.credits / CREDIT_COSTS.depthRelief,
            );
            const isFeatured = bundle.id === "monthly";
            return (
              <article
                key={bundle.id}
                className={`flex min-w-0 flex-col rounded-[11px] border p-3.5 ${isFeatured ? "border-[#FFB547] bg-[#211C13]" : "border-[#2A2823] bg-[#181714]"}`}
              >
                <h3 className="text-[9px] font-semibold capitalize text-[#F1EFE9]">
                  {bundle.name}
                </h3>
                <p className="mt-1 text-[8px] text-[#97938A]">
                  {bundle.credits} credits
                </p>
                <p className="mt-3.5 flex items-baseline gap-1.5">
                  <strong className="text-[25px] font-bold leading-none text-[#F4F1EB]">
                    {bundle.displayPrice}
                  </strong>
                  <span className="text-[8px] text-[#AAA59B]">one-time</span>
                </p>
                <div className="my-2.5 h-px bg-[#24221E]" />
                <ul className="mb-3.5 grid gap-1.5 text-[7.5px] leading-[1.35] text-[#D5D1C9]">
                  <li className="flex gap-1.5"><span className="text-[#FFB547]">✓</span><span>{bundle.credits} credits</span></li>
                  <li className="flex gap-1.5"><span className="text-[#FFB547]">✓</span><span>Up to {useCount} depth reliefs or PNG exports</span></li>
                  <li className="flex gap-1.5"><span className="text-[#FFB547]">✓</span><span>Credits do not expire</span></li>
                </ul>
                <CheckoutButton
                  bundleId={bundle.id}
                  className="mt-auto min-h-[27px] w-full rounded-md border border-[#FFB547] bg-[#FFB547] px-3 py-1.5 text-[8px] font-semibold text-[#17130E] transition-colors hover:bg-[#FFC55B] disabled:cursor-wait disabled:opacity-60"
                />
              </article>
            );
          })}
        </div>
        <p className="mt-2 text-[7.5px] leading-[1.45] text-[#97938A]">
          Credits are added once payment is confirmed, so your balance can take a few seconds to update.
        </p>
      </section>

      <section aria-labelledby="credit-activity-heading" className="mt-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="credit-activity-heading" className="text-[14px] font-semibold text-[#F0EEE9]">
            Credit activity
          </h2>
          <p className="text-[7px] text-[#97938A]">Most recent first</p>
        </div>
        {activity === null ? (
          <p role="status" className="mt-2 rounded-[11px] border border-dashed border-[#302D27] px-4 py-6 text-center text-[9px] text-[#97938A]">
            Credit activity is unavailable right now.
          </p>
        ) : activity.length === 0 ? (
          <div className="mt-2 grid min-h-[74px] content-center gap-1 rounded-[11px] border border-dashed border-[#302D27] text-center">
            <p className="text-[8px] font-semibold text-[#E8E5DF]">No credit activity yet</p>
            <p className="text-[7px] text-[#97938A]">Purchases and exports will show up here.</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-[#24221E] rounded-[11px] border border-[#2A2823] bg-[#141310] px-4">
            {activity.map((entry, index) => (
              <li
                key={`${entry.created_at}-${index}`}
                className="flex min-h-10 items-center justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-[9px] font-semibold text-[#F0EEE9]">
                    {ledgerLabels[entry.reason] ?? "Credit activity"}
                  </p>
                  <time dateTime={entry.created_at} className="mt-0.5 block text-[8px] text-[#97938A]">
                    {new Date(entry.created_at).toLocaleString("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <span
                  className={`font-mono text-[10px] font-semibold tabular-nums ${entry.delta > 0 ? "text-emerald-300" : "text-[#F0EEE9]"}`}
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
