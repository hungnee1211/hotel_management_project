import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useAuth } from '../context/auth.jsx';
import { useAction, useForm, useOne } from '../hooks/index.js';
import { DEFAULT_CURRENCY, dateTime, fromMinor, money, titleCase, toMinor, uuid } from '../lib/format.js';
import { P } from '../lib/permissions.js';
import { Alert, Button, DataTable, ErrorState, KeyValue, Loading, Modal, SelectField, StatusBadge, TextField, TextareaField } from './ui/index.jsx';

export const downloadBlob = ({ blob, filename }, fallback = 'download') => {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename ?? fallback; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

/** Asks for a short text (a reason) before a destructive or audited action. `extra` can add more inputs. */
export function PromptDialog({ open, title, description, label = 'Lý do', confirmText = 'Xác nhận', danger, minLength = 3, onClose, onConfirm, loading, children, extra }) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} disabled={text.trim().length < minLength} onClick={() => onConfirm(text.trim())}>{confirmText}</Button></>}>
      <div className="space-y-4">{description && <p className="text-sm text-muted">{description}</p>}{children}<TextareaField label={label} value={text} onChange={(e) => setText(e.target.value)} rows={3} />{extra}</div>
    </Modal>
  );
}
export const ConfirmDialog = ({ open, title, description, confirmText = 'Xác nhận', danger, onClose, onConfirm, loading }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button></>}><p className="text-sm text-muted">{description}</p></Modal>
);

/** Amount typed in major units ("150000" / "12.34"); converts to integer minor units on submit. */
export const MoneyField = ({ currency = DEFAULT_CURRENCY, error, ...p }) => <TextField inputMode="decimal" hint={`Đơn vị: ${currency}`} error={error} {...p} />;

/**
 * Records a payment. Staff record cash/card/bank transfer against the billing account; customers start an ONLINE payment.
 * An idempotency key is created once per open dialog, so a double click or a retry can never charge twice.
 */
