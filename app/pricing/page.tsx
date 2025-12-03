import { PRICING_PLANS, type PlanId } from "../billing/pricingConfig";

export default function BillingPage() {
  // TODO: Replace with real user plan from session/DB
  const currentPlan: PlanId = "free";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Plans &amp; Pricing</h1>
        <p className="text-sm text-neutral-400">
          All modules included. Start free with limited usage, then upgrade to lift caps and add team features.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {PRICING_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border border-white/5 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 p-5 shadow-lg ${
                plan.highlight ? "ring-1 ring-emerald-400/60" : ""
              }`}
            >
              {plan.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  {plan.badge.toUpperCase()}
                </span>
              )}

              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold">{plan.label}</h2>
                <p className="text-2xl font-bold">{plan.price}</p>
                <p className="text-xs text-neutral-400">{plan.tagline}</p>
              </div>

              <button
                className={`mb-4 w-full rounded-full px-4 py-2 text-sm font-semibold ${
                  isCurrent
                    ? "bg-neutral-700 text-neutral-100 cursor-default"
                    : "bg-amber-400 text-black hover:bg-amber-300"
                }`}
                disabled={isCurrent}
              >
                {isCurrent ? "Current plan" : plan.buttonLabel}
            </button>

              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  What you can do
                </p>
                <ul className="space-y-1 text-xs text-neutral-300">
                  {plan.whatYouCanDo.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Modules included
                </p>
                <div className="flex flex-wrap gap-1">
                  {plan.modules.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-100"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <button className="rounded-full border border-neutral-600 px-4 py-2 text-xs text-neutral-200 hover:border-neutral-400">
          Manage Subscription
        </button>
      </div>
    </div>
  );
}
