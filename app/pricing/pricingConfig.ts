export type PlanId = "free" | "starter" | "pro" | "business";

export const PRICING_PLANS = [
  {
    id: "free" as PlanId,
    label: "Free",
    price: "$0",
    tagline: "Try every module with limited usage",
    buttonLabel: "Start free",
    badge: undefined as string | undefined,
    highlight: false,
    whatYouCanDo: [
      "All modules included (limited usage)",
      "Watermark on exports",
      "Short uploads allowed",
    ],
    modules: ["PostPilot", "BlogPilot", "AdPilot", "MailPilot", "LeadPilot", "ClipPilot", "BrandPilot"],
  },
  {
    id: "starter" as PlanId,
    label: "Starter",
    price: "$19",
    tagline: "Launch projects with steady usage",
    buttonLabel: "Choose Starter",
    badge: undefined as string | undefined,
    highlight: false,
    whatYouCanDo: [
      "All modules with higher caps",
      "No watermark on exports",
      "Upload longer videos",
    ],
    modules: ["PostPilot", "BlogPilot", "AdPilot", "MailPilot", "LeadPilot", "ClipPilot", "BrandPilot"],
  },
  {
    id: "pro" as PlanId,
    label: "Pro",
    price: "$49",
    tagline: "Higher caps + priority processing",
    buttonLabel: "Choose Pro",
    badge: "Most popular",
    highlight: true,
    whatYouCanDo: [
      "All modules with generous caps",
      "Priority processing",
      "No watermark; longer uploads",
    ],
    modules: ["PostPilot", "BlogPilot", "AdPilot", "MailPilot", "LeadPilot", "ClipPilot", "BrandPilot"],
  },
  {
    id: "business" as PlanId,
    label: "Business",
    price: "$149",
    tagline: "Teams, API, and extended uploads",
    buttonLabel: "Choose Business",
    badge: undefined as string | undefined,
    highlight: false,
    whatYouCanDo: [
      "All modules with highest caps",
      "Priority processing + API access",
      "Team seats; longest uploads",
    ],
    modules: ["PostPilot", "BlogPilot", "AdPilot", "MailPilot", "LeadPilot", "ClipPilot", "BrandPilot"],
  },
] satisfies Array<{
  id: PlanId;
  label: string;
  price: string;
  tagline: string;
  buttonLabel: string;
  badge?: string;
  highlight?: boolean;
  whatYouCanDo: string[];
  modules: string[];
}>;

