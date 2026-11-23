import { Check, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/index.js';
import { GuestFormModal } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, DataTable, EmptyState, Loading, PageHeader, SelectField, TextField, TextareaField, cx } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList } from '../../hooks/index.js';
import { dateKey, money, todayKey } from '../../lib/format.js';

/** Front-desk booking: search availability -> pick rooms -> pick or create guests -> create. */
export default function NewBooking() {
  const navigate = useNavigate(); const { role } = useAuth();
  const f = useForm({ checkIn: todayKey(0), checkOut: todayKey(1), adults: 2, children: 0, roomTypeId: '', source: 'RECEPTION', requests: '' });
  const [search, setSearch] = useState(null); const [picked, setPicked] = useState({});
  const [guests, setGuests] = useState([]); const [q, setQ] = useState(''); const [guestModal, setGuestModal] = useState(false);
  const [custQ, setCustQ] = useState(''); const [customer, setCustomer] = useState(null);
  const types = useList('room-types', api.roomTypes.list, { limit: 50 });
  const found = useList('guests', api.guests.list, { search: q || undefined, limit: 8 }, { enabled: q.length >= 2 });
  const customers = useList('users', api.users.list, { role: 'CUSTOMER', search: custQ, limit: 6 }, { enabled: role === 'ADMIN' && custQ.length >= 2 });
  const results = useQuery({ queryKey: ['availability', search], queryFn: () => api.rooms.availability(search), enabled: Boolean(search), retry: false });
  const create = useAction(api.bookings.create, { invalidate: ['bookings', 'availability', 'dashboard'], success: 'Đã tạo đặt phòng', onSuccess: (r) => navigate(`/bookings/${r.data.id}`) });

  const items = results.data?.data?.items ?? []; const selected = items.filter((i) => picked[i.room.id]);
  const total = selected.reduce((a, i) => a + i.totalMinor, 0); const party = (search?.adults ?? 0) + (search?.children ?? 0);
  const onSearch = (e) => { e.preventDefault(); setPicked({}); const v = f.values; setSearch({ checkIn: v.checkIn, checkOut: v.checkOut, adults: Number(v.adults), children: Number(v.children), roomTypeId: v.roomTypeId || undefined }); };

  return (
    <>
      <PageHeader title="Đặt phòng mới" subtitle="Dành cho khách tại quầy hoặc đặt qua điện thoại." />
      <Card className="mb-6"><form onSubmit={onSearch} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5" noValidate>
        <TextField label="Nhận phòng" type="date" min={todayKey()} {...f.bind('checkIn')} /><TextField label="Trả phòng" type="date" min={f.values.checkIn} {...f.bind('checkOut')} />
        <TextField label="Người lớn" type="number" min={1} {...f.bind('adults')} /><TextField label="Trẻ em" type="number" min={0} {...f.bind('children')} />
        <SelectField label="Loại phòng" {...f.bind('roomTypeId')}><option value="">Tất cả</option>{types.items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</SelectField>
        <div className="sm:col-span-2 lg:col-span-5"><Button type="submit" icon={Search} loading={results.isFetching}>Tìm phòng trống</Button></div></form></Card>

      {results.isLoading ? <Loading /> : search && (
        <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
          <Card><CardHeader title={`${items.length} phòng trống`} subtitle={`${dateKey(search.checkIn)} → ${dateKey(search.checkOut)}`} />
            <DataTable rowKey={(r) => r.room.id} rows={items} empty={<EmptyState title="Không còn phòng phù hợp" />} onRowClick={(r) => setPicked((p) => ({ ...p, [r.room.id]: !p[r.room.id] }))} columns={[
              { key: 'p', header: '', render: (r) => <span className={cx('flex h-5 w-5 items-center justify-center rounded border', picked[r.room.id] ? 'border-primary bg-primary text-primary-fg' : 'border-line')}>{picked[r.room.id] && <Check className="h-3.5 w-3.5" />}</span> },
              { key: 'n', header: 'Phòng', render: (r) => <span className="font-medium">{r.room.roomNumber}<span className="ml-2 text-xs font-normal text-muted">tầng {r.room.floor}</span></span> },
              { key: 't', header: 'Loại', render: (r) => <span>{r.roomType.name} <Badge>{r.roomType.capacity} khách</Badge></span> },
              { key: 'a', header: 'TB/đêm', align: 'right', render: (r) => money(r.averageNightlyMinor) },
              { key: 'x', header: 'Tổng', align: 'right', render: (r) => money(r.totalMinor) },
            ]} /></Card>
          <Card className="h-fit"><CardHeader title="Khách & xác nhận" /><div className="space-y-4 p-5">
            {role === 'ADMIN' && <div className="space-y-2"><TextField label="Gắn tài khoản khách (tuỳ chọn)" placeholder="Tìm theo tên/email…" value={custQ} onChange={(e) => setCustQ(e.target.value)} />{customer ? <div className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm"><span>{customer.fullName}</span><button className="link text-xs" onClick={() => setCustomer(null)}>Bỏ</button></div> : customers.items.map((c) => <button key={c.id} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-surface2" onClick={() => { setCustomer(c); setCustQ(''); }}>{c.fullName} <span className="text-xs text-muted">{c.email ?? c.phone}</span></button>)}</div>}
            <div className="space-y-2"><TextField label="Tìm khách đã có" placeholder="Tên, SĐT, email…" value={q} onChange={(e) => setQ(e.target.value)} />
              {found.items.filter((g) => !guests.some((x) => x.id === g.id)).map((g) => <button key={g.id} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-surface2" onClick={() => { setGuests((l) => [...l, g]); setQ(''); }}>{g.fullName} <span className="text-xs text-muted">{g.phone ?? g.email} {g.identification?.maskedNumber}</span></button>)}
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => setGuestModal(true)}>Thêm khách mới</Button></div>
            {guests.length > 0 && <ul className="space-y-1.5">{guests.map((g, i) => <li key={g.id} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-1.5 text-sm"><span>{g.fullName}{i === 0 && <Badge tone="primary" className="ml-2">Khách chính</Badge>}</span><button className="text-xs text-danger" onClick={() => setGuests((l) => l.filter((x) => x.id !== g.id))}>Xóa</button></li>)}</ul>}
            <SelectField label="Nguồn" {...f.bind('source')}><option value="RECEPTION">Quầy lễ tân</option><option value="PHONE">Điện thoại</option><option value="EXTERNAL">Kênh ngoài</option></SelectField>
            <TextareaField label="Yêu cầu đặc biệt" rows={2} {...f.bind('requests')} />
            {create.error && <Alert tone="danger">{create.error.code === 'ROOM_UNAVAILABLE' ? 'Một phòng vừa được đặt. Hãy tìm lại.' : create.error.message}</Alert>}
            <div className="border-t border-line pt-4"><p className="mb-3 flex justify-between text-sm"><span>{selected.length} phòng · {party} khách</span><strong>{money(total)}</strong></p>
              <Button className="w-full" disabled={!selected.length || !guests.length} loading={create.loading} onClick={() => create.run({ rooms: selected.map((i) => i.room.id), checkInDate: search.checkIn, checkOutDate: search.checkOut, adults: search.adults, children: search.children, guestIds: guests.map((g) => g.id), source: f.values.source, ...(customer && { customerId: customer.id }), ...(f.values.requests && { specialRequests: f.values.requests }) })}>Tạo đặt phòng</Button>
              {!guests.length && selected.length > 0 && <p className="mt-2 text-xs text-muted">Cần ít nhất một khách.</p>}</div>
          </div></Card>
        </div>
      )}
      <GuestFormModal open={guestModal} onClose={() => setGuestModal(false)} onSaved={(g) => setGuests((l) => [...l, g])} />
    </>
  );
}
