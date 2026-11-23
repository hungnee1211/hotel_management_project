const EXPONENTS = { VND: 0, JPY: 0, KRW: 0, USD: 2, EUR: 2, GBP: 2, SGD: 2, THB: 2 };
export const DEFAULT_CURRENCY = import.meta.env?.VITE_DEFAULT_CURRENCY ?? 'VND';
export const HOTEL_TZ = import.meta.env?.VITE_HOTEL_TZ ?? 'Asia/Ho_Chi_Minh';
export const exponent = (cur = DEFAULT_CURRENCY) => EXPONENTS[cur] ?? 2;

/** Backend money is an integer in minor units. Display only: never do arithmetic on the formatted result. */
export const money = (minor, cur = DEFAULT_CURRENCY) => {
  if (minor === null || minor === undefined || Number.isNaN(minor)) return '-';
  const e = exponent(cur);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: cur, minimumFractionDigits: e, maximumFractionDigits: e }).format(minor / 10 ** e);
};

/** User input ("150000" or "12.34") -> integer minor units, or null if not a valid amount for the currency. */
export const toMinor = (input, cur = DEFAULT_CURRENCY) => {
  const s = String(input ?? '').trim().replace(/[\s,]/g, '');
  const e = exponent(cur);
  if (!new RegExp(`^\\d+(\\.\\d{1,${Math.max(e, 1)}})?$`).test(s) || (e === 0 && s.includes('.'))) return null;
  const [w, f = ''] = s.split('.');
  return Number(w) * 10 ** e + Number(f.padEnd(e, '0') || 0);
};
export const fromMinor = (minor, cur = DEFAULT_CURRENCY) => (minor === null || minor === undefined ? '' : String(minor / 10 ** exponent(cur)));

/** Stay dates are hotel-local YYYY-MM-DD keys: shown as-is, never converted through Date. */
export const dateKey = (k) => (k ? `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}` : '-');
export const dateTime = (iso) => (iso ? new Intl.DateTimeFormat('vi-VN', { timeZone: HOTEL_TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '-');
export const todayKey = (offset = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: HOTEL_TZ }).format(new Date(Date.now() + offset * 86_400_000));
export const hhmm = (iso) => (iso ? new Intl.DateTimeFormat('en-GB', { timeZone: HOTEL_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '-');
export const titleCase = (s = '') => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`);
export const minutes = (m) => `${Math.floor((m ?? 0) / 60)}h ${String((m ?? 0) % 60).padStart(2, '0')}m`;
export const uuid = () => (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
