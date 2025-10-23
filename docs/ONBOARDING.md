# Onboarding (ViralPilot)

1) Create ideas: enter a niche keyword and click Get Ideas.
2) Generate script: pick an idea and generate.
3) Voice-over: choose voice (male/female/neutral) and generate TTS.
4) Assemble: click Assemble MP4. Ensure FFmpeg is available.

Tips
- Set `ELEVENLABS_VOICE_ID_MALE` / `ELEVENLABS_VOICE_ID_FEMALE` for consistent voices.
- For queue-based assembly, run `scripts/viralp-worker.ts` and configure Redis.
