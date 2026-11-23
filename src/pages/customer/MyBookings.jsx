import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { Card, DataTable, EmptyState, ErrorState, FilterBar, Pager, PageHeader, SelectField, StatusBadge } from '../../components/ui/index.jsx';
import { useList, usePaging } from '../../hooks/index.js';
import { dateKey, money, titleCase } from '../../lib/format.js';

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'EXPIRED'];

/** Shared by customers (own bookings, /my/bookings) and staff (all bookings, /bookings): the API scopes the rows. */
export function BookingsTable({ basePath, staff }) {
  const navigate = useNavigate();
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('bookings', api.bookings.list, params);
  return (
    <Card>
      <FilterBar>
        <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        {staff && <>
          <label className="space-y-1.5 text-xs font-medium text-muted"><span>Nhận phòng từ</span><input type="date" className="input" value={params.from ?? ''} onChange={(e) => patch({ from: e.target.value || undefined })} /></label>
          <label className="space-y-1.5 text-xs font-medium text-muted"><span>đến</span><input type="date" className="input" value={params.to ?? ''} onChange={(e) => patch({ to: e.target.value || undefined })} /></label>
          <label className="space-y-1.5 text-xs font-medium text-muted"><span>Mã đặt phòng</span><input className="input" placeholder="BK-000123" value={params.search ?? ''} onChange={(e) => patch({ search: e.target.value || undefined })} /></label>
        </>}
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : (
        <DataTable loading={isLoading} rows={items} onRowClick={(b) => navigate(`${basePath}/${b.id}`)} empty={<EmptyState title="Chưa có đặt phòng nào" />} columns={[
          { key: 'code', header: 'Mã', render: (b) => <span className="font-medium">{b.bookingCode}</span> },
          { key: 'rooms', header: 'Phòng', render: (b) => b.rooms.map((r) => `${r.roomNumber} (${r.roomTypeName})`).join(', ') },
          { key: 'stay', header: 'Lưu trú', render: (b) => <span className="whitespace-nowrap">{dateKey(b.checkInDate)} → {dateKey(b.checkOutDate)} <span className="text-muted">· {b.nights} đêm</span></span> },
          { key: 'total', header: 'Tiền phòng', align: 'right', render: (b) => money(b.priceSnapshot?.roomTotalMinor, b.priceSnapshot?.currency) },
          { key: 'src', header: 'Nguồn', render: (b) => titleCase(b.source) },
          { key: 'st', header: 'Trạng thái', render: (b) => <StatusBadge status={b.status} /> },
        ]} />
      )}
      <Pager meta={meta} onPage={setPage} />
    </Card>
  );
}
export default function MyBookings() {
  return (<><PageHeader title="Đặt phòng của tôi" subtitle="Nhấn vào một đặt phòng để xem chi tiết, hủy hoặc đổi ngày." /><BookingsTable basePath="/my/bookings" /></>);
}
