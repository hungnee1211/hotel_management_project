import { useState } from 'react';
import { api } from '../../api/index.js';
import { BarsChart, DonutChart, LinesChart } from '../../components/charts.jsx';
import { Alert, Card, CardHeader, DataTable, EmptyState, ErrorState, KeyValue, Loading, PageHeader, SelectField, Stat, Tabs, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useOne } from '../../hooks/index.js';
import { minutes, money, pct, titleCase, todayKey } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const useReport = (name, fn, p) => useOne(['analytics', name, p], () => fn(p));
const thisYear = Number(todayKey().slice(0, 4));

function Overview({ p }) {
  const { data, isLoading, error, refetch } = useReport('overview', api.analytics.overview, p);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  const c = data.current; const d = data.changePercent;
  const hint = (v) => (v === null ? 'Chưa có kỳ trước để so sánh' : `${v > 0 ? '+' : ''}${v}% so với kỳ trước`);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Stat label="Doanh thu thuần" value={money(c.netRevenueMinor)} hint={hint(d.netRevenue)} /><Stat label="Giá trị hóa đơn phát hành" value={money(c.invoicedMinor)} hint={hint(d.invoiced)} /><Stat label="Thực thu (ròng hoàn tiền)" value={money(c.collectedMinor)} hint={hint(d.collected)} />
      <Stat label="Công suất phòng" value={pct(c.occupancyRatePercent)} /><Stat label="ADR (giá phòng TB)" value={money(c.adrMinor)} /><Stat label="RevPAR" value={money(c.revparMinor)} />
    </div>
  );
}
function Revenue({ p }) {
  const { data: r, isLoading, error, refetch } = useReport('revenue', api.analytics.revenue, p);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  const e = r.earned;
  return (
    <div className="space-y-6">
      <Alert tone="info">Doanh thu lấy từ sổ phí (mỗi giao dịch một lần), không cộng trùng từ đơn hàng hay yêu cầu dịch vụ. Mỗi chỉ số ghi rõ mốc thời gian.</Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Doanh thu phát sinh" subtitle={r.definitions.earned} /><div className="p-4"><DonutChart data={[{ name: 'Phòng', value: e.roomRevenueMinor }, { name: 'Ăn uống', value: e.fnbRevenueMinor }, { name: 'Dịch vụ', value: e.serviceRevenueMinor }, { name: 'Phụ thu', value: e.surchargeRevenueMinor }]} /></div><div className="border-t border-line p-5"><KeyValue items={[['Doanh thu thuần', <strong key="n">{money(e.netRevenueMinor)}</strong>], ['Giảm giá', money(e.discountsMinor)]]} /></div></Card>
        <Card><CardHeader title="Hóa đơn & tiền mặt" /><div className="space-y-5 p-5">
          <KeyValue items={[[`Hóa đơn phát hành (${r.invoiced.invoices})`, money(r.invoiced.totalMinor)], ['Thuế đã tính', money(r.invoiced.taxesMinor)], ['Phụ thu / phí dịch vụ', money(r.invoiced.surchargesMinor + r.invoiced.serviceChargeMinor)], ['Giảm giá', money(r.invoiced.discountsMinor)]]} /><div className="border-t border-line pt-5"><KeyValue items={[['Đã thu', money(r.cash.collectedMinor)], ['Đã hoàn', money(r.cash.refundsMinor)], ['Thực thu ròng', <strong key="c">{money(r.cash.netCollectedMinor)}</strong>], ['Còn phải thu (hiện tại)', money(r.outstanding.totalMinor)]]} /></div><div className="border-t border-line pt-5"><KeyValue items={[['Chi phí bảo trì', money(r.expenses.maintenanceMinor)], ['Số lần sửa chữa', r.expenses.repairs]]} /></div></div></Card>
      </div>
      <Card><CardHeader title="Định nghĩa các chỉ số" /><dl className="space-y-3 p-5 text-sm">{Object.entries(r.definitions).map(([k, v]) => <div key={k}><dt className="font-medium">{titleCase(k)}</dt><dd className="text-muted">{v}</dd></div>)}</dl></Card>
    </div>
  );
}
function Occupancy({ p }) {
  const { data: o, isLoading, error, refetch } = useReport('occupancy', api.analytics.occupancy, p);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Công suất" value={pct(o.occupancyRatePercent)} hint={`${o.soldNights}/${o.availableNights} đêm-phòng`} /><Stat label="ADR" value={money(o.adrMinor)} hint={`${o.billedRoomNights} đêm đã tính tiền`} /><Stat label="RevPAR" value={money(o.revparMinor)} /><Stat label="Doanh thu phòng" value={money(o.roomRevenueMinor)} /></div>
      <Card><CardHeader title="Tình trạng phòng hiện tại" subtitle={`${o.totalRooms} phòng · ${o.current.reservedTonight} phòng đã đặt tối nay`} /><div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">{[['Trống', o.current.available, 'success'], ['Có khách', o.current.occupied, 'accent'], ['Đang dọn', o.current.cleaning, 'warning'], ['Bảo trì / ngưng', o.current.maintenance, 'danger']].map(([l, v, t]) => <div key={l} className="rounded-lg bg-surface2 p-4"><p className="text-xs text-muted">{l}</p><p className={`text-2xl font-semibold text-${t}`}>{v}</p></div>)}</div></Card></div>
  );
}
function Fnb({ p }) {
  const { data: f, isLoading, error, refetch } = useReport('fnb', api.analytics.foodBeverage, p);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Tổng đơn" value={f.totalOrders} hint={`${f.deliveredOrders} đã giao`} /><Stat label="Doanh thu ăn uống" value={money(f.revenueMinor)} /><Stat label="Giá trị đơn TB" value={money(f.averageOrderValueMinor)} /><Stat label="Hủy / từ chối" value={`${f.cancelledOrders} / ${f.rejectedOrders}`} /></div>
      <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader title="Bán chạy" /><DataTable rowKey={(r) => r.item} rows={f.bestSelling} empty={<EmptyState title="Chưa có món bán ra" />} columns={[{ key: 'i', header: 'Món', render: (r) => r.item }, { key: 'q', header: 'SL', align: 'right', render: (r) => r.quantity }, { key: 'r', header: 'Doanh thu', align: 'right', render: (r) => money(r.revenueMinor) }]} /></Card>
        <Card><CardHeader title="Doanh thu theo nhóm món" /><div className="p-4"><DonutChart data={f.revenueByCategory.map((c) => ({ name: c.category, value: c.revenueMinor }))} /></div></Card></div></div>
  );
}
function StaffTab({ p }) {
  const { data: s, isLoading, error, refetch } = useReport('staff', api.analytics.staff, p);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Nhân viên" value={s.totalStaff} /><Stat label="Tỷ lệ đi làm" value={pct(s.attendanceRatePercent)} hint={`${s.present}/${s.scheduledShifts} ca`} /><Stat label="Đi trễ / vắng" value={`${s.late} / ${s.absent}`} /><Stat label="Giờ làm" value={minutes(s.workedMinutes)} /></div>
      <Card><CardHeader title="Theo bộ phận" /><DataTable rowKey={(r) => r.department} rows={s.byDepartment} empty={<EmptyState title="Chưa có ca trong kỳ" />} columns={[{ key: 'd', header: 'Bộ phận', render: (r) => titleCase(r.department) }, { key: 'sc', header: 'Ca', render: (r) => r.scheduledShifts }, { key: 'p', header: 'Có mặt', render: (r) => r.present }, { key: 'l', header: 'Trễ', render: (r) => r.late }, { key: 'a', header: 'Vắng', render: (r) => r.absent }, { key: 'w', header: 'Giờ làm', render: (r) => minutes(r.workedMinutes) }, { key: 'r', header: 'Tỷ lệ', align: 'right', render: (r) => pct(r.attendanceRatePercent) }]} /></Card></div>
  );
}
function MaintTab({ p }) {
  const { data: m, isLoading, error, refetch } = useReport('maintenance', api.analytics.maintenance, p);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Cơ sở / thiết bị" value={`${m.totalFacilities} / ${m.totalEquipment}`} /><Stat label="Đang bảo trì" value={m.underMaintenance} /><Stat label="Chi phí bảo trì" value={money(m.maintenanceCostMinor)} hint={`${m.repairs} lần sửa`} /><Stat label="Quá hạn bảo trì" value={m.overdueMaintenance} tone={m.overdueMaintenance ? 'danger' : undefined} /></div>
      <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader title="Thiết bị theo trạng thái" /><div className="p-4"><DonutChart format={(v) => v} data={Object.entries(m.equipmentByStatus).map(([k, v]) => ({ name: titleCase(k), value: v }))} /></div></Card>
        <Card><CardHeader title="Hay hỏng nhất" /><DataTable rowKey={(r) => r.equipmentId} rows={m.mostFrequentlyServiced} empty={<EmptyState title="Chưa có yêu cầu" />} columns={[{ key: 'n', header: 'Thiết bị', render: (r) => `${r.name} (${r.code})` }, { key: 'q', header: 'Số yêu cầu', align: 'right', render: (r) => r.requests }]} /></Card></div></div>
  );
}
function Monthly() {
  const [year, setYear] = useState(thisYear); const [cmp, setCmp] = useState('');
  const { data, isLoading, error, refetch } = useOne(['analytics', 'monthly', year, cmp], () => api.analytics.monthly({ year, compareYear: cmp || undefined }));
  return (
    <div className="space-y-6"><div className="flex flex-wrap gap-4"><TextField label="Năm" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /><TextField label="So sánh với năm" type="number" value={cmp} onChange={(e) => setCmp(e.target.value)} /></div>
      {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <Card><CardHeader title={`Doanh thu & thực thu ${year}`} /><div className="p-4"><BarsChart data={data.months} series={[{ key: 'netRevenueMinor', label: 'Doanh thu thuần', color: 'primary' }, { key: 'collectedMinor', label: 'Thực thu', color: 'accent' }]} /></div></Card>
          <Card><CardHeader title="Công suất phòng theo tháng" /><div className="p-4"><LinesChart data={data.months.map((m, i) => ({ month: m.month, [year]: m.occupancyRatePercent ?? 0, ...(data.compareMonths && { [data.compareYear]: data.compareMonths[i].occupancyRatePercent ?? 0 }) }))} series={[{ key: String(year), label: String(year), color: 'primary' }, ...(data.compareMonths ? [{ key: String(data.compareYear), label: String(data.compareYear), color: 'accent' }] : [])]} format={(v) => `${v}%`} /></div></Card>
          <Card><CardHeader title="Chi tiết theo tháng" /><DataTable rowKey={(r) => r.month} rows={data.months} columns={[{ key: 'm', header: 'Tháng', render: (r) => r.month }, { key: 'r', header: 'Phòng', align: 'right', render: (r) => money(r.roomRevenueMinor) }, { key: 'f', header: 'Ăn uống', align: 'right', render: (r) => money(r.fnbRevenueMinor) }, { key: 's', header: 'Dịch vụ', align: 'right', render: (r) => money(r.serviceRevenueMinor) }, { key: 'i', header: 'Hóa đơn', align: 'right', render: (r) => money(r.invoicedMinor) }, { key: 'c', header: 'Thực thu', align: 'right', render: (r) => money(r.collectedMinor) }, { key: 'x', header: 'Chi bảo trì', align: 'right', render: (r) => money(r.maintenanceExpenseMinor) }, { key: 'o', header: 'Công suất', align: 'right', render: (r) => pct(r.occupancyRatePercent) }]} /></Card>
        </>
      )}
    </div>
  );
}

