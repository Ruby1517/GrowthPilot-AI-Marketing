"use client";

import { useMemo, useState } from "react";
import type { AnalyzeResponse, ClipSuggestion, ClipPlan } from "@/lib/clippilot/types";

export default function ClipPilotPage() {
  const [file, setFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPath, setMusicPath] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<"original" | "original_plus_music">("original");
  const [voiceMode, setVoiceMode] = useState<"none" | "auto" | "custom">("none");
  const [voiceScript, setVoiceScript] = useState<string>("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [renderPath, setRenderPath] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResult, setAutoResult] = useState<{ clipPath: string; plan: any } | null>(null);
  const [shortResult, setShortResult] = useState<{ url: string; key: string; plan: ClipPlan; voiceScript?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualTranscript, setManualTranscript] = useState<string>("");

  const transcriptPreview = useMemo(() => {
    if (!analyzeResult?.transcript) return "";
    const trimmed = analyzeResult.transcript.trim();
    return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
  }, [analyzeResult?.transcript]);

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
      const fd = new FormData();
      fd.append("video", file);

      const res = await fetch("/api/clippilot/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");
      setAnalyzeResult(data as AnalyzeResponse);
      setAutoResult(null);
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
    setError(null);
    setRenderPath(null);
    setRenderingId(clip.id);
    try {
      const res = await fetch("/api/clippilot/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoPath: analyzeResult.videoPath,
          startSeconds: clip.startSeconds,
          endSeconds: clip.endSeconds,
          overlayText: clip.hook,
          addMusic: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Render failed");

      const path =
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
    const transcriptToUse = analyzeResult.transcript || manualTranscript;
    if (!transcriptToUse.trim()) {
      setError("No transcript found. Add a short summary/script for silent videos.");
      return;
    }
    setError(null);
    setRenderPath(null);
    setAutoResult(null);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Auto edit failed");
      if (data?.url && data?.plan) {
        setShortResult({ url: data.url, key: data.key, plan: data.plan as ClipPlan, voiceScript: data.voiceScript });
        setRenderPath(data.url);
      } else {
        const clipPath = data.clipPath || data.path || data.outputPath;
        setAutoResult({ clipPath: clipPath || "Auto edit succeeded (no path returned)", plan: data.plan });
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
        {file && (
          <div className="text-sm text-brand-muted">
            Selected: <b>{file.name}</b> ({Math.round(file.size / 1024 / 1024)} MB)
          </div>
        )}
        {error && <div className="text-sm text-rose-500">{error}</div>}
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
        {voiceMode === "custom" && (
          <div className="space-y-1">
            <div className="text-xs text-brand-muted">Enter 1–2 sentences for the voice-over:</div>
            <textarea
              className="w-full rounded border p-3 text-sm min-h-[100px]"
              value={voiceScript}
              onChange={(e) => setVoiceScript(e.target.value)}
              placeholder="Type your voice-over script here..."
            />
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
            <p className="text-xs text-brand-muted mt-1">Preview: {transcriptPreview || "n/a"}</p>
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
