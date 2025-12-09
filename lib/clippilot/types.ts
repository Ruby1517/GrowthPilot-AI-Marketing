export interface ClipSuggestion {
  id: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  hook: string;
  title: string;
  summary: string;
}

export interface ClipPlan {
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  hook: string;         // main big headline for the short
  overlayText: string;  // kept for compatibility; typically same as hook
  title: string;
  summary: string;
  promoLabel: string;   // e.g., "LIMITED-TIME OFFER"
  ctaText: string;      // e.g., "Tap to learn more"
  brandTag: string;     // e.g., "@GrowthPilotAI"
}

export interface AnalyzeResponse {
  transcript: string;
  suggestions: ClipSuggestion[];
  videoPath: string;
  videoKey?: string;
  videoUrl?: string;
}

export interface RenderRequest {
  videoPath: string;
  clipId?: string;
  startSeconds: number;
  endSeconds: number;
  overlayText?: string;
  addMusic?: boolean;
}