export function PaymentDialog({ open, onClose, accountId, bookingId, outstandingMinor, currency = DEFAULT_CURRENCY, online, onDone }) {
  const f = useForm({ amount: '', method: 'CASH', note: '' });
  const key = useMemo(() => (open ? uuid() : null), [open]);
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState(null);
  useEffect(() => { if (open) { f.reset({ amount: outstandingMinor > 0 ? fromMinor(outstandingMinor, currency) : '', method: 'CASH', note: '' }); setResult(null); setLocalError(null); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const rec = useAction(api.payments.record, { invalidate: ['bookings', 'invoices', 'payments', 'billing', 'dashboard'], success: 'Đã ghi nhận thanh toán' });
  const onl = useAction(api.payments.online, { invalidate: ['payments'], silent: true });
  const submit = async () => {
    const amountMinor = toMinor(f.values.amount, currency);
    if (!amountMinor) return setLocalError('Số tiền không hợp lệ');
    setLocalError(null);
    const res = online ? await onl.run({ bookingId, amountMinor, idempotencyKey: key }) : await rec.run({ accountId, amountMinor, method: f.values.method, idempotencyKey: key, ...(f.values.note && { note: f.values.note }) });
    if (!res) return;
    if (online) setResult(res.data); else { onDone?.(res.data); onClose(); }
  };
  const err = online ? onl.error : rec.error;
  return (
    <Modal open={open} onClose={onClose} title={online ? 'Thanh toán trực tuyến' : 'Ghi nhận thanh toán'} size="sm" footer={result ? <Button onClick={() => { onDone?.(result); onClose(); }}>Đóng</Button> : <><Button variant="secondary" onClick={onClose}>Hủy</Button><Button loading={rec.loading || onl.loading} onClick={submit}>{online ? 'Tạo thanh toán' : 'Ghi nhận'}</Button></>}>
      {result ? (
        <div className="space-y-3"><Alert tone="success">Đã tạo yêu cầu thanh toán. Số dư chỉ thay đổi khi cổng thanh toán xác nhận.</Alert><KeyValue cols={1} items={[['Mã giao dịch', result.transactionReference], ['Số tiền', money(result.amountMinor, currency)], ['Trạng thái', <StatusBadge key="s" status={result.status} />], ['Liên kết thanh toán', <a key="u" href={result.checkoutUrl} target="_blank" rel="noreferrer" className="link break-all font-mono text-xs">{result.checkoutUrl}</a>]]} /></div>
      ) : (
        <div className="space-y-4">
          {(localError || err) && <Alert tone="danger">{localError ?? (err.code === 'OVERPAYMENT' ? `Số tiền vượt quá số còn phải trả. ${err.message}` : err.message)}</Alert>}
          {outstandingMinor > 0 && <p className="text-sm text-muted">Còn phải trả: <strong className="text-fg">{money(outstandingMinor, currency)}</strong></p>}
          <MoneyField label="Số tiền" currency={currency} {...f.bind('amount')} />
          {!online && <SelectField label="Phương thức" {...f.bind('method')}><option value="CASH">Tiền mặt</option><option value="CARD">Thẻ (POS)</option><option value="BANK_TRANSFER">Chuyển khoản</option></SelectField>}
          {!online && <TextField label="Ghi chú" {...f.bind('note')} />}
        </div>
      )}
    </Modal>
  );
}

/** Invoice detail with every action the backend offers, shown only when the caller is allowed (the server re-checks). */
export function InvoiceModal({ invoiceId, onClose, onChanged }) {
  const { can, role } = useAuth();
  const { data: inv, isLoading, error, refetch } = useOne(['invoices', invoiceId], () => api.invoices.get(invoiceId), Boolean(invoiceId));
  const [dlg, setDlg] = useState(null);
  const done = async () => { await refetch(); onChanged?.(); };
  const issue = useAction(api.invoices.issue, { invalidate: ['invoices', 'bookings'], success: 'Đã phát hành hóa đơn', onSuccess: done });
  const adjust = useAction(api.invoices.adjust, { invalidate: ['invoices'], success: 'Đã ghi điều chỉnh', onSuccess: () => { setDlg(null); done(); } });
  const voidIt = useAction(api.invoices.void, { invalidate: ['invoices'], success: 'Đã hủy hóa đơn', onSuccess: () => { setDlg(null); onClose(); onChanged?.(); } });
  const af = useForm({ adjustmentType: 'CREDIT', amount: '', reason: '' });
  const pdf = async () => downloadBlob(await api.invoices.pdf(invoiceId), 'invoice.pdf');
  const cur = inv?.currency ?? DEFAULT_CURRENCY;
  const owed = inv ? inv.grandTotalMinor + (inv.adjustmentsTotalMinor ?? 0) : 0;
  const canPayStaff = can({ any: [P.PAYMENT_CREATE] }) && inv && !['DRAFT', 'VOID'].includes(inv.status) && inv.outstandingMinor > 0;
  const canPayOnline = role === 'CUSTOMER' && can({ any: [P.PAYMENT_CREATE_OWN] }) && inv && inv.outstandingMinor > 0 && !['DRAFT', 'VOID'].includes(inv.status);

  return (
    <>
      <Modal open={Boolean(invoiceId)} onClose={onClose} size="lg" title={inv ? `Hóa đơn ${inv.invoiceNumber ?? '(bản nháp)'}` : 'Hóa đơn'}
        footer={inv && <>
          <Button variant="secondary" icon={Download} onClick={pdf}>Tải PDF</Button>
          {inv.status === 'DRAFT' && can({ any: [P.INVOICE_MANAGE] }) && <Button loading={issue.loading} onClick={() => issue.run(inv.id)}>Phát hành</Button>}
          {!['DRAFT', 'VOID'].includes(inv.status) && can({ any: [P.BILLING_ADJUST] }) && <Button variant="secondary" onClick={() => { af.reset({ adjustmentType: 'CREDIT', amount: '', reason: '' }); setDlg('adjust'); }}>Điều chỉnh</Button>}
          {inv.status !== 'VOID' && role === 'ADMIN' && inv.status !== 'DRAFT' && <Button variant="danger" onClick={() => setDlg('void')}>Hủy hóa đơn</Button>}
          {(canPayStaff || canPayOnline) && <Button onClick={() => setDlg('pay')}>{canPayOnline ? 'Thanh toán' : 'Ghi nhận thanh toán'}</Button>}
        </>}>
        {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : !inv ? <Loading /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3"><StatusBadge status={inv.status} /><span className="text-xs text-muted">Phát hành: {dateTime(inv.issuedAt)} · Hạn thanh toán: {dateTime(inv.dueAt)}</span></div>
            <KeyValue items={[['Khách hàng', inv.customerSnapshot?.fullName], ['Liên hệ', inv.customerSnapshot?.email ?? inv.customerSnapshot?.phone]]} />
            <DataTable rows={inv.lineItems.map((l, i) => ({ ...l, id: `${l.chargeId}${i}` }))} columns={[
              { key: 'd', header: 'Khoản mục', render: (l) => <span>{l.description}<span className="block text-xs text-muted">{titleCase(l.category)}</span></span> },
              { key: 'q', header: 'SL', align: 'right', render: (l) => l.quantity },
              { key: 'a', header: 'Thành tiền', align: 'right', render: (l) => money(l.amountMinor, cur) },
            ]} />
            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              {[['Tạm tính', inv.subtotalMinor], inv.discountTotalMinor ? ['Giảm giá', -inv.discountTotalMinor] : null, inv.surchargeTotalMinor ? ['Phụ thu', inv.surchargeTotalMinor] : null, inv.serviceChargeMinor ? ['Phí dịch vụ', inv.serviceChargeMinor] : null, ...inv.taxBreakdown.map((t) => [`${t.name} ${(t.rateBps / 100).toFixed(2)}% (${titleCase(t.category)})`, t.taxMinor]), inv.adjustmentsTotalMinor ? ['Điều chỉnh', inv.adjustmentsTotalMinor] : null].filter(Boolean).map(([k, v]) => <div key={k} className="flex justify-between gap-6"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{money(v, cur)}</dd></div>)}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Tổng cộng</dt><dd className="tabular-nums">{money(owed, cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Đã thanh toán</dt><dd className="tabular-nums">{money(inv.paidMinor, cur)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Còn lại</dt><dd className="tabular-nums">{money(inv.outstandingMinor, cur)}</dd></div>
            </dl>
            {inv.adjustments?.length > 0 && <div><h3 className="mb-2 text-sm">Điều chỉnh sau phát hành</h3><DataTable rows={inv.adjustments} columns={[{ key: 'at', header: 'Thời gian', render: (a) => dateTime(a.createdAt) }, { key: 't', header: 'Loại', render: (a) => titleCase(a.adjustmentType) }, { key: 'r', header: 'Lý do', render: (a) => a.reason }, { key: 'm', header: 'Số tiền', align: 'right', render: (a) => money(a.amountMinor, cur) }]} /></div>}
          </div>
        )}
      </Modal>
      <Modal open={dlg === 'adjust'} onClose={() => setDlg(null)} title="Điều chỉnh hóa đơn" size="sm" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={adjust.loading} onClick={() => { const amountMinor = toMinor(af.values.amount, cur); if (amountMinor) adjust.run(invoiceId, { adjustmentType: af.values.adjustmentType, amountMinor, reason: af.values.reason }); }}>Ghi điều chỉnh</Button></>}>
        <div className="space-y-4">{adjust.error && <Alert tone="danger">{adjust.error.message}</Alert>}<p className="text-sm text-muted">Số liệu gốc không bị ghi đè: hệ thống tạo một bản ghi điều chỉnh có người duyệt.</p>
          <SelectField label="Loại" {...af.bind('adjustmentType')}><option value="CREDIT">Giảm (ghi có)</option><option value="DEBIT">Tăng (ghi nợ)</option></SelectField>
          <MoneyField label="Số tiền" currency={cur} {...af.bind('amount')} /><TextareaField label="Lý do" {...af.bind('reason')} /></div>
      </Modal>
      <PromptDialog open={dlg === 'void'} title="Hủy hóa đơn" danger description="Chỉ hủy được khi chưa có khoản thanh toán nào (hãy hoàn tiền trước). Các khoản phí sẽ được giải phóng để lập hóa đơn mới." confirmText="Hủy hóa đơn" loading={voidIt.loading} onClose={() => setDlg(null)} onConfirm={(reason) => voidIt.run(invoiceId, reason)} />
      <PaymentDialog open={dlg === 'pay'} onClose={() => setDlg(null)} accountId={inv?.billingAccountId} bookingId={inv?.bookingId} outstandingMinor={inv?.outstandingMinor} currency={cur} online={canPayOnline} onDone={done} />
    </>
  );
}

const ID_TYPES = { PASSPORT: 'Hộ chiếu', NATIONAL_ID: 'CCCD/CMND', DRIVER_LICENSE: 'Bằng lái xe', OTHER: 'Giấy tờ khác' };
export const idTypeLabel = (t) => ID_TYPES[t] ?? t;

/** Create / edit a guest. The ID number is write-only here: the API never returns it unless an authorised person reveals it. */
export function GuestFormModal({ open, guest, onClose, onSaved }) {
  const { can } = useAuth();
  const f = useForm({});
  useEffect(() => { if (open) f.reset({ fullName: guest?.fullName ?? '', email: guest?.email ?? '', phone: guest?.phone ?? '', nationality: guest?.nationality ?? '', idType: guest?.identification?.type ?? 'PASSPORT', idNumber: '', notes: guest?.notes ?? '' }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guest]);
  const save = useAction((b) => (guest ? api.guests.update(guest.id, b) : api.guests.create(b)), { invalidate: ['guests'], success: guest ? 'Đã cập nhật khách' : 'Đã thêm khách', onSuccess: (r) => { onSaved?.(r.data.guest ?? r.data); onClose(); } });
  const submit = (e) => {
    e.preventDefault();
    const v = f.values; const body = { fullName: v.fullName };
    for (const k of ['email', 'phone', 'nationality']) if (v[k]?.trim()) body[k] = v[k].trim();
    if (v.notes !== undefined && (guest || v.notes)) body.notes = v.notes;
    if (v.idNumber.trim()) body.identification = { type: v.idType, number: v.idNumber.trim() };
    save.run(body);
  };
  const err = save.fields; const dup = save.error?.code === 'GUEST_EXISTS';
  return (
    <Modal open={open} onClose={onClose} title={guest ? 'Sửa thông tin khách' : 'Thêm khách'} footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button type="submit" form="guest-form" loading={save.loading}>Lưu</Button></>}>
      <form id="guest-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {dup && <Alert tone="warning" className="sm:col-span-2">Số giấy tờ này đã có khách đăng ký (mã khách: {save.error.errors[0]?.guestId}). Hãy dùng khách đó thay vì tạo mới.</Alert>}
        <TextField label="Họ và tên" required className="sm:col-span-2" {...f.bind('fullName')} error={err.fullName} />
        <TextField label="Email" type="email" {...f.bind('email')} error={err.email} />
        <TextField label="Số điện thoại" type="tel" {...f.bind('phone')} error={err.phone} />
        <TextField label="Quốc tịch" {...f.bind('nationality')} />
        <span />
        <SelectField label="Loại giấy tờ" {...f.bind('idType')}>{Object.entries(ID_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectField>
        <TextField label="Số giấy tờ" placeholder={guest?.identification ? `Hiện: ${guest.identification.maskedNumber} (nhập để thay)` : ''} hint="Được mã hóa khi lưu; chỉ hiển thị 4 số cuối." {...f.bind('idNumber')} error={err['identification.number']} />
        {can({ any: [P.GUEST_MANAGE, P.GUEST_MANAGE_OWN] }) && <TextareaField label="Ghi chú" className="sm:col-span-2" {...f.bind('notes')} />}
      </form>
    </Modal>
  );
}
