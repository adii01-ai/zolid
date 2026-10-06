import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "3 free generations",
    features: ["Three depth relief generations", "GLB export"],
    cta: "Start free",
    variant: "light",
  },
  {
    name: "1 week",
    price: "Checkout pending",
    features: [
      "Plan access for 7 days",
      "Generation credits",
      "Depth relief export",
    ],
    cta: "Coming soon",
    variant: "muted",
  },
  {
    name: "Monthly",
    price: "Checkout pending",
    features: [
      "Configurable generation credit allowance",
      "Depth relief export",
    ],
    cta: "Coming soon",
    variant: "highlight",
  },
  {
    name: "6 months",
    price: "Checkout pending",
    features: [
      "Configurable generation credit allowance",
      "Depth relief export",
    ],
    cta: "Coming soon",
    variant: "muted",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="px-4 pb-8 pt-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1160px]">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Pricing</h2>
        <p className="mt-3 max-w-[56ch] text-slate-400">
          Paid plans and checkout are not available yet. Credits are never added
          until payment processing is connected.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex min-h-[280px] flex-col rounded-lg border p-6 ${
                plan.variant === "highlight"
                  ? "border-indigo-400/60 bg-slate-900"
                  : plan.variant === "muted"
                    ? "border-slate-700 bg-slate-900/60"
                    : "border-slate-700 bg-slate-900/60"
              }`}
            >
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <div className="mt-5 text-2xl font-bold text-cyan-200">
                {plan.price}
              </div>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="list-disc pl-5">
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {plan.name === "Free" ? (
                  <Link
                    href="#upload"
                    className="inline-flex items-center justify-center rounded-md border border-cyan-300 bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    {plan.cta}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
