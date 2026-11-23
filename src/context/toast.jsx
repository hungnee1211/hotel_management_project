import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cx } from '../components/ui/index.jsx';

const Ctx = createContext({ success() {}, error() {}, info() {} });
const STYLE = { success: ['bg-success/10 text-success ring-success/30', CheckCircle2], error: ['bg-danger/10 text-danger ring-danger/30', XCircle], info: ['bg-info/10 text-info ring-info/30', Info] };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((kind, message) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, kind, message }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => { const [cls, Icon] = STYLE[t.kind]; return <div key={t.id} role="status" className={cx('pointer-events-auto flex items-start gap-2 rounded-lg bg-surface px-4 py-3 text-sm shadow-pop ring-1', cls)}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><span className="text-fg">{t.message}</span></div>; })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
