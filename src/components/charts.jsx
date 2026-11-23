import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeColors } from '../context/theme.jsx';
import { money } from '../lib/format.js';

const compact = (v) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const axis = (c) => ({ stroke: c.border, tick: { fill: c.muted, fontSize: 11 }, tickLine: false });
const tip = (c) => ({ contentStyle: { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, color: c.text, fontSize: 12 }, labelStyle: { color: c.text }, itemStyle: { color: c.text }, cursor: { fill: c.border, fillOpacity: 0.35 } });

/** Grouped bars (e.g. net revenue vs cash collected per month). series = [{ key, label, color: 'primary'|'accent'|... }]. */
export function BarsChart({ data, xKey = 'month', series, height = 280, format = money }) {
  const c = useThemeColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} {...axis(c)} tickFormatter={(v) => String(v).slice(5) || v} />
        <YAxis {...axis(c)} tickFormatter={compact} width={52} />
        <Tooltip {...tip(c)} formatter={(v, n) => [format(v), n]} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
        {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={c[s.color ?? 'primary']} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
export function LinesChart({ data, xKey = 'month', series, height = 260, format = (v) => v }) {
  const c = useThemeColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} {...axis(c)} tickFormatter={(v) => String(v).slice(5) || v} />
        <YAxis {...axis(c)} width={44} />
        <Tooltip {...tip(c)} formatter={(v, n) => [format(v), n]} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
        {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={c[s.color ?? 'primary']} strokeWidth={2} dot={false} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}
const SLICES = ['primary', 'accent', 'info', 'success', 'warning', 'danger'];
export function DonutChart({ data, nameKey = 'name', valueKey = 'value', height = 240, format = money }) {
  const c = useThemeColors();
  const rows = data.filter((d) => d[valueKey] > 0);
  if (!rows.length) return <p className="py-10 text-center text-sm text-muted">Chưa có dữ liệu trong kỳ</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={rows} dataKey={valueKey} nameKey={nameKey} innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke={c.surface}>
          {rows.map((r, i) => <Cell key={r[nameKey]} fill={c[SLICES[i % SLICES.length]]} />)}
        </Pie>
        <Tooltip {...tip(c)} formatter={(v, n) => [format(v), n]} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
