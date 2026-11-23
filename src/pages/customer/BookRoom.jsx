import { BedDouble, Check, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/index.js';
import { Alert, Badge, Button, Card, Checkbox, EmptyState, ErrorState, Loading, Modal, PageHeader, SelectField, TextField, TextareaField, cx } from '../../components/ui/index.jsx';
import { useAction, useForm, useList } from '../../hooks/index.js';
import { dateKey, money, todayKey } from '../../lib/format.js';

export default function BookRoom() {
  const navigate = useNavigate();
  const f = useForm({ checkIn: todayKey(1), checkOut: todayKey(3), adults: 2, children: 0, roomTypeId: '', amenities: '', maxPrice: '' });
  const [search, setSearch] = useState(null);
  const [picked, setPicked] = useState({});
  const [open, setOpen] = useState(false);
  const [guestIds, setGuestIds] = useState([]);
  const [requests, setRequests] = useState('');
  const types = useList('room-types', api.roomTypes.list, { limit: 50 });
  const guests = useList('guests', api.guests.list, { limit: 50 });

  const results = useQuery({ queryKey: ['availability', search], queryFn: () => api.rooms.availability(search), enabled: Boolean(search), retry: false });
  const create = useAction(api.bookings.create, { invalidate: ['bookings', 'dashboard', 'availability'], success: 'Đặt phòng thành công', onSuccess: (r) => navigate(`/my/bookings/${r.data.id}`) });

  const submit = (e) => {
    e.preventDefault(); setPicked({});
    const v = f.values;
    setSearch({ checkIn: v.checkIn, checkOut: v.checkOut, adults: Number(v.adults), children: Number(v.children), roomTypeId: v.roomTypeId || undefined, amenities: v.amenities.split(',').map((s) => s.trim()).filter(Boolean), maxPrice: v.maxPrice ? Number(v.maxPrice) : undefined });
  };
  const items = results.data?.data?.items ?? [];
  const selected = items.filter((i) => picked[i.room.id]);
  const total = selected.reduce((a, i) => a + i.totalMinor, 0);
  const capacity = selected.reduce((a, i) => a + i.roomType.capacity, 0);
  const party = (search?.adults ?? 0) + (search?.children ?? 0);

  return (
    <>
      <PageHeader title="Tìm & đặt phòng" subtitle="Giá hiển thị theo từng đêm; trả phòng tính đến sáng ngày trả." />
      <Card className="mb-6">
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" noValidate>
          <TextField label="Nhận phòng" type="date" min={todayKey()} required {...f.bind('checkIn')} />
          <TextField label="Trả phòng" type="date" min={f.values.checkIn} required {...f.bind('checkOut')} />
          <TextField label="Người lớn" type="number" min={1} max={20} {...f.bind('adults')} />
          <TextField label="Trẻ em" type="number" min={0} max={20} {...f.bind('children')} />
          <SelectField label="Loại phòng" {...f.bind('roomTypeId')}><option value="">Tất cả</option>{types.items.map((t) => <option key={t.id} value={t.id}>{t.name} (tối đa {t.capacity})</option>)}</SelectField>
          <TextField label="Tiện nghi (cách nhau bởi dấu phẩy)" placeholder="wifi, balcony" {...f.bind('amenities')} />
          <TextField label="Giá tối đa / đêm" type="number" min={0} {...f.bind('maxPrice')} />
          <div className="flex items-end"><Button type="submit" className="w-full" loading={results.isFetching}>Tìm phòng trống</Button></div>
        </form>
      </Card>

      {results.isLoading ? <Loading label="Đang tìm phòng trống…" /> : results.error ? <ErrorState error={results.error} /> : search && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{items.length} phòng trống · {dateKey(search.checkIn)} → {dateKey(search.checkOut)} ({results.data.data.nights} đêm)</p>
            {selected.length > 0 && <div className="flex items-center gap-3"><span className="text-sm">{selected.length} phòng · <strong>{money(total)}</strong></span><Button onClick={() => setOpen(true)} icon={Check}>Đặt {selected.length} phòng</Button></div>}
          </div>
          {selected.length > 0 && capacity < party && <Alert tone="warning" className="mb-4">Các phòng đã chọn chứa tối đa {capacity} người, trong khi đoàn của bạn có {party} người. Hãy chọn thêm phòng.</Alert>}
          {items.length === 0 ? <Card><EmptyState title="Không còn phòng phù hợp" hint="Thử đổi ngày, giảm số khách hoặc bỏ bớt bộ lọc." /></Card> : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((i) => {
                const on = Boolean(picked[i.room.id]);
                return (
                  <Card key={i.room.id} className={cx('flex flex-col p-5 transition', on && 'ring-2 ring-primary')}>
                    <div className="flex items-start justify-between gap-3"><div><h3 className="text-base">{i.roomType.name}</h3><p className="text-xs text-muted">Phòng {i.room.roomNumber} · tầng {i.room.floor}</p></div><Badge tone="primary"><Users className="mr-1 h-3 w-3" />{i.roomType.capacity}</Badge></div>
                    {i.roomType.bedConfiguration && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><BedDouble className="h-3.5 w-3.5" />{i.roomType.bedConfiguration}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">{i.room.amenities.slice(0, 6).map((a) => <Badge key={a}>{a}</Badge>)}</div>
                    <div className="mt-4 flex-1 text-xs text-muted">{i.nightly.slice(0, 4).map((n) => <div key={n.date} className="flex justify-between"><span>{dateKey(n.date)}</span><span className="tabular-nums">{money(n.priceMinor)}</span></div>)}{i.nightly.length > 4 && <div>… và {i.nightly.length - 4} đêm nữa</div>}</div>
                    <div className="mt-4 flex items-end justify-between border-t border-line pt-4"><div><p className="text-xs text-muted">Tổng {i.nights} đêm</p><p className="text-lg font-semibold tabular-nums">{money(i.totalMinor)}</p><p className="text-xs text-muted">TB {money(i.averageNightlyMinor)}/đêm</p></div><Button variant={on ? 'primary' : 'secondary'} size="sm" onClick={() => setPicked((p) => ({ ...p, [i.room.id]: !p[i.room.id] }))}>{on ? 'Đã chọn' : 'Chọn'}</Button></div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Xác nhận đặt phòng" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Quay lại</Button><Button loading={create.loading} onClick={() => create.run({ rooms: selected.map((i) => i.room.id), checkInDate: search.checkIn, checkOutDate: search.checkOut, adults: search.adults, children: search.children, ...(guestIds.length && { guestIds }), ...(requests && { specialRequests: requests }) })}>Đặt phòng · {money(total)}</Button></>}>
        <div className="space-y-4">
          {create.error && <Alert tone="danger">{create.error.code === 'ROOM_UNAVAILABLE' ? 'Rất tiếc, một phòng vừa được người khác đặt. Hãy tìm lại.' : create.error.message}</Alert>}
          <ul className="space-y-1 text-sm">{selected.map((i) => <li key={i.room.id} className="flex justify-between"><span>{i.roomType.name} · phòng {i.room.roomNumber}</span><span className="tabular-nums">{money(i.totalMinor)}</span></li>)}</ul>
          <p className="text-xs text-muted">{dateKey(search?.checkIn)} → {dateKey(search?.checkOut)} · {party} khách. Thuế được tính trên hóa đơn khi trả phòng.</p>
          {guests.items.length > 0 && <fieldset><legend className="mb-2 text-xs font-medium text-muted">Khách lưu trú (tuỳ chọn, cần có trước khi nhận phòng)</legend><div className="space-y-1.5">{guests.items.map((g) => <Checkbox key={g.id} checked={guestIds.includes(g.id)} onChange={(e) => setGuestIds((l) => (e.target.checked ? [...l, g.id] : l.filter((x) => x !== g.id)))} label={`${g.fullName}${g.identification ? ` · ${g.identification.maskedNumber}` : ''}`} />)}</div></fieldset>}
          <TextareaField label="Yêu cầu đặc biệt" value={requests} onChange={(e) => setRequests(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
