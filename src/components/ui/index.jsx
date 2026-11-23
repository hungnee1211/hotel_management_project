import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react';
import { forwardRef, useEffect, useId } from 'react';
import { titleCase } from '../../lib/format.js';
import { toneOf } from '../../lib/tones.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- Buttons ---------- */
const BTN = {
  primary: 'bg-primary text-primary-fg hover:bg-primary/90 border-transparent',
  secondary: 'bg-surface text-fg border-line hover:bg-surface2',
  ghost: 'bg-transparent text-fg border-transparent hover:bg-surface2',
  danger: 'bg-danger text-primary-fg border-transparent hover:bg-danger/90',
  subtle: 'bg-primary/10 text-primary border-transparent hover:bg-primary/15',
};
const SIZE = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, icon: Icon, children, className, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cx('inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-55', BTN[variant], SIZE[size], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});

/* ---------- Form controls ---------- */
export const Field = ({ label, error, hint, required, children, className }) => {
  const id = useId();
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && <label htmlFor={id} className="block text-xs font-medium text-muted">{label}{required && <span className="text-danger"> *</span>}</label>}
      {typeof children === 'function' ? children({ id, 'aria-invalid': error ? 'true' : undefined }) : children}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
};
export const Input = forwardRef(function Input({ className, ...p }, ref) { return <input ref={ref} className={cx('input', className)} {...p} />; });
export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...p }, ref) { return <textarea ref={ref} rows={rows} className={cx('input', className)} {...p} />; });
export const Select = forwardRef(function Select({ className, children, ...p }, ref) { return <select ref={ref} className={cx('input pr-8', className)} {...p}>{children}</select>; });
export const Checkbox = ({ label, ...p }) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-line accent-[rgb(var(--primary))]" {...p} />{label}</label>
);
/** Field + control in one: <TextField label="Name" {...form.bind('name')} /> */
export const TextField = ({ label, error, hint, required, className, ...p }) => (
  <Field label={label} error={error} hint={hint} required={required} className={className}>{(a) => <Input {...a} {...p} />}</Field>
);
export const SelectField = ({ label, error, hint, required, className, children, ...p }) => (
  <Field label={label} error={error} hint={hint} required={required} className={className}>{(a) => <Select {...a} {...p}>{children}</Select>}</Field>
);
export const TextareaField = ({ label, error, hint, required, className, ...p }) => (
  <Field label={label} error={error} hint={hint} required={required} className={className}>{(a) => <Textarea {...a} {...p} />}</Field>
);

/* ---------- Surfaces ---------- */
export const Card = ({ className, children, ...p }) => <div className={cx('card', className)} {...p}>{children}</div>;
export const CardHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
    <div><h2 className="text-base">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const TONE = {
  success: 'bg-success/10 text-success ring-success/25', warning: 'bg-warning/10 text-warning ring-warning/25', danger: 'bg-danger/10 text-danger ring-danger/25',
  info: 'bg-info/10 text-info ring-info/25', accent: 'bg-accent/10 text-accent ring-accent/25', neutral: 'bg-surface2 text-muted ring-line', primary: 'bg-primary/10 text-primary ring-primary/25',
};
export const Badge = ({ tone = 'neutral', children, className }) => <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONE[tone], className)}>{children}</span>;
export const StatusBadge = ({ status }) => (status ? <Badge tone={toneOf(status)}>{titleCase(status)}</Badge> : null);

export const Stat = ({ label, value, hint, tone, icon: Icon }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-medium text-muted">{label}</p><p className={cx('mt-1.5 text-2xl font-semibold tracking-tight', tone && `text-${tone}`)}>{value}</p>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
      {Icon && <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>}
    </div>
  </Card>
);
export const KeyValue = ({ items, cols = 2 }) => (
  <dl className={cx('grid gap-x-6 gap-y-3', cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
    {items.filter(Boolean).map(([k, v]) => (<div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-medium">{v ?? '-'}</dd></div>))}
  </dl>
);

/* ---------- Feedback ---------- */
export const Spinner = ({ className }) => <Loader2 className={cx('h-5 w-5 animate-spin text-primary', className)} aria-label="Loading" />;
export const Loading = ({ label = 'Đang tải…' }) => <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status"><Spinner />{label}</div>;
export const EmptyState = ({ title = 'Không có dữ liệu', hint, action }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-muted"><Inbox className="h-8 w-8" /><p className="font-medium text-fg">{title}</p>{hint && <p className="max-w-sm text-xs">{hint}</p>}{action}</div>
);
export const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center" role="alert"><AlertTriangle className="h-8 w-8 text-danger" /><p className="font-medium">{error?.message ?? 'Đã có lỗi xảy ra'}</p>{error?.status === 403 && <p className="text-xs text-muted">Bạn không có quyền xem nội dung này.</p>}{onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Thử lại</Button>}</div>
);
export const Alert = ({ tone = 'info', children, className }) => (
  <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-lg px-4 py-3 text-sm ring-1 ring-inset', TONE[tone], className)}>{children}</div>
);

/* ---------- Modal ---------- */
export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const W = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-fg/40 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('card w-full shadow-pop', W)}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-base">{title}</h2><button aria-label="Đóng" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2"><X className="h-4 w-4" /></button></div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

/* ---------- Tables ---------- */
export const DataTable = ({ columns, rows, loading, empty, onRowClick, rowKey = (r) => r.id }) => {
  if (loading && !rows?.length) return <Loading />;
  if (!rows?.length) return empty ?? <EmptyState />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line bg-surface2/60"><tr>{columns.map((c) => <th key={c.key} className={cx('th', c.align === 'right' && 'text-right')}>{c.header}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cx('transition', onRowClick && 'cursor-pointer hover:bg-surface2/70')}>
              {columns.map((c) => <td key={c.key} className={cx('td', c.align === 'right' && 'text-right tabular-nums', c.className)}>{c.render ? c.render(r) : r[c.key] ?? '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export const Pager = ({ meta, onPage }) => {
  if (!meta || meta.totalPages <= 1) return meta ? <p className="px-5 py-3 text-xs text-muted">{meta.total} kết quả</p> : null;
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
      <span>{meta.total} kết quả · trang {meta.page}/{meta.totalPages}</span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};
export const Tabs = ({ tabs, value, onChange }) => (
  <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
    {tabs.map((t) => (
      <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={cx('whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition', value === t.value ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg')}>{t.label}</button>
    ))}
  </div>
);
export const FilterBar = ({ children }) => <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">{children}</div>;
export const Money = ({ children }) => <span className="tabular-nums">{children}</span>;
