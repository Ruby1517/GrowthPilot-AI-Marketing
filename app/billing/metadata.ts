import type { Metadata } from "next";

const title = "Plans & Pricing | GrowthPilot AI marketing suite";
const description =
  "Choose a plan for GrowthPilot’s AI marketing suite: AI video shorts creator, social content generator, SEO blog automation, AI ad creation, lead chatbot, and email assistant.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/billing" },
  keywords: [
    "AI marketing suite pricing",
    "AI video shorts creator",
    "AI social media content generator",
    "SEO blog generation",
    "AI ad generation",
    "lead generation chatbot",
    "AI email assistant",
  ],
  openGraph: {
    title,
    description,
    url: "/billing",
    type: "website",
    images: [{ url: "/images/growth.png", width: 1200, height: 630, alt: "GrowthPilot pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/growth.png"],
  },
};

export default metadata;
