/** Every colour is a theme token (CSS variable): pages never hard-code a palette, so light and dark stay in sync everywhere. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Tone classes are sometimes built dynamically (text-${tone}); keep them whatever the scanner sees.
  safelist: ['success', 'warning', 'danger', 'info', 'accent', 'primary'].flatMap((t) => [`text-${t}`, `bg-${t}/10`]),
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        page: token('bg'), surface: token('surface'), surface2: token('surface-2'), line: token('border'),
        fg: token('text'), muted: token('muted'), primary: token('primary'), 'primary-fg': token('primary-fg'), accent: token('accent'),
        success: token('success'), warning: token('warning'), danger: token('danger'), info: token('info'),
      },
      borderRadius: { xl: 'var(--radius)', lg: 'calc(var(--radius) - 4px)', md: 'calc(var(--radius) - 6px)' },
      boxShadow: { card: 'var(--shadow-card)', pop: 'var(--shadow-pop)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
};
