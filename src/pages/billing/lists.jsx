import { useState } from 'react';
import { api } from '../../api/index.js';
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, SelectField, StatusBadge, TextField } from '../../components/ui/index.jsx';
import { InvoiceModal } from '../../components/domain.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { DEFAULT_CURRENCY, dateTime, money, titleCase, toMinor, uuid } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'REFUNDED'];

/** Invoices. The API scopes the rows (customers: their own issued invoices; staff: all). */
export function InvoicesList({ staff }) {
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('invoices', api.invoices.list, params);
  const [open, setOpen] = useState(null);
  return (
    <Card>
      <FilterBar>
        <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{INVOICE_STATUSES.filter((s) => staff || s !== 'DRAFT').map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        {staff && <label className="space-y-1.5 text-xs font-medium text-muted"><span>Số hóa đơn</span><input className="input" placeholder="INV-000123" value={params.invoiceNumber ?? ''} onChange={(e) => patch({ invoiceNumber: e.target.value || undefined })} /></label>}
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : (
        <DataTable loading={isLoading} rows={items} onRowClick={(i) => setOpen(i.id)} empty={<EmptyState title="Chưa có hóa đơn" hint="Hóa đơn được phát hành khi trả phòng." />} columns={[
          { key: 'n', header: 'Số hóa đơn', render: (i) => <span className="font-medium">{i.invoiceNumber ?? '(nháp)'}</span> },
          { key: 'c', header: 'Khách', render: (i) => i.customerSnapshot?.fullName },
          { key: 'd', header: 'Phát hành', render: (i) => dateTime(i.issuedAt) },
          { key: 't', header: 'Tổng', align: 'right', render: (i) => money(i.grandTotalMinor + (i.adjustmentsTotalMinor ?? 0), i.currency) },
          { key: 'o', header: 'Còn lại', align: 'right', render: (i) => money(i.outstandingMinor, i.currency) },
          { key: 's', header: 'Trạng thái', render: (i) => <StatusBadge status={i.status} /> },
        ]} />
      )}
      <Pager meta={meta} onPage={setPage} />
      <InvoiceModal invoiceId={open} onClose={() => setOpen(null)} onChanged={refetch} />
    </Card>
  );
}

/** Payments with refunds for roles that hold payment:refund. */
export function PaymentsList({ staff }) {
  const { can } = useAuth();
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('payments', api.payments.list, params);
  const [target, setTarget] = useState(null);
  const f = useForm({ amount: '', reason: '' });
  const key = useState(() => uuid())[0];
  const refund = useAction(api.payments.refund, { invalidate: ['payments', 'invoices', 'billing', 'bookings'], success: 'Đã hoàn tiền', onSuccess: () => setTarget(null) });
  const refundable = target ? target.amountMinor - target.refundedMinor : 0;
  const open = (p) => { f.reset({ amount: String(p.amountMinor - p.refundedMinor), reason: '' }); setTarget(p); };
  return (
    <Card>
      <FilterBar>
        <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        <SelectField label="Phương thức" value={params.method ?? ''} onChange={(e) => patch({ method: e.target.value || undefined })}><option value="">Tất cả</option>{['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : (
        <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Chưa có thanh toán" />} columns={[
          { key: 'd', header: 'Thời gian', render: (p) => <span className="whitespace-nowrap">{dateTime(p.paidAt ?? p.createdAt)}</span> },
          { key: 'm', header: 'Phương thức', render: (p) => titleCase(p.method) },
          { key: 'r', header: 'Mã tham chiếu', render: (p) => <span className="font-mono text-xs">{p.transactionReference ?? '-'}</span> },
          { key: 'a', header: 'Số tiền', align: 'right', render: (p) => money(p.amountMinor, p.currency) },
          { key: 'rf', header: 'Đã hoàn', align: 'right', render: (p) => (p.refundedMinor ? money(p.refundedMinor, p.currency) : '-') },
          { key: 's', header: 'Trạng thái', render: (p) => <StatusBadge status={p.status} /> },
          ...(staff && can({ any: [P.PAYMENT_REFUND] }) ? [{ key: 'x', header: '', render: (p) => ['SUCCEEDED', 'PARTIALLY_REFUNDED'].includes(p.status) && <Button size="sm" variant="secondary" onClick={() => open(p)}>Hoàn tiền</Button> }] : []),
        ]} />
      )}
      <Pager meta={meta} onPage={setPage} />
      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title="Hoàn tiền" size="sm" footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Hủy</Button><Button loading={refund.loading} onClick={() => { const a = toMinor(f.values.amount, target.currency ?? DEFAULT_CURRENCY); if (a) refund.run(target.id, { amountMinor: a, reason: f.values.reason, idempotencyKey: key }); }}>Hoàn tiền</Button></>}>
        <div className="space-y-4">{refund.error && <Alert tone="danger">{refund.error.code === 'APPROVAL_LIMIT_EXCEEDED' ? 'Số tiền vượt hạn mức quản lý được duyệt. Cần Admin thực hiện.' : refund.error.message}</Alert>}
          <p className="text-sm text-muted">Có thể hoàn tối đa <strong className="text-fg">{money(refundable, target?.currency)}</strong>.</p>
          <TextField label="Số tiền hoàn" inputMode="decimal" {...f.bind('amount')} /><TextField label="Lý do" {...f.bind('reason')} /></div>
      </Modal>
    </Card>
  );
}
