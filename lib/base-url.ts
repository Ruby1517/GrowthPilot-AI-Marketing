// lib/base-url.ts
import { headers } from "next/headers";

export function getBaseUrl() {
  // Prefer explicit env in all envs (Vercel, local)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  // Derive from the incoming request (dev / SSR)
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  if (!host) throw new Error("Cannot determine host for absolute URL");
  return `${proto}://${host}`;
}
