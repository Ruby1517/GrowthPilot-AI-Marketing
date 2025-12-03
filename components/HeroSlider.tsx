import React, { useEffect, useState } from "react";

type HeroSliderProps<T extends { key: string }> = {
  items: T[];
  renderSlide: (item: T) => React.ReactNode;
  className?: string;
  autoAdvanceMs?: number;
};

/**
 * Generic hero slider saved for later use.
 * Provide items and a renderSlide function; navigation + auto-advance are included.
 */
export default function HeroSlider<T extends { key: string }>({
  items,
  renderSlide,
  className,
  autoAdvanceMs = 6000,
}: HeroSliderProps<T>) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [pause, setPause] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const heroCount = items.length;

  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const onChange = () => setReducedMotion(mq.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (heroCount <= 1) return;
    if (reducedMotion || pause) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % heroCount), autoAdvanceMs);
    return () => clearInterval(id);
  }, [autoAdvanceMs, heroCount, pause, reducedMotion]);

  if (!heroCount) return null;
  const outerClass = `mt-8 md:mt-12 w-screen max-w-none px-0 relative left-1/2 -translate-x-1/2 ${className ?? ""}`;

  const goPrev = () => setHeroIdx((i) => (i - 1 + heroCount) % heroCount);
  const goNext = () => setHeroIdx((i) => (i + 1) % heroCount);

  return (
    <div className={outerClass.trim()}>
      <div
        className="relative overflow-hidden text-white bg-[#01030b] backdrop-blur-xl"
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => setPause(false)}
        onFocus={() => setPause(true)}
        onBlur={() => setPause(false)}
      >
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden>
          <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-sky-500/30 blur-[140px]" />
          <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[color:var(--gold,theme(colors.brand.gold))]/25 blur-[120px]" />
        </div>
        <div
          className="relative flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${heroIdx * 100}%)` }}
        >
          {items.map((item) => (
            <div key={item.key} className="min-w-full shrink-0">
              {renderSlide(item)}
            </div>
          ))}
        </div>
        {heroCount > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 pointer-events-none">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="pointer-events-auto rounded-full bg-black/40 hover:bg-black/60 p-2 border border-white/20"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <path fill="currentColor" d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="pointer-events-auto rounded-full bg-black/40 hover:bg-black/60 p-2 border border-white/20"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <path fill="currentColor" d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {heroCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.key}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setHeroIdx(i)}
              className={`h-2 w-2 rounded-full transition-all ${heroIdx === i ? "w-3 bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
