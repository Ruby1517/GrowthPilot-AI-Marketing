export type PlanId = "free" | "starter" | "pro" | "business";

export const PRICING_PLANS: {
  id: PlanId;
  label: string;
  price: string;
  badge?: string;
  tagline: string;
  buttonLabel: string;
  highlight?: boolean;
  whatYouCanDo: string[];
  modules: string[];
}[] = [
  {
    id: "free",
    label: "Free",
    price: "$0/mo",
    tagline: "Try every module with limited usage",
    buttonLabel: "Included",
    whatYouCanDo: [
      "All modules included (test mode)",
      "Usage caps apply per plan",
      "Watermark on exports",
      "Up to 3 shorts / month",
      "Max video upload ~1 min",
    ],
    modules: ["PostPilot", "ClipPilot", "BlogPilot", "AdPilot", "LeadPilot", "MailPilot", "BrandPilot"],
  },
  {
    id: "starter",
    label: "Starter",
    price: "$19/mo",
    tagline: "Launch projects with steady usage",
    buttonLabel: "Get started",
    whatYouCanDo: [
      "All modules included",
      "Usage caps apply per plan",
      "No watermark on exports",
      "Up to 30 shorts / month",
      "Max video upload ~3 min",
    ],
    modules: ["PostPilot", "ClipPilot", "BlogPilot", "AdPilot", "LeadPilot", "MailPilot", "BrandPilot"],
  },
  {
    id: "pro",
    label: "Pro",
    price: "$49/mo",
    badge: "Most popular",
    tagline: "Higher caps + priority processing",
    buttonLabel: "Get started",
    highlight: true,
    whatYouCanDo: [
      "All modules included",
      "Higher usage caps per plan",
      "No watermark on exports",
      "Up to 100 shorts / month",
      "Max video upload ~10 min",
      "Priority AI processing",
    ],
    modules: ["PostPilot", "ClipPilot", "BlogPilot", "AdPilot", "LeadPilot", "MailPilot", "BrandPilot"],
  },
  {
    id: "business",
    label: "Business",
    price: "$149/mo",
    tagline: "Teams, API, and extended uploads",
    buttonLabel: "Get started",
    whatYouCanDo: [
      "All modules included",
      "Highest usage caps per plan",
      "No watermark on exports",
      "Up to 500+ shorts / month",
      "Max video upload ~30 min",
      "Priority AI processing",
      "10 team seats",
      "API access",
    ],
    modules: ["PostPilot", "ClipPilot", "BlogPilot", "AdPilot", "LeadPilot", "MailPilot", "BrandPilot"],
  },
];
