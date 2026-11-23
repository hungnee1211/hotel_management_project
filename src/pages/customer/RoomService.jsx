import { Minus, Plus, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { PromptDialog } from '../../components/domain.jsx';
import { Alert, Button, Card, CardHeader, DataTable, EmptyState, ErrorState, Loading, PageHeader, SelectField, StatusBadge, TextareaField } from '../../components/ui/index.jsx';
import { useAction, useList, useOne } from '../../hooks/index.js';
import { dateTime, money, titleCase } from '../../lib/format.js';

const STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'];

export default function RoomService() {
  const stays = useList('bookings', api.bookings.list, { status: 'CHECKED_IN', limit: 5 });
  const menu = useOne(['menu', 'available'], () => api.menu.get({ available: true }));
  const orders = useList('orders', api.orders.list, { limit: 10, sortBy: 'createdAt', order: 'desc' }, { refetchInterval: 15_000 });
  const [cart, setCart] = useState({});
  const [bookingId, setBookingId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [payment, setPayment] = useState('ROOM_CHARGE');
  const [notes, setNotes] = useState('');
  const [cancelId, setCancelId] = useState(null);

  const place = useAction(api.orders.create, { invalidate: ['orders', 'dashboard'], success: 'Đã gửi đơn. Nhà hàng sẽ xác nhận sớm.', onSuccess: () => { setCart({}); setNotes(''); } });
  const cancel = useAction(api.orders.cancel, { invalidate: ['orders'], success: 'Đã hủy đơn', onSuccess: () => setCancelId(null) });
  const complete = useAction(api.orders.complete, { invalidate: ['orders'], success: 'Cảm ơn bạn!' });

  const stay = stays.items.find((s) => s.id === bookingId) ?? stays.items[0];
  const lines = Object.values(cart);
  const subtotal = lines.reduce((a, l) => a + l.item.priceMinor * l.qty, 0);
  const setQty = (item, d) => setCart((c) => { const q = (c[item.id]?.qty ?? 0) + d; const n = { ...c }; if (q <= 0) delete n[item.id]; else n[item.id] = { item, qty: Math.min(q, 50) }; return n; });

  if (stays.isLoading || menu.isLoading) return <Loading />;
  if (!stay) return (<><PageHeader title="Gọi món tại phòng" /><Card><EmptyState title="Bạn chưa nhận phòng" hint="Dịch vụ gọi món chỉ dành cho khách đang lưu trú. Bạn có thể xem thực đơn sau khi nhận phòng." /></Card></>);
  const multiRoom = stay.rooms.length > 1;

  return (
    <>
      <PageHeader title="Gọi món tại phòng" subtitle={`Đặt phòng ${stay.bookingCode} · ${stay.rooms.map((r) => `phòng ${r.roomNumber}`).join(', ')}`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {menu.error ? <ErrorState error={menu.error} onRetry={menu.refetch} /> : (menu.data ?? []).map((cat) => (
            <Card key={cat.id}><CardHeader title={cat.name} subtitle={cat.description} />
              <ul className="divide-y divide-line">{cat.items.map((it) => {
                const q = cart[it.id]?.qty ?? 0;
                return (
                  <li key={it.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0"><p className="font-medium">{it.name}</p>{it.description && <p className="truncate text-xs text-muted">{it.description}</p>}<p className="mt-0.5 text-xs text-muted">~{it.preparationMinutes} phút</p></div>
                    <div className="flex shrink-0 items-center gap-3"><span className="tabular-nums">{money(it.priceMinor)}</span>
                      {q === 0 ? <Button size="sm" variant="secondary" icon={Plus} onClick={() => setQty(it, 1)}>Thêm</Button> : <span className="flex items-center gap-2"><Button size="sm" variant="secondary" aria-label="Giảm" onClick={() => setQty(it, -1)}><Minus className="h-3.5 w-3.5" /></Button><span className="w-6 text-center font-medium">{q}</span><Button size="sm" variant="secondary" aria-label="Tăng" onClick={() => setQty(it, 1)}><Plus className="h-3.5 w-3.5" /></Button></span>}
                    </div>
                  </li>
                );
              })}</ul></Card>
          ))}
        </div>
        <Card className="h-fit xl:sticky xl:top-20"><CardHeader title="Giỏ hàng" actions={<ShoppingBasket className="h-4 w-4 text-muted" />} />
          <div className="space-y-4 p-5">
            {lines.length === 0 ? <p className="text-sm text-muted">Chưa chọn món nào.</p> : <ul className="space-y-2 text-sm">{lines.map((l) => <li key={l.item.id} className="flex justify-between gap-3"><span>{l.qty}× {l.item.name}</span><span className="tabular-nums">{money(l.item.priceMinor * l.qty)}</span></li>)}<li className="flex justify-between border-t border-line pt-2 font-semibold"><span>Tạm tính</span><span className="tabular-nums">{money(subtotal)}</span></li></ul>}
            {stays.items.length > 1 && <SelectField label="Đặt phòng" value={stay.id} onChange={(e) => { setBookingId(e.target.value); setRoomId(''); }}>{stays.items.map((s) => <option key={s.id} value={s.id}>{s.bookingCode}</option>)}</SelectField>}
            {multiRoom && <SelectField label="Giao tới phòng" value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">Chọn phòng…</option>{stay.rooms.map((r) => <option key={r.roomId} value={r.roomId}>{r.roomNumber}</option>)}</SelectField>}
            <SelectField label="Thanh toán" value={payment} onChange={(e) => setPayment(e.target.value)}><option value="ROOM_CHARGE">Ghi vào hóa đơn phòng</option><option value="CASH">Tiền mặt khi nhận</option><option value="CARD">Thẻ khi nhận</option><option value="BANK_TRANSFER">Chuyển khoản</option></SelectField>
            <TextareaField label="Ghi chú" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            {place.error && <Alert tone="danger">{place.error.code === 'ITEM_UNAVAILABLE' ? `Món không còn phục vụ: ${place.error.message}` : place.error.message}</Alert>}
            <Button className="w-full" disabled={!lines.length || (multiRoom && !roomId)} loading={place.loading} onClick={() => place.run({ bookingId: stay.id, ...(multiRoom && { roomId }), items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })), paymentMethod: payment, ...(notes && { notes }) })}>Đặt món · {money(subtotal)}</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6"><CardHeader title="Đơn của bạn" subtitle="Tự động cập nhật" />
        <DataTable loading={orders.isLoading} rows={orders.items} empty={<EmptyState title="Chưa có đơn nào" />} columns={[
          { key: 'c', header: 'Mã', render: (o) => <span className="font-medium">{o.orderCode}</span> },
          { key: 'i', header: 'Món', render: (o) => <span className="text-xs text-muted">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span> },
          { key: 't', header: 'Tổng', align: 'right', render: (o) => money(o.subtotalMinor) },
          { key: 'p', header: 'Thanh toán', render: (o) => titleCase(o.paymentMethod) },
          { key: 's', header: 'Tiến độ', render: (o) => <span className="flex items-center gap-2"><StatusBadge status={o.status} />{STEPS.includes(o.status) && o.status !== 'DELIVERED' && <span className="text-xs text-muted">{STEPS.indexOf(o.status) + 1}/{STEPS.length}</span>}</span> },
          { key: 'd', header: 'Đặt lúc', render: (o) => <span className="whitespace-nowrap text-muted">{dateTime(o.createdAt)}</span> },
          { key: 'x', header: '', render: (o) => (['PENDING', 'CONFIRMED'].includes(o.status) ? <Button size="sm" variant="secondary" onClick={() => setCancelId(o.id)}>Hủy</Button> : o.status === 'DELIVERED' ? <Button size="sm" variant="secondary" loading={complete.loading} onClick={() => complete.run(o.id)}>Đã nhận</Button> : null) },
        ]} /></Card>
      <PromptDialog open={Boolean(cancelId)} title="Hủy đơn" danger confirmText="Hủy đơn" loading={cancel.loading} description="Bạn chỉ hủy được khi bếp chưa bắt đầu chế biến." onClose={() => setCancelId(null)} onConfirm={(reason) => cancel.run(cancelId, reason)} />
    </>
  );
}
