import { useState } from 'react';
import { api } from '../../api/index.js';
import { PromptDialog } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, DataTable, EmptyState, Modal, PageHeader, SelectField, StatusBadge, TextField, TextareaField } from '../../components/ui/index.jsx';
import { useAction, useForm, useList } from '../../hooks/index.js';
import { dateKey, dateTime, money, titleCase } from '../../lib/format.js';

const UNIT = { FIXED: 'cố định', PER_PERSON: '/người', PER_HOUR: '/giờ', PER_UNIT: '/đơn vị' };

export default function Services() {
  const catalog = useList('services', api.services.list, { limit: 50 });
  const bookings = useList('bookings', api.bookings.list, { limit: 50 });
  const requests = useList('service-requests', api.serviceRequests.list, { limit: 20, sortBy: 'createdAt', order: 'desc' }, { refetchInterval: 20_000 });
  const [svc, setSvc] = useState(null); const [cancelId, setCancelId] = useState(null);
  const f = useForm({ bookingId: '', quantity: 1, scheduledAt: '', notes: '' });
  const eligible = bookings.items.filter((b) => ['CONFIRMED', 'CHECKED_IN'].includes(b.status));
  const request = useAction(api.serviceRequests.create, { invalidate: ['service-requests'], success: 'Đã gửi yêu cầu', onSuccess: () => setSvc(null) });
  const cancel = useAction(api.serviceRequests.cancel, { invalidate: ['service-requests'], success: 'Đã hủy yêu cầu', onSuccess: () => setCancelId(null) });
  const open = (s) => { f.reset({ bookingId: eligible[0]?.id ?? '', quantity: 1, scheduledAt: '', notes: '' }); setSvc(s); };
  const qty = svc?.pricingType === 'FIXED' ? 1 : Number(f.values.quantity) || 1;

  return (
    <>
      <PageHeader title="Dịch vụ khách sạn" subtitle="Giặt ủi, spa, đưa đón sân bay… Chi phí được cộng vào hóa đơn khi dịch vụ hoàn thành." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.items.map((s) => (
          <Card key={s.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2"><h3 className="text-base">{s.name}</h3><Badge tone="primary">{titleCase(s.category)}</Badge></div>
            {s.description && <p className="mt-2 flex-1 text-sm text-muted">{s.description}</p>}
            <div className="mt-4 flex items-end justify-between"><p><span className="text-lg font-semibold tabular-nums">{money(s.priceMinor)}</span> <span className="text-xs text-muted">{UNIT[s.pricingType]}</span></p><Button size="sm" disabled={!s.availability} onClick={() => open(s)}>{s.availability ? 'Yêu cầu' : 'Tạm ngưng'}</Button></div>
          </Card>
        ))}
        {!catalog.isLoading && !catalog.items.length && <Card className="md:col-span-2 xl:col-span-3"><EmptyState title="Chưa có dịch vụ" /></Card>}
      </div>

      <Card className="mt-6"><CardHeader title="Yêu cầu của bạn" />
        <DataTable loading={requests.isLoading} rows={requests.items} empty={<EmptyState title="Chưa có yêu cầu nào" />} columns={[
          { key: 'c', header: 'Mã', render: (r) => <span className="font-medium">{r.requestCode}</span> },
          { key: 's', header: 'Dịch vụ', render: (r) => `${r.serviceSnapshot.name} × ${r.quantity}` },
          { key: 't', header: 'Thành tiền', align: 'right', render: (r) => money(r.totalMinor) },
          { key: 'a', header: 'Lịch hẹn', render: (r) => dateTime(r.scheduledAt) },
          { key: 'st', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'x', header: '', render: (r) => (['REQUESTED', 'ASSIGNED'].includes(r.status) ? <Button size="sm" variant="secondary" onClick={() => setCancelId(r.id)}>Hủy</Button> : null) },
        ]} /></Card>

      <Modal open={Boolean(svc)} onClose={() => setSvc(null)} title={`Yêu cầu: ${svc?.name}`} footer={<><Button variant="secondary" onClick={() => setSvc(null)}>Hủy</Button><Button loading={request.loading} disabled={!f.values.bookingId} onClick={() => request.run({ bookingId: f.values.bookingId, hotelServiceId: svc.id, ...(svc.pricingType !== 'FIXED' && { quantity: qty }), ...(f.values.scheduledAt && { scheduledAt: new Date(f.values.scheduledAt).toISOString() }), ...(f.values.notes && { notes: f.values.notes }) })}>Gửi yêu cầu · {money(svc ? svc.priceMinor * qty : 0)}</Button></>}>
        <div className="space-y-4">
          {!eligible.length && <Alert tone="warning">Bạn cần có đặt phòng đã xác nhận hoặc đang lưu trú để yêu cầu dịch vụ.</Alert>}
          {request.error && <Alert tone="danger">{request.error.message}</Alert>}
          <SelectField label="Đặt phòng" {...f.bind('bookingId')}>{eligible.map((b) => <option key={b.id} value={b.id}>{b.bookingCode} · {dateKey(b.checkInDate)} → {dateKey(b.checkOutDate)}</option>)}</SelectField>
          {svc?.pricingType !== 'FIXED' && <TextField label={`Số lượng (${UNIT[svc?.pricingType]})`} type="number" min={1} max={100} {...f.bind('quantity')} />}
          <TextField label="Thời gian mong muốn" type="datetime-local" {...f.bind('scheduledAt')} />
          <TextareaField label="Ghi chú" {...f.bind('notes')} />
        </div>
      </Modal>
      <PromptDialog open={Boolean(cancelId)} title="Hủy yêu cầu" danger confirmText="Hủy yêu cầu" loading={cancel.loading} onClose={() => setCancelId(null)} onConfirm={(reason) => cancel.run(cancelId, reason)} />
    </>
  );
}
