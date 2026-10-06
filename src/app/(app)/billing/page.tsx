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
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-medium text-cyan-300">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Billing and credits
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          View your current plan and credit activity.
        </p>
      </header>

      {params.checkout === "success" && (
        <p role="status" className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          Payment completed. Credits are added after Stripe confirms the payment; refresh this page if your balance has not updated yet.
        </p>
      )}
      {params.checkout === "cancelled" && (
        <p role="status" className="mb-6 rounded-lg border border-slate-700 p-4 text-sm text-slate-300">
          Checkout was cancelled. No payment was taken.
        </p>
      )}

      <section
        aria-label="Current plan and credit balance"
        className="grid gap-4 md:grid-cols-2"
      >
        <article className="rounded-xl border border-slate-800 bg-[#0b1120] p-5 sm:p-6">
          <p className="text-sm text-slate-400">Current plan</p>
          {profileUnavailable ? (
            <p
              role="status"
              className="mt-3 text-lg font-semibold text-slate-200"
            >
              Plan unavailable
            </p>
          ) : (
            <p className="mt-3 text-2xl font-semibold text-white">
              {profile
                ? (planLabels[profile.plan] ?? "Plan unavailable")
                : "Plan unavailable"}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Credit bundles are purchased once. Your credits remain until used.
          </p>
        </article>

        <article className="rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.08] to-indigo-400/[0.06] p-5 sm:p-6">
          <p className="text-sm text-slate-300">Available credits</p>
          {profileUnavailable ? (
            <p
              role="status"
              className="mt-3 text-lg font-semibold text-slate-200"
            >
              Balance unavailable
            </p>
          ) : (
            <p className="mt-2 text-4xl font-semibold tabular-nums text-white">
              {profile ? profile.credits : "Unavailable"}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {profile
              ? `${profile.credits} credits are available. Depth relief uses 5 credits; each background PNG uses 5 credits.`
              : "Credits are read from your account profile."}
          </p>
          <Link
            href="/studio"
            className="mt-5 inline-flex rounded-md bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Back to Studio
          </Link>
        </article>
      </section>

      <section aria-labelledby="plans-heading" className="mt-10">
        <div className="border-b border-slate-800 pb-4">
          <h2 id="plans-heading" className="text-xl font-semibold text-white">
            Plans and credit packs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            One-time payments in INR. Purchased credits do not expire.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.values(CREDIT_BUNDLES).map((bundle) => (
            <article
              key={bundle.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-[#0b1120] p-4"
            >
              <div>
                <h3 className="font-medium text-slate-200">{bundle.name} · {bundle.displayPrice}</h3>
                <p className="mt-1 text-sm text-slate-500">{bundle.credits} credits, one-time</p>
              </div>
              <CheckoutButton
                bundleId={bundle.id}
                className="rounded-md bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              />
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="credit-activity-heading" className="mt-10">
        <div className="border-b border-slate-800 pb-4">
          <h2
            id="credit-activity-heading"
            className="text-xl font-semibold text-white"
          >
            Credit activity
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest account ledger entries
          </p>
        </div>
        {activity === null ? (
          <p role="status" className="py-6 text-sm text-slate-400">
            Credit activity is unavailable right now.
          </p>
        ) : activity.length === 0 ? (
          <p className="py-6 text-sm text-slate-400">No credit activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {activity.map((entry, index) => (
              <li
                key={`${entry.created_at}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {ledgerLabels[entry.reason] ?? "Credit activity"}
                  </p>
                  <time
                    dateTime={entry.created_at}
                    className="mt-1 block text-xs text-slate-500"
                  >
                    {new Date(entry.created_at).toLocaleString("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <span
                  className={`font-mono text-sm tabular-nums ${entry.delta > 0 ? "text-emerald-300" : "text-slate-300"}`}
                >
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
