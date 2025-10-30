'use client';

export default function SidebarToggle() {
  function toggle() {
    try {
      const cur = typeof window !== 'undefined' ? localStorage.getItem('gpSidebarCollapsed') : null;
      const next = cur === '1' ? '0' : '1';
      localStorage.setItem('gpSidebarCollapsed', next);
      window.dispatchEvent(new Event('gp:sidebar-changed'));
    } catch {}
  }
  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      title="Toggle sidebar"
      onClick={toggle}
      className="hidden md:inline-flex items-center justify-center rounded-lg p-2 ml-2 border border-[color:var(--card-stroke,rgba(255,255,255,0.12))] hover:bg-white/5 dark:hover:bg-white/10 transition"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80"><path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/></svg>
    </button>
  );
}

