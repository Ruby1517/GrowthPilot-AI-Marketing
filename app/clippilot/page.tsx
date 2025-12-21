"use client";

import { useEffect, useState } from "react";
import type { AnalyzeResponse, ClipSuggestion, ClipPlan } from "@/lib/clippilot/types";
import { VOICE_OPTIONS, pickStyleFromCategory } from "@/lib/clippilot/voice-config";

export default function ClipPilotPage() {
  const [file, setFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPath, setMusicPath] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<"original" | "original_plus_music">("original");
  const [voiceMode, setVoiceMode] = useState<"none" | "auto" | "custom">("none");
  const [voiceScript, setVoiceScript] = useState<string>("");
  const [voicePersona, setVoicePersona] = useState<"female" | "male" | "kid">("female");
  const [voiceStyle, setVoiceStyle] = useState<"friendly" | "energetic" | "advertising" | "motivational">("friendly");
  const [voiceId, setVoiceId] = useState<string>(VOICE_OPTIONS[0]?.id || "");
  const [category, setCategory] = useState<string>("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [renderPath, setRenderPath] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [shortResult, setShortResult] = useState<{
    url: string;
    key: string;
    plan: ClipPlan;
    voiceScript?: string;
    voicePersona?: string;
    voiceStyle?: string;
    voiceId?: string;
    category?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualTranscript, setManualTranscript] = useState<string>("");
  const [startSeconds, setStartSeconds] = useState<string>("");
  const [endSeconds, setEndSeconds] = useState<string>("");
  const [savedAnalysis, setSavedAnalysis] = useState<AnalyzeResponse | null>(null);
  const [playbackRate, setPlaybackRate] = useState<string>("1");
  const pickVoiceForPersona = (persona: "female" | "male" | "kid") =>
    VOICE_OPTIONS.find((v) => v.persona === persona)?.id || "";
  const promoScript = [
    "Scene 1 — Hook (0–5s)",
    "Still wasting hours creating content, ads, emails, and videos… manually?",
    "",
    "Scene 2 — Introduce GrowthPilot (5–10s)",
    "Meet GrowthPilot — the all-in-one AI marketing platform that helps you create, publish, and convert… faster than ever.",
    "",
    "Scene 3 — PostPilot (10–15s)",
    "With PostPilot, generate high-engagement social posts in seconds — perfectly written for Instagram, Facebook, LinkedIn, and more.",
    "",
    "Scene 4 — BlogPilot (15–20s)",
    "Need long-form content? BlogPilot writes SEO-optimized blogs that attract traffic and build authority automatically.",
    "",
    "Scene 5 — AdPilot & MailPilot (20–28s)",
    "Launch smarter campaigns with AdPilot and MailPilot — create high-converting ads and email campaigns without hiring an agency.",
    "",
    "Scene 6 — ClipPilot (28–35s)",
    "Turn any video into viral-ready shorts with ClipPilot — auto captions, music, hooks, and social-optimized formats.",
    "",
    "Scene 7 — LeadPilot (35–45s)",
    "And with LeadPilot, your AI sales assistant captures, qualifies, and books leads for you — twenty-four seven.",
    "",
    "Scene 8 — Wrap-up / CTA (45–60s)",
    "One platform. Every marketing tool you need. Start faster. Grow smarter. GrowthPilot. Try GrowthPilot today at growthpilot.ai.",
  ].join("\n");

  const estimatedVoiceSeconds = Math.round((voiceScript.trim().split(/\s+/).length || 0) / 2.5); // ~150 wpm
  const manualRangeSeconds =
    startSeconds && endSeconds && Number.isFinite(Number(startSeconds)) && Number.isFinite(Number(endSeconds))
      ? Math.max(0, Number(endSeconds) - Number(startSeconds))
      : null;

  useEffect(() => {
    if (voiceMode === "none") return;
    if (!category) return;
    const auto = pickStyleFromCategory(category);
    if (auto) setVoiceStyle(auto);
  }, [category, voiceMode]);

  useEffect(() => {
    // Restore last analyzed video (if any) from localStorage
    try {
      const raw = localStorage.getItem("clippilot:lastAnalysis");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.videoPath) {
          setSavedAnalysis(parsed as AnalyzeResponse);
        }
      }
    } catch {}
  }, []);

  async function handleAnalyze() {
    if (!file) {
      setError("Please choose a video to analyze.");
      return;
    }
    setError(null);
    setAnalyzeResult(null);
    setRenderPath(null);
    setAnalyzeLoading(true);
    try {
      // 1) Get a presigned upload URL
      const presignRes = await fetch("/api/clippilot/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          contentType: file.type || undefined,
        }),
      });
      const presignData = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) throw new Error(presignData?.error || "Failed to start upload");

      // 2) Upload directly to S3/Blob storage
      const uploadHeaders = {
        "Content-Type": file.type || "application/octet-stream",
        ...(presignData?.requiredHeaders || {}),
      };
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file,
      });
      if (!uploadRes.ok) {
        const txt = await uploadRes.text().catch(() => "");
        throw new Error(txt || "Upload failed");
      }

      // 3) Call analyze with only the key/URL (no file body)
      const res = await fetch("/api/clippilot/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoKey: presignData.key,
        }),
      });
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      let data: any;

      try {
        data = isJson ? await res.json() : await res.text();
      } catch {
        data = await res.text().catch(() => "");
      }

      if (!res.ok) {
        const bodyMsg = typeof data === "string" ? data : data?.error || data?.message;
        const tooLarge =
          res.status === 413 ||
          (typeof bodyMsg === "string" && bodyMsg.toLowerCase().includes("entity too large")) ||
          (typeof bodyMsg === "string" && bodyMsg.toLowerCase().includes("body too large"));
        const msg = tooLarge
          ? "Upload is too large for the hosted server (Vercel serverless caps request bodies to a few MB). Trim/compress the video or upload via storage instead of posting the file to the API route."
          : bodyMsg || "Analyze failed";
        throw new Error(msg);
      }

      if (!isJson || !data) throw new Error("Unexpected analyze response");

      setAnalyzeResult(data as AnalyzeResponse);
      try {
        localStorage.setItem("clippilot:lastAnalysis", JSON.stringify(data));
        setSavedAnalysis(data as AnalyzeResponse);
      } catch {}
      setShortResult(null);
    } catch (e: any) {
      setError(e?.message || "Analyze failed");
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleRender(clip: ClipSuggestion) {
    if (!analyzeResult?.videoPath) {
      setError("Analyze a video first.");
      return;
    }
    const startVal = Number(startSeconds);
    const endVal = Number(endSeconds);
    if (startSeconds || endSeconds) {
      if (!Number.isFinite(startVal) || !Number.isFinite(endVal) || endVal <= startVal) {
        setError("Set both start and end seconds (end must be greater).");
        return;
      }
    }
    const speedVal = Number(playbackRate);
    const safeSpeed = Number.isFinite(speedVal) ? Math.min(2, Math.max(0.5, speedVal)) : 1;
    setError(null);
    setRenderPath(null);
    setRenderingId(clip.id);
    try {
      const res = await fetch("/api/clippilot/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoPath: analyzeResult.videoPath,
          startSeconds: startSeconds ? startVal : clip.startSeconds,
          endSeconds: endSeconds ? endVal : clip.endSeconds,
          overlayText: clip.hook,
          addMusic: true,
          playbackRate: safeSpeed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Render failed");

      const path =
        data?.url || // prefer shareable URL
        data?.clipPath ||
        data?.outputPath ||
        data?.videoPath ||
        data?.path ||
        (typeof data === "string" ? data : null);
      setRenderPath(path || "Render succeeded (no path returned)");
    } catch (e: any) {
      setError(e?.message || "Render failed");
    } finally {
      setRenderingId(null);
    }
  }

  async function handleUploadMusic() {
    if (!musicFile) {
      setError("Choose an audio file first.");
      return;
    }
    setError(null);
    try {
      const fd = new FormData();
      fd.append("music", musicFile);
      const res = await fetch("/api/clippilot/upload-music", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Music upload failed");
      setMusicPath(data.musicPath || null);
    } catch (e: any) {
      setError(e?.message || "Music upload failed");
    }
  }

  async function handleAutoCreate() {
    if (!analyzeResult?.videoPath) {
      setError("Analyze a video first.");
      return;
    }
    const startVal = Number(startSeconds);
    const endVal = Number(endSeconds);
    if (startSeconds || endSeconds) {
      if (!Number.isFinite(startVal) || !Number.isFinite(endVal) || endVal <= startVal) {
        setError("Set both start and end seconds (end must be greater).");
        return;
      }
    }
    const speedVal = Number(playbackRate);
    const safeSpeed = Number.isFinite(speedVal) ? Math.min(2, Math.max(0.5, speedVal)) : 1;
    const transcriptToUse =
      analyzeResult.transcript ||
      manualTranscript ||
      (voiceMode === "custom" ? voiceScript : "");
    if (!transcriptToUse.trim()) {
      setError("No transcript found. Add a short summary/script for silent videos or use your custom voice script.");
      return;
    }
    setError(null);
    setRenderPath(null);
    setShortResult(null);
    setAutoLoading(true);
    try {
      // Resolve audio mode based on voice/music selections
      let resolvedAudioMode: "original" | "original_plus_music" | "voiceover_only" | "voiceover_plus_music" = "original";
      if (voiceMode === "none") {
        resolvedAudioMode = audioMode === "original_plus_music" && musicPath ? "original_plus_music" : "original";
      } else {
        resolvedAudioMode = musicPath ? "voiceover_plus_music" : "voiceover_only";
      }

      const useAutoVoiceScript = voiceMode === "auto";
      const voiceScriptToSend = voiceMode === "custom" ? voiceScript : null;

      const res = await fetch("/api/clippilot/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptToUse,
          videoPath: analyzeResult.videoPath,
          musicPath,
          audioMode: resolvedAudioMode,
          voiceScript: voiceScriptToSend,
          useAutoVoiceScript,
          voicePersona,
          voiceStyle,
          voiceId,
          category: category || null,
          startSeconds: startSeconds ? startVal : undefined,
          endSeconds: endSeconds ? endVal : undefined,
          playbackRate: safeSpeed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Auto edit failed");
      if (data?.url && data?.plan) {
        setShortResult({
          url: data.url,
          key: data.key,
          plan: data.plan as ClipPlan,
          voiceScript: data.voiceScript,
          voicePersona: data.voicePersona,
          voiceStyle: data.voiceStyle,
          voiceId: data.voiceId,
          category: data.category,
        });
        setRenderPath(data.url);
      } else {
        const clipPath = data.clipPath || data.path || data.outputPath;
        setRenderPath(clipPath || "Auto edit succeeded (no path returned)");
      }
    } catch (e: any) {
      setError(e?.message || "Auto edit failed");
    } finally {
      setAutoLoading(false);
    }
  }

  return (
    <section className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <span className="badge">ClipPilot</span>
        <h1 className="text-3xl font-semibold">AI Video/Shorts Creator</h1>
        <p className="text-brand-muted">
          Upload a video, let ClipPilot transcribe and suggest viral clips, then render a ready-to-post short.
        </p>
        <p className="text-sm text-brand-muted">
          GrowthPilot’s AI video shorts creator automates TikTok Reels and YouTube Shorts editing with hooks, captions, music, and brand-safe overlays for your marketing suite.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <a className="btn-ghost text-sm" href="/clippilot/library">
            View Your Clips
          </a>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full md:w-auto"
          />
          <button className="btn-gold md:ml-auto" onClick={handleAnalyze} disabled={analyzeLoading}>
            {analyzeLoading ? "Analyzing…" : "Analyze Video"}
          </button>
        </div>
        {savedAnalysis && (
          <div className="flex flex-col gap-2 text-xs text-brand-muted md:flex-row md:items-center md:gap-3">
            <span className="text-sm font-semibold text-white/90">Reuse last analyzed video?</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  setAnalyzeResult(savedAnalysis);
                  setError(null);
                  setRenderPath(null);
                  setShortResult(null);
                }}
              >
                Load last analysis
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  try { localStorage.removeItem("clippilot:lastAnalysis"); } catch {}
                  setSavedAnalysis(null);
                }}
              >
                Clear saved
              </button>
              <span className="text-brand-muted truncate">
                {savedAnalysis.videoPath}
              </span>
            </div>
          </div>
        )}
        {file && (
          <div className="text-sm text-brand-muted">
            Selected: <b>{file.name}</b> ({Math.round(file.size / 1024 / 1024)} MB)
          </div>
        )}
        {error && <div className="text-sm text-rose-500">{error}</div>}
      </div>

      <div className="card p-6 space-y-3">
        <div className="text-sm font-semibold">Clip range (optional)</div>
        <p className="text-xs text-brand-muted">
          Set start/end in seconds to force the exact segment you want (e.g., 0 → 120 for a 2-minute cut). Leave empty to auto-pick a short clip.
        </p>
        {manualRangeSeconds !== null && (
          <div className="text-xs text-brand-muted">
            Range: {manualRangeSeconds.toFixed(0)}s{estimatedVoiceSeconds ? ` • Voice est: ${estimatedVoiceSeconds}s` : ""}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Start (seconds)
            <input
              type="number"
              min={0}
              value={startSeconds}
              onChange={(e) => setStartSeconds(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="e.g., 0"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            End (seconds)
            <input
              type="number"
              min={0}
              value={endSeconds}
              onChange={(e) => setEndSeconds(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="e.g., 120"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Playback speed
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(e.target.value)}
            >
              <option value="0.5">0.5× (slower)</option>
              <option value="0.75">0.75×</option>
              <option value="1">1× (normal)</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2× (double speed)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Optional background music upload */}
      <div className="card p-6 space-y-3">
        <div className="text-sm font-semibold">Background music (optional)</div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
            className="w-full md:w-auto"
          />
          <button className="btn-ghost" onClick={handleUploadMusic} disabled={!musicFile}>
            Upload Music
          </button>
          {musicPath && <span className="text-xs text-brand-muted">Uploaded: {musicPath}</span>}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="audioMode"
              value="original"
              checked={audioMode === "original"}
              onChange={() => setAudioMode("original")}
            />
            Use original audio only
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="audioMode"
              value="original_plus_music"
              disabled={!musicPath}
              checked={audioMode === "original_plus_music"}
              onChange={() => setAudioMode("original_plus_music")}
            />
            Original + uploaded music
          </label>
        </div>
      </div>

      {/* Voice Over */}
      <div className="card p-6 space-y-3">
        <div className="text-sm font-semibold">Voice Over</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-brand-muted">Video category (auto-picks tone)</div>
            <select
              className="w-full rounded border p-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">-- Select category --</option>
              <option value="fitness">Fitness</option>
              <option value="health">Health</option>
              <option value="sports">Sports</option>
              <option value="education">Education</option>
              <option value="tutorial">Tutorial</option>
              <option value="ecommerce">Ecommerce</option>
              <option value="retail">Retail</option>
              <option value="finance">Finance</option>
              <option value="saas">SaaS</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="other">Other</option>
            </select>
            <div className="text-[11px] text-brand-muted">Fitness auto-selects motivational tone, ecommerce picks advertising, education picks friendly, etc.</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="voiceMode"
              value="none"
              checked={voiceMode === "none"}
              onChange={() => setVoiceMode("none")}
            />
            No voice-over
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="voiceMode"
              value="auto"
              checked={voiceMode === "auto"}
              onChange={() => setVoiceMode("auto")}
            />
            Auto-generate AI voice-over
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="voiceMode"
              value="custom"
              checked={voiceMode === "custom"}
              onChange={() => setVoiceMode("custom")}
            />
            Use my own script
          </label>
        </div>
        {voiceMode !== "none" && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-brand-muted">Voice option (American accent)</div>
                <div className="space-y-2">
                  <label className="flex flex-col gap-1 text-sm border rounded-lg p-3">
                    <span className="text-xs text-brand-muted">Voice persona</span>
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={voicePersona}
                      onChange={(e) => {
                        const persona = e.target.value as "female" | "male" | "kid";
                        setVoicePersona(persona);
                        const match = pickVoiceForPersona(persona);
                        if (match) setVoiceId(match);
                      }}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="kid">Youthful</option>
                    </select>
                    <span className="text-[11px] text-brand-muted">Pick persona; choose a specific voice below.</span>
                  </label>
                  {VOICE_OPTIONS.map((opt) => (
                    <label key={opt.id} className="border rounded-lg p-3 flex gap-3 items-start cursor-pointer">
                      <input
                        type="radio"
                        name="voiceOption"
                        value={opt.id}
                        checked={voiceId === opt.id}
                        onChange={() => {
                          setVoiceId(opt.id);
                          setVoicePersona(opt.persona);
                          setVoiceStyle(opt.defaultStyle);
                        }}
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{opt.label}</div>
                        <div className="text-xs text-brand-muted">Sample: {opt.sampleText}</div>
                        <div className="text-[11px] text-brand-muted">Default tone: {opt.defaultStyle}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-brand-muted">Tone (gain/EQ preset applied)</div>
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value as any)}
                >
                  <option value="friendly">Friendly</option>
                  <option value="energetic">Energetic</option>
                  <option value="motivational">Motivational</option>
                  <option value="advertising">Advertising</option>
                </select>
              </div>
            </div>
          </div>
        )}
        {voiceMode === "custom" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
              <span>Enter your voice-over script:</span>
              <button
                type="button"
                className="btn-ghost text-[11px] px-2 py-1"
                onClick={() => {
                  setVoiceScript(promoScript);
                  setStartSeconds("0");
                  setEndSeconds("60");
                }}
              >
                Use GrowthPilot promo script (60s)
              </button>
            </div>
            <textarea
              className="w-full rounded border p-3 text-sm min-h-[100px]"
              value={voiceScript}
              onChange={(e) => setVoiceScript(e.target.value)}
              placeholder="Type your voice-over script here..."
            />
            {estimatedVoiceSeconds > 0 && (
              <div className="text-[11px] text-brand-muted">
                Estimated voice length: ~{estimatedVoiceSeconds}s. Adjust start/end above to cover it.
              </div>
            )}
          </div>
        )}
      </div>

      {analyzeResult && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="badge">Analysis</span>
            <span className="text-sm text-brand-muted truncate">Source: {analyzeResult.videoPath}</span>
          </div>

          <div>
            <div className="text-sm font-semibold">Transcript</div>
            <textarea
              className="mt-1 w-full rounded border p-3 text-sm min-h-[160px]"
              readOnly
              value={analyzeResult.transcript || ""}
            />
            {!analyzeResult.transcript && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-brand-muted">
                  Silent video? Add a short summary/script so ClipPilot can find the hook and promos.
                </div>
                <textarea
                  className="w-full rounded border p-3 text-sm min-h-[100px]"
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Describe the video, promo, CTA, and brand in 2-4 sentences."
                />
              </div>
            )}
            <div className="mt-3">
              <button className="btn-gold" onClick={handleAutoCreate} disabled={autoLoading}>
                {autoLoading ? "Auto-creating…" : "Auto Create Short"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Suggested clips</span>
              <span className="text-xs text-brand-muted">
                {analyzeResult.suggestions?.length || 0} found
              </span>
            </div>

            {analyzeResult.suggestions?.length ? (
              <div className="grid gap-3">
                {analyzeResult.suggestions.map((clip) => (
                  <div key={clip.id} className="rounded-lg border p-4 bg-white/50">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-[240px] space-y-1">
                        <div className="text-sm font-semibold">{clip.title}</div>
                        <div className="text-sm text-brand-muted">Hook: {clip.hook}</div>
                        <div className="text-sm text-brand-muted">Summary: {clip.summary}</div>
                        <div className="text-xs text-brand-muted">
                          {clip.startSeconds}s → {clip.endSeconds}s • {Math.round(clip.durationSeconds)}s
                        </div>
                      </div>
                      <button
                        className="btn-gold"
                        onClick={() => handleRender(clip)}
                        disabled={renderingId === clip.id}
                      >
                        {renderingId === clip.id ? "Rendering…" : "Generate Short"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-brand-muted">No suggestions returned.</div>
            )}
          </div>
        </div>
      )}

      {renderPath && (
        <div className="card p-6 space-y-2">
          <div className="text-sm font-semibold">Rendered clip</div>
          {shortResult?.plan && (
            <div className="text-xs text-brand-muted space-y-1">
              <div><b>{shortResult.plan.title || "Auto plan"}</b></div>
              <div>{shortResult.plan.summary || "Auto-selected segment"}</div>
              <div>{shortResult.plan.hook}</div>
              <div>Promo: {shortResult.plan.promoLabel}</div>
              <div>CTA: {shortResult.plan.ctaText}</div>
              <div>Brand: {shortResult.plan.brandTag}</div>
              <div>
                {shortResult.plan.startSeconds ?? "-"}s → {shortResult.plan.endSeconds ?? "-"}s
              </div>
              {shortResult.voiceScript && (
                <div className="mt-1">
                  <span className="text-brand-muted">Voice script: </span>
                  <span>{shortResult.voiceScript}</span>
                </div>
              )}
              {shortResult.voicePersona && shortResult.voiceStyle && (
                <div className="mt-1">
                  <span className="text-brand-muted">Voice: </span>
                  <span>{shortResult.voicePersona} • {shortResult.voiceStyle}{shortResult.voiceId ? ` • ${shortResult.voiceId}` : ""}</span>
                </div>
              )}
              {shortResult.category && (
                <div className="mt-1">
                  <span className="text-brand-muted">Category: </span>
                  <span>{shortResult.category}</span>
                </div>
              )}
            </div>
          )}
          {shortResult?.url ? (
            <>
              <video src={shortResult.url} controls className="w-full rounded-lg" />
              <a className="btn-ghost text-xs inline-block mt-2" href={shortResult.url} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </>
          ) : (
            <pre className="text-xs bg-gray-900 text-white rounded p-3 overflow-x-auto">{renderPath}</pre>
          )}
        </div>
      )}
    </section>
  );
}
