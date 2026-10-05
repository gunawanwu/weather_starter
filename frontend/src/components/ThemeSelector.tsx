import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../state/themeStore';
import { THEMES } from '../themes';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="fixed right-4 top-4 z-[200]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-xl transition hover:bg-white/[0.16]"
      >
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 flex-none rounded-full border border-white/25"
          style={{ background: current.swatch }}
        />
        {current.label}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 top-10 w-52 rounded-xl border border-white/15 bg-white/[0.08] p-2 shadow-xl backdrop-blur-xl"
        >
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Theme
          </p>
          <div className="grid grid-cols-3 gap-1">
            {THEMES.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-lg p-2 text-[10px] font-medium text-white/80 transition hover:bg-white/[0.12] ${
                    isActive ? 'bg-white/[0.16] ring-1 ring-white/30' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-8 w-full flex-none rounded border border-white/20"
                    style={{ background: t.swatch }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