export default function Analytics() {
  const { can } = useAuth();
  const fin = can({ any: [P.REPORT_FINANCIAL] }); const ops = can({ any: [P.REPORT_OPERATIONAL] });
  const tabs = [...(fin ? [{ value: 'overview', label: 'Tổng quan' }, { value: 'revenue', label: 'Doanh thu' }] : []), ...(ops ? [{ value: 'occupancy', label: 'Công suất phòng' }, { value: 'fnb', label: 'Ăn uống' }, { value: 'staff', label: 'Nhân sự' }, { value: 'maint', label: 'Bảo trì' }] : []), ...(fin ? [{ value: 'monthly', label: 'Theo tháng' }] : [])];
  const [tab, setTab] = useState(tabs[0]?.value);
  const [mode, setMode] = useState('month'); const [year, setYear] = useState(thisYear); const [month, setMonth] = useState(Number(todayKey().slice(5, 7))); const [quarter, setQuarter] = useState(Math.ceil(Number(todayKey().slice(5, 7)) / 3));
  const [from, setFrom] = useState(todayKey(-30)); const [to, setTo] = useState(todayKey());
  const p = mode === 'custom' ? { from, to } : mode === 'year' ? { period: 'year', year } : mode === 'quarter' ? { period: 'quarter', year, quarter } : { period: 'month', year, month };
  return (
    <>
      <PageHeader title="Báo cáo & phân tích" subtitle="Múi giờ và ranh giới tháng theo khách sạn." />
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
      {tab !== 'monthly' && (
        <Card className="mb-6"><div className="flex flex-wrap items-end gap-4 p-4">
          <SelectField label="Kỳ báo cáo" value={mode} onChange={(e) => setMode(e.target.value)}><option value="month">Tháng</option><option value="quarter">Quý</option><option value="year">Năm</option><option value="custom">Tuỳ chọn</option></SelectField>
          {mode !== 'custom' && <TextField label="Năm" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />}
          {mode === 'month' && <SelectField label="Tháng" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</SelectField>}
          {mode === 'quarter' && <SelectField label="Quý" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}</SelectField>}
          {mode === 'custom' && <><TextField label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><TextField label="Đến ngày (gồm cả ngày này)" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>}
        </div></Card>
      )}
      {tab === 'overview' && <Overview p={p} />}{tab === 'revenue' && <Revenue p={p} />}{tab === 'occupancy' && <Occupancy p={p} />}{tab === 'fnb' && <Fnb p={p} />}{tab === 'staff' && <StaffTab p={p} />}{tab === 'maint' && <MaintTab p={p} />}{tab === 'monthly' && <Monthly />}
    </>
  );
}
