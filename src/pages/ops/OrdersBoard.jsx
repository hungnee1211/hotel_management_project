import { useState } from 'react';
import { api } from '../../api/index.js';
import { PromptDialog } from '../../components/domain.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useList } from '../../hooks/index.js';
import { dateTime, money, titleCase } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const COLUMNS = [
  { status: 'PENDING', title: 'Mới', next: 'CONFIRMED', label: 'Xác nhận' },
  { status: 'CONFIRMED', title: 'Đã xác nhận', next: 'PREPARING', label: 'Bắt đầu làm' },
  { status: 'PREPARING', title: 'Đang chế biến', next: 'READY', label: 'Món sẵn sàng' },
  { status: 'READY', title: 'Chờ giao', next: 'DELIVERING', label: 'Đi giao' },
  { status: 'DELIVERING', title: 'Đang giao', next: 'DELIVERED', label: 'Đã giao' },
];

/** Kitchen/restaurant board. Each button is one step of the server-enforced workflow. */
export default function OrdersBoard() {
  const { can } = useAuth();
  const { items, isLoading, error, refetch } = useList('orders', api.orders.list, { active: true, limit: 100, sortBy: 'createdAt', order: 'asc' }, { refetchInterval: 10_000 });
  const [dlg, setDlg] = useState(null);
  const step = useAction(api.orders.setStatus, { invalidate: ['orders'], onSuccess: () => setDlg(null) });
  const cancel = useAction(api.orders.cancel, { invalidate: ['orders'], success: 'Đã hủy đơn', onSuccess: () => setDlg(null) });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <>
      <PageHeader title="Đơn gọi món" subtitle="Tự động làm mới mỗi 10 giây. Khi giao, đơn ghi vào hóa đơn phòng (hoặc thu tiền tại chỗ)." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const rows = items.filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-label={col.title} className="rounded-xl bg-surface2/60 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm">{col.title}<Badge tone="primary">{rows.length}</Badge></h2>
              <div className="space-y-3">
                {rows.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted">Không có đơn</p>}
                {rows.map((o) => (
                  <Card key={o.id} className="p-3.5">
                    <div className="flex items-start justify-between gap-2"><p className="font-semibold">{o.orderCode}</p><span className="text-xs text-muted">{dateTime(o.createdAt).slice(-5)}</span></div>
                    <p className="mt-1 text-xs text-muted">{o.deliveryLocation} · {titleCase(o.paymentMethod)}</p>
                    <ul className="mt-2 space-y-0.5 text-sm">{o.items.map((i) => <li key={i.menuItemId}>{i.quantity}× {i.name}{i.note && <span className="text-xs text-warning"> ({i.note})</span>}</li>)}</ul>
                    {o.notes && <p className="mt-2 rounded-md bg-warning/10 px-2 py-1 text-xs text-warning">{o.notes}</p>}
                    <p className="mt-2 text-sm font-semibold tabular-nums">{money(o.subtotalMinor)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" loading={step.loading} onClick={() => step.run(o.id, { status: col.next })}>{col.label}</Button>
                      {col.status === 'PENDING' && <Button size="sm" variant="secondary" onClick={() => setDlg({ type: 'reject', o })}>Từ chối</Button>}
                      {can({ any: [P.ORDER_MANAGE] }) && <Button size="sm" variant="ghost" onClick={() => setDlg({ type: 'cancel', o })}>Hủy</Button>}
                    </div>
                    {step.error?.code === 'BOOKING_NOT_ACTIVE' && col.status === 'DELIVERING' && <p className="mt-2 text-xs text-danger">Khách đã trả phòng, không thể ghi vào hóa đơn.</p>}
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <PromptDialog open={dlg?.type === 'reject'} title={`Từ chối ${dlg?.o.orderCode}`} danger confirmText="Từ chối" loading={step.loading} onClose={() => setDlg(null)} onConfirm={(reason) => step.run(dlg.o.id, { status: 'REJECTED', reason })} />
      <PromptDialog open={dlg?.type === 'cancel'} title={`Hủy ${dlg?.o.orderCode}`} danger confirmText="Hủy đơn" loading={cancel.loading} onClose={() => setDlg(null)} onConfirm={(reason) => cancel.run(dlg.o.id, reason)} />
      {items.length === 0 && <Card className="mt-4"><EmptyState title="Chưa có đơn nào đang xử lý" /></Card>}
    </>
  );
}
