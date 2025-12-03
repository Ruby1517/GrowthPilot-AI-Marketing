import type { Metadata } from "next";

const title = "ClipPilot | AI video shorts creator for TikTok, Reels, Shorts";
const description =
  "Automatically turn long videos into viral-ready shorts with hooks, captions, and music. ClipPilot handles TikTok, Reels, and YouTube Shorts automation end-to-end.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/clippilot" },
  keywords: [
    "AI video shorts creator",
    "TikTok Reels automation",
    "YouTube Shorts editor",
    "AI marketing suite",
    "AI video editing",
    "short-form video generator",
  ],
  openGraph: {
    title,
    description,
    url: "/clippilot",
    type: "website",
    images: [{ url: "/images/growth.png", width: 1200, height: 630, alt: "ClipPilot by GrowthPilot" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/growth.png"],
  },
};

export default metadata;
