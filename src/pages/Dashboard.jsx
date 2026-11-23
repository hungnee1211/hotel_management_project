import { BedDouble, CalendarCheck, CookingPot, Hotel, LogIn, LogOut, Receipt, Users, Wallet, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { BarsChart, DonutChart } from '../components/charts.jsx';
import { Card, CardHeader, EmptyState, ErrorState, Loading, PageHeader, Stat, StatusBadge } from '../components/ui/index.jsx';
import { useAuth } from '../context/auth.jsx';
import { useOne } from '../hooks/index.js';
import { dateKey, dateTime, money, pct, titleCase } from '../lib/format.js';

const sumObj = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0);

function AdminView({ d }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={`Doanh thu thuần (${d.month})`} value={money(d.revenue.netRevenueMinor)} icon={Receipt} hint="Chưa gồm thuế" />
        <Stat label="Đã thu (ròng)" value={money(d.revenue.collectedMinor)} icon={Wallet} hint={`Còn phải thu: ${money(d.revenue.outstandingMinor)}`} />
        <Stat label="Công suất phòng" value={pct(d.occupancy.ratePercent)} icon={BedDouble} hint={`${d.occupancy.current.occupied}/${d.occupancy.current.total} phòng đang có khách`} />
        <Stat label="Đặt phòng trong tháng" value={d.bookings.total} icon={CalendarCheck} hint={`${d.totalCustomers} khách · ${d.totalStaff} nhân viên`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader title="Doanh thu theo tháng" subtitle="Doanh thu thuần so với tiền thực thu" /><div className="p-4"><BarsChart data={d.charts.monthlyRevenue} series={[{ key: 'netRevenueMinor', label: 'Doanh thu thuần', color: 'primary' }, { key: 'collectedMinor', label: 'Thực thu', color: 'accent' }]} /></div></Card>
        <Card><CardHeader title="Doanh thu theo loại" subtitle={d.month} /><div className="p-4"><DonutChart data={d.charts.revenueByCategory.map((r) => ({ name: titleCase(r.category), value: r.amountMinor }))} /></div></Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Hoạt động gần đây" actions={<Link to="/audit-logs" className="link text-xs">Xem nhật ký</Link>} />
        <ul className="divide-y divide-line">{d.recentActivity.length ? d.recentActivity.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5"><span className="font-mono text-xs">{a.action}</span><span className="text-xs text-muted">{a.resourceType} · {dateTime(a.createdAt)}</span></li>) : <EmptyState />}</ul>
      </Card>
    </>
  );
}

function ManagerView({ d }) {
  const att = d.staffAttendanceToday ?? {};
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Khách nhận phòng hôm nay" value={d.todaysCheckIns} icon={LogIn} />
        <Stat label="Khách trả phòng hôm nay" value={d.todaysCheckOuts} icon={LogOut} />
        <Stat label="Đặt phòng chờ xác nhận" value={d.pendingReservations} icon={CalendarCheck} />
        <Stat label="Đơn món đang xử lý" value={sumObj(d.foodOrdersInProgress)} icon={CookingPot} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card><CardHeader title="Phòng hiện tại" /><div className="grid grid-cols-2 gap-3 p-5 text-sm">{[['Trống', d.currentOccupancy.available, 'success'], ['Có khách', d.currentOccupancy.occupied, 'accent'], ['Đang dọn', d.currentOccupancy.cleaning, 'warning'], ['Bảo trì', d.currentOccupancy.maintenance, 'danger']].map(([l, v, t]) => <div key={l} className="rounded-lg bg-surface2 p-3"><p className="text-xs text-muted">{l}</p><p className={`text-xl font-semibold text-${t}`}>{v}</p></div>)}</div></Card>
        <Card><CardHeader title="Chấm công hôm nay" /><div className="space-y-2 p-5 text-sm">{Object.keys(att).length ? Object.entries(att).map(([k, v]) => <div key={k} className="flex items-center justify-between"><StatusBadge status={k} /><span className="font-semibold">{v}</span></div>) : <p className="text-muted">Chưa có ai chấm công.</p>}</div></Card>
        <Card><CardHeader title="Buồng phòng đang mở" /><div className="space-y-2 p-5 text-sm">{Object.keys(d.housekeepingTasks ?? {}).length ? Object.entries(d.housekeepingTasks).map(([k, v]) => <div key={k} className="flex items-center justify-between"><StatusBadge status={k} /><span className="font-semibold">{v}</span></div>) : <p className="text-muted">Không có việc tồn đọng.</p>}</div></Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Cảnh báo bảo trì" subtitle={d.maintenanceAlerts.overdueScheduled ? `${d.maintenanceAlerts.overdueScheduled} việc định kỳ quá hạn` : undefined} actions={<Link to="/maintenance" className="link text-xs">Xem tất cả</Link>} />
          {d.maintenanceAlerts.urgentOpen.length ? <ul className="divide-y divide-line">{d.maintenanceAlerts.urgentOpen.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-warning" />{m.title}</span><span className="flex gap-2"><StatusBadge status={m.priority} /><StatusBadge status={m.status} /></span></li>)}</ul> : <EmptyState title="Không có cảnh báo" />}</Card>
        <Card><CardHeader title="Tóm tắt tài chính" subtitle={d.financialSummary.month} /><div className="grid gap-3 p-5 sm:grid-cols-3">{[['Doanh thu thuần', d.financialSummary.netRevenueMinor], ['Đã thu', d.financialSummary.collectedMinor], ['Còn phải thu', d.financialSummary.outstandingMinor]].map(([l, v]) => <div key={l}><p className="text-xs text-muted">{l}</p><p className="mt-1 font-semibold">{money(v)}</p></div>)}</div></Card>
      </div>
    </>
  );
}

function StaffView({ d }) {
  const t = d.assignedTasks;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ca làm hiện tại" value={d.currentShift ? `${d.currentShift.startTime}–${d.currentShift.endTime}` : 'Không có ca'} icon={CalendarCheck} hint={d.currentShift?.date} />
        <Stat label="Chấm công" value={d.attendance.checkedIn ? 'Đang trong ca' : 'Chưa vào ca'} tone={d.attendance.checkedIn ? 'success' : undefined} icon={LogIn} hint={d.attendance.since ? `Từ ${dateTime(d.attendance.since)}` : undefined} />
        <Stat label="Khách đến hôm nay" value={d.arrivalsToday} icon={Hotel} />
        <Stat label="Đơn món chờ xử lý" value={d.pendingOrders} icon={CookingPot} />
      </div>
      <Card className="mt-6"><CardHeader title="Việc được giao" /><div className="grid gap-3 p-5 sm:grid-cols-3">{[['Buồng phòng', t.housekeeping, '/housekeeping'], ['Bảo trì', t.maintenance, '/maintenance'], ['Yêu cầu dịch vụ', t.serviceRequests, '/service-requests']].map(([l, v, to]) => <Link key={l} to={to} className="rounded-lg bg-surface2 p-4 transition hover:bg-surface2/70"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-semibold">{v}</p></Link>)}</div></Card>
      {d.unreadNotifications > 0 && <p className="mt-4 text-sm text-muted">Bạn có <Link className="link" to="/notifications">{d.unreadNotifications} thông báo chưa đọc</Link>.</p>}
    </>
  );
}

function CustomerView({ d }) {
  const b = d.currentBooking;
  return (
    <>
      {b ? (
        <Card className="mb-6 border-primary/40 bg-primary/5"><div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-xs font-medium text-primary">Bạn đang lưu trú</p><h2 className="mt-1 text-xl">{b.bookingCode} · {b.rooms.map((r) => `Phòng ${r.roomNumber}`).join(', ')}</h2><p className="mt-1 text-sm text-muted">{dateKey(b.checkInDate)} → {dateKey(b.checkOutDate)}</p></div><div className="flex gap-2"><Link to="/room-service" className="link">Gọi món</Link><Link to="/services" className="link">Dịch vụ</Link><Link to={`/my/bookings/${b.id}`} className="link">Chi tiết</Link></div></div></Card>
      ) : (
        <Card className="mb-6"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-base">Sẵn sàng cho chuyến đi tiếp theo?</h2><p className="text-sm text-muted">Tìm phòng trống theo ngày và đặt ngay.</p></div><Link to="/book" className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg">Tìm phòng</Link></div></Card>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Cần thanh toán" value={money(d.outstandingTotalMinor)} tone={d.outstandingTotalMinor ? 'warning' : undefined} icon={Wallet} hint={`${d.outstandingInvoices.length} hóa đơn`} />
        <Stat label="Đặt phòng sắp tới" value={d.upcomingBookings.length} icon={CalendarCheck} />
        <Stat label="Lịch sử đặt phòng" value={d.bookingHistoryCount} icon={Users} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Đặt phòng sắp tới" actions={<Link to="/my/bookings" className="link text-xs">Tất cả</Link>} />{d.upcomingBookings.length ? <ul className="divide-y divide-line">{d.upcomingBookings.map((x) => <li key={x.id}><Link to={`/my/bookings/${x.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface2/60"><span><span className="font-medium">{x.bookingCode}</span><span className="block text-xs text-muted">{dateKey(x.checkInDate)} → {dateKey(x.checkOutDate)}</span></span><StatusBadge status={x.status} /></Link></li>)}</ul> : <EmptyState title="Chưa có đặt phòng" />}</Card>
        <Card><CardHeader title="Đơn gọi món gần đây" />{d.recentOrders.length ? <ul className="divide-y divide-line">{d.recentOrders.map((o) => <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3"><span><span className="font-medium">{o.orderCode}</span><span className="block text-xs text-muted">{money(o.subtotalMinor)}</span></span><StatusBadge status={o.status} /></li>)}</ul> : <EmptyState title="Chưa có đơn nào" />}</Card>
        <Card><CardHeader title="Hóa đơn chưa thanh toán" actions={<Link to="/my/invoices" className="link text-xs">Tất cả</Link>} />{d.outstandingInvoices.length ? <ul className="divide-y divide-line">{d.outstandingInvoices.map((i) => <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="font-medium">{i.invoiceNumber}</span><span className="flex items-center gap-3"><span className="font-semibold tabular-nums">{money(i.outstandingMinor)}</span><StatusBadge status={i.status} /></span></li>)}</ul> : <EmptyState title="Bạn không có khoản nào cần thanh toán" />}</Card>
        <Card><CardHeader title="Thanh toán gần đây" />{d.recentPayments.length ? <ul className="divide-y divide-line">{d.recentPayments.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="text-xs text-muted">{dateTime(p.paidAt ?? p.createdAt)} · {titleCase(p.method)}</span><span className="flex items-center gap-3"><span className="tabular-nums">{money(p.amountMinor)}</span><StatusBadge status={p.status} /></span></li>)}</ul> : <EmptyState title="Chưa có thanh toán" />}</Card>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useOne(['dashboard'], () => api.dashboard.get(), true, { refetchInterval: 60_000 });
  const View = { ADMIN: AdminView, MANAGER: ManagerView, STAFF: StaffView, CUSTOMER: CustomerView }[user.role];
  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} subtitle={data ? `${titleCase(user.role)} · hôm nay ${dateKey(data.today)}` : undefined} />
      {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : <View d={data} />}
    </>
  );
}
