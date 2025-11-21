"use client";

import { redirect } from 'next/navigation';

export default function LegacyClipsPage() {
  redirect('/clippilot');
  return null;
}
