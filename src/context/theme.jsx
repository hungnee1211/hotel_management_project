import { Moon, Sun } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const Ctx = createContext({ theme: 'light', toggle() {} });
const initial = () => document.documentElement.dataset.theme || 'light';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* private mode: keep in memory only */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <Ctx.Provider value={useMemo(() => ({ theme, toggle }), [theme, toggle])}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} className="rounded-lg border border-line bg-surface p-2 text-muted transition hover:bg-surface2 hover:text-fg">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Theme colours as concrete rgb() strings, for libraries (charts) that cannot read CSS variables. Updates when the theme changes. */
export function useThemeColors() {
  const { theme } = useTheme();
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const c = (n) => `rgb(${s.getPropertyValue(`--${n}`).trim().replace(/\s+/g, ',')})`;
    return { primary: c('primary'), accent: c('accent'), success: c('success'), warning: c('warning'), danger: c('danger'), info: c('info'), text: c('text'), muted: c('muted'), border: c('border'), surface: c('surface') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
