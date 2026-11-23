import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/index.js';
import { ApiError } from '../../api/client.js';
import { ConfirmDialog, InvoiceModal, MoneyField, PaymentDialog, PromptDialog } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, Checkbox, DataTable, EmptyState, ErrorState, KeyValue, Loading, Modal, PageHeader, SelectField, StatusBadge, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useToast } from '../../context/toast.jsx';
import { useAction, useForm, useList, useOne } from '../../hooks/index.js';
import { dateKey, dateTime, money, titleCase, toMinor, todayKey } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

/** One booking: stay details, billing, and every action the caller is allowed to take. Used by customers and staff alike. */
export default function BookingDetail({ back = '/bookings' }) {
  const { id } = useParams(); const navigate = useNavigate(); const toast = useToast();
  const { can, role } = useAuth();
  const { data: b, isLoading, error, refetch } = useOne(['bookings', id], () => api.bookings.get(id));
  const accountId = b?.billing?.accountId;
  const charges = useList('billing', (p) => api.billing.charges(accountId, p), { limit: 100, accountId }, { enabled: Boolean(accountId) });
  const invoices = useList('invoices', api.invoices.list, { bookingId: id, limit: 5 }, { enabled: Boolean(b) });
  const [dlg, setDlg] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const refresh = async () => { await Promise.all([refetch(), charges.refetch(), invoices.refetch()]); };
  const opts = { invalidate: ['bookings', 'dashboard', 'rooms', 'availability'], onSuccess: async () => { setDlg(null); await refresh(); } };

  const confirm = useAction(api.bookings.confirm, { ...opts, success: 'Đã xác nhận đặt phòng' });
  const cancel = useAction(api.bookings.cancel, { ...opts, success: (r) => (r.data.refundDueMinor ? `Đã hủy. Cần hoàn lại khách ${money(r.data.refundDueMinor)}` : 'Đã hủy đặt phòng') });
  const noShow = useAction(api.bookings.noShow, { ...opts, success: 'Đã ghi nhận khách không đến' });
  const checkIn = useAction(api.bookings.checkIn, { ...opts, success: 'Đã nhận phòng' });
  const extend = useAction(api.bookings.extend, { ...opts, success: 'Đã gia hạn lưu trú' });
  const modify = useAction(api.bookings.update, { ...opts, success: 'Đã cập nhật đặt phòng' });
  const gen = useAction(api.billing.generateInvoice, { invalidate: ['invoices'], onSuccess: (r) => { refresh(); setInvoiceId(r.data.id); } });
  const addCharge = useAction(api.billing.addCharge, { invalidate: ['billing'], success: 'Đã thêm khoản phí', onSuccess: () => { setDlg(null); refresh(); } });

  const mf = useForm({}); const ef = useForm({ date: '' }); const cf = useForm({ category: 'SURCHARGE', description: '', quantity: 1, amount: '', reason: '' });
  const [waive, setWaive] = useState(false);
  const [coBusy, setCoBusy] = useState(false); const [balance, setBalance] = useState(null);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const cur = b.priceSnapshot?.currency; const bil = b.billing;
  const own = role === 'CUSTOMER';
  const activeInvoice = invoices.items.find((i) => i.status !== 'VOID');
  const front = can({ any: [P.BOOKING_CHECKIN_CHECKOUT] }); const manage = can({ any: [P.BOOKING_MANAGE] });
  const open = ['PENDING', 'CONFIRMED'].includes(b.status);
  const depositLeft = Math.max(0, (b.priceSnapshot?.depositRequiredMinor ?? 0) - (bil?.paidMinor ?? 0));
  const preTaxLeft = bil ? Math.max(0, bil.totalChargesMinor - bil.paidMinor) : 0;

  const doCheckOut = async (extra = {}) => {
    setCoBusy(true);
    try {
      await api.bookings.checkOut(id, extra); toast.success('Đã trả phòng và phát hành hóa đơn'); setBalance(null); setDlg(null); await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OUTSTANDING_BALANCE') setBalance(e); else toast.error(e.message);
    } finally { setCoBusy(false); }
  };

  return (
    <>
      <PageHeader title={`Đặt phòng ${b.bookingCode}`} subtitle={`${dateKey(b.checkInDate)} → ${dateKey(b.checkOutDate)} · ${b.nights} đêm`}
        actions={<>
          <Button variant="secondary" onClick={() => navigate(back)}>← Danh sách</Button>
          {b.status === 'PENDING' && manage && <Button loading={confirm.loading} onClick={() => confirm.run(id)}>Xác nhận</Button>}
          {b.status === 'CONFIRMED' && front && <Button loading={checkIn.loading} onClick={() => checkIn.run(id)}>Nhận phòng</Button>}
          {b.status === 'CHECKED_IN' && front && <Button loading={coBusy} onClick={() => doCheckOut()}>Trả phòng</Button>}
          {b.status === 'CHECKED_IN' && front && <Button variant="secondary" onClick={() => { ef.reset({ date: '' }); setDlg('extend'); }}>Gia hạn</Button>}
          {open && (manage || (own && can({ any: [P.BOOKING_CREATE_OWN] }))) && <Button variant="secondary" onClick={() => { mf.reset({ checkInDate: b.checkInDate, checkOutDate: b.checkOutDate, adults: b.numberOfAdults, children: b.numberOfChildren }); setDlg('modify'); }}>Đổi thông tin</Button>}
          {b.status === 'CONFIRMED' && manage && b.checkInDate <= todayKey() && <Button variant="secondary" onClick={() => setDlg('noshow')}>Không đến</Button>}
          {open && can({ any: [P.BOOKING_CANCEL_ANY, P.BOOKING_CANCEL_OWN] }) && <Button variant="danger" onClick={() => { setWaive(false); setDlg('cancel'); }}>Hủy đặt phòng</Button>}
        </>} />

      {b.status === 'PENDING' && <Alert tone="warning" className="mb-5">Phòng đang được giữ đến <strong>{dateTime(b.holdExpiresAt)}</strong>. {depositLeft > 0 ? <>Cần đặt cọc còn lại <strong>{money(depositLeft, cur)}</strong> để xác nhận.</> : 'Chờ khách sạn xác nhận.'}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Thông tin lưu trú" actions={<StatusBadge status={b.status} />} />
          <div className="space-y-5 p-5">
            <KeyValue cols={3} items={[['Người lớn / trẻ em', `${b.numberOfAdults} / ${b.numberOfChildren}`], ['Nguồn', titleCase(b.source)], ['Tạo lúc', dateTime(b.createdAt)], b.actualCheckInAt && ['Nhận phòng thực tế', dateTime(b.actualCheckInAt)], b.actualCheckOutAt && ['Trả phòng thực tế', dateTime(b.actualCheckOutAt)], b.specialRequests && ['Yêu cầu đặc biệt', b.specialRequests]]} />
            <DataTable rowKey={(r) => r.roomId} rows={b.rooms} columns={[
              { key: 'r', header: 'Phòng', render: (r) => <span className="font-medium">{r.roomNumber} · {r.roomTypeName}</span> },
              { key: 'n', header: 'Giá từng đêm', render: (r) => <span className="text-xs text-muted">{r.nightly.map((n) => `${dateKey(n.date).slice(0, 5)}: ${money(n.priceMinor, cur)}`).join(' · ')}</span> },
              { key: 's', header: 'Tiền phòng', align: 'right', render: (r) => money(r.subtotalMinor, cur) },
            ]} />
            {b.cancellation && <Alert tone={b.cancellation.freeCancellation ? 'info' : 'warning'}>{titleCase(b.status)} lúc {dateTime(b.cancellation.at)}{b.cancellation.reason ? ` — ${b.cancellation.reason}` : ''}. {b.cancellation.penaltyMinor > 0 ? <>Phí phạt: <strong>{money(b.cancellation.penaltyMinor, cur)}</strong> ({b.cancellation.penaltyNights} đêm).</> : 'Không bị tính phí.'}</Alert>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Thanh toán" subtitle={bil ? `Tài khoản ${titleCase(bil.status)}` : undefined} />
          <div className="space-y-4 p-5">
            {bil ? <KeyValue cols={1} items={[['Tổng phí đã ghi nhận (chưa thuế)', <strong key="t">{money(bil.totalChargesMinor, cur)}</strong>], ['Đã thanh toán', money(bil.paidMinor, cur)], b.priceSnapshot?.depositRequiredMinor ? ['Tiền cọc yêu cầu', money(b.priceSnapshot.depositRequiredMinor, cur)] : null]} /> : <p className="text-sm text-muted">Không có thông tin thanh toán.</p>}
            <div className="flex flex-wrap gap-2">
              {can({ any: [P.PAYMENT_CREATE] }) && bil?.status === 'OPEN' && <Button size="sm" onClick={() => setDlg('pay')}>Ghi nhận thanh toán</Button>}
              {own && can({ any: [P.PAYMENT_CREATE_OWN] }) && bil?.status === 'OPEN' && (depositLeft > 0 || activeInvoice?.outstandingMinor > 0 || preTaxLeft > 0) && <Button size="sm" onClick={() => setDlg('pay')}>{depositLeft > 0 ? 'Đặt cọc trực tuyến' : 'Thanh toán trực tuyến'}</Button>}
              {can({ any: [P.BILLING_ADJUST] }) && bil?.status === 'OPEN' && !(activeInvoice && activeInvoice.status !== 'DRAFT') && <Button size="sm" variant="secondary" onClick={() => { cf.reset({ category: 'SURCHARGE', description: '', quantity: 1, amount: '', reason: '' }); setDlg('charge'); }}>Thêm phụ thu / giảm giá</Button>}
              {can({ any: [P.INVOICE_MANAGE] }) && bil && !(activeInvoice && activeInvoice.status !== 'DRAFT') && <Button size="sm" variant="secondary" loading={gen.loading} onClick={() => gen.run(accountId)}>Xem / tạo hóa đơn nháp</Button>}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Các khoản phí" subtitle="Mỗi giao dịch chỉ được tính một lần" />
          <DataTable rows={charges.items} loading={charges.isLoading} empty={<EmptyState title="Chưa có khoản phí" />} columns={[
            { key: 'd', header: 'Mô tả', render: (c) => <span className={c.status === 'VOIDED' ? 'text-muted line-through' : ''}>{c.description}<span className="block text-xs text-muted">{titleCase(c.category)}</span></span> },
            { key: 'a', header: 'Số tiền', align: 'right', render: (c) => money(c.amountMinor, cur) },
            { key: 's', header: '', render: (c) => (c.status === 'VOIDED' ? <Badge>Đã hủy</Badge> : c.invoiceId ? <Badge tone="info">Đã lập HĐ</Badge> : null) },
          ]} /></Card>
        <Card><CardHeader title="Hóa đơn" />
          <DataTable rows={invoices.items} loading={invoices.isLoading} onRowClick={(i) => setInvoiceId(i.id)} empty={<EmptyState title="Chưa có hóa đơn" hint="Hóa đơn được phát hành khi trả phòng." />} columns={[
            { key: 'n', header: 'Số', render: (i) => <span className="font-medium">{i.invoiceNumber ?? '(nháp)'}</span> },
            { key: 't', header: 'Tổng', align: 'right', render: (i) => money(i.grandTotalMinor + (i.adjustmentsTotalMinor ?? 0), i.currency) },
            { key: 'o', header: 'Còn lại', align: 'right', render: (i) => money(i.outstandingMinor, i.currency) },
            { key: 's', header: '', render: (i) => <StatusBadge status={i.status} /> },
          ]} /></Card>
      </div>

      <Card className="mt-6"><CardHeader title="Lịch sử trạng thái" />
        <ol className="space-y-3 p-5">{(b.statusHistory ?? []).map((h, i) => <li key={i} className="flex items-center gap-3 text-sm"><StatusBadge status={h.status} /><span className="text-muted">{dateTime(h.at)}</span>{h.note && <span className="text-muted">— {h.note}</span>}</li>)}</ol></Card>

      {/* ---------------- dialogs ---------------- */}
      <PromptDialog open={dlg === 'cancel'} title="Hủy đặt phòng" danger confirmText="Hủy đặt phòng" loading={cancel.loading} onClose={() => setDlg(null)}
        description="Hủy sát ngày nhận phòng có thể bị tính phí theo chính sách của khách sạn. Phòng sẽ được trả lại kho ngay."
        extra={manage ? <Checkbox checked={waive} onChange={(e) => setWaive(e.target.checked)} label="Miễn phí hủy (chỉ quản lý)" /> : null}
        onConfirm={(reason) => cancel.run(id, { reason, ...(waive && { waivePenalty: true }) })} />
      <ConfirmDialog open={dlg === 'noshow'} title="Khách không đến" description="Đặt phòng chuyển sang 'Không đến', phòng được trả lại kho và phí không đến được tính vào tài khoản." confirmText="Xác nhận" danger loading={noShow.loading} onClose={() => setDlg(null)} onConfirm={() => noShow.run(id)} />
      <Modal open={dlg === 'extend'} onClose={() => setDlg(null)} title="Gia hạn lưu trú" size="sm" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={extend.loading} disabled={!ef.values.date} onClick={() => extend.run(id, ef.values.date)}>Gia hạn</Button></>}>
        <div className="space-y-4">{extend.error?.code === 'ROOM_UNAVAILABLE' && <Alert tone="danger">Các đêm này đã có người đặt.</Alert>}<p className="text-sm text-muted">Trả phòng hiện tại: {dateKey(b.checkOutDate)}</p><TextField label="Ngày trả phòng mới" type="date" min={b.checkOutDate} {...ef.bind('date')} error={extend.fields.newCheckOutDate} /></div>
      </Modal>
      <Modal open={dlg === 'modify'} onClose={() => setDlg(null)} title="Đổi thông tin đặt phòng" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={modify.loading} onClick={() => { const v = mf.values; const body = {}; if (v.checkInDate !== b.checkInDate) body.checkInDate = v.checkInDate; if (v.checkOutDate !== b.checkOutDate) body.checkOutDate = v.checkOutDate; if (Number(v.adults) !== b.numberOfAdults) body.adults = Number(v.adults); if (Number(v.children) !== b.numberOfChildren) body.children = Number(v.children); if (Object.keys(body).length) modify.run(id, body); else setDlg(null); }}>Lưu</Button></>}>
        <div className="space-y-4">{modify.error && <Alert tone="danger">{modify.error.code === 'ROOM_UNAVAILABLE' ? 'Phòng không còn trống cho những ngày mới.' : modify.error.message}</Alert>}<p className="text-sm text-muted">Các đêm giữ nguyên vẫn tính giá cũ; chỉ đêm mới dùng giá hiện hành.</p>
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="Nhận phòng" type="date" {...mf.bind('checkInDate')} /><TextField label="Trả phòng" type="date" {...mf.bind('checkOutDate')} /><TextField label="Người lớn" type="number" min={1} {...mf.bind('adults')} /><TextField label="Trẻ em" type="number" min={0} {...mf.bind('children')} /></div></div>
      </Modal>
      <Modal open={dlg === 'charge'} onClose={() => setDlg(null)} title="Thêm khoản phí thủ công" size="sm" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={addCharge.loading} onClick={() => { const a = toMinor(cf.values.amount, cur); if (a && cf.values.description) addCharge.run(accountId, { category: cf.values.category, description: cf.values.description, quantity: Number(cf.values.quantity) || 1, unitPriceMinor: a, ...(cf.values.reason && { reason: cf.values.reason }) }); }}>Thêm</Button></>}>
        <div className="space-y-4">{addCharge.error && <Alert tone="danger">{addCharge.error.code === 'APPROVAL_LIMIT_EXCEEDED' ? 'Vượt hạn mức quản lý được duyệt. Cần Admin.' : addCharge.error.message}</Alert>}
          <SelectField label="Loại" {...cf.bind('category')}><option value="SURCHARGE">Phụ thu (trả phòng muộn, hư hỏng…)</option><option value="DISCOUNT">Giảm giá</option><option value="ADDITIONAL_SERVICE">Dịch vụ bổ sung</option></SelectField>
          <TextField label="Mô tả" {...cf.bind('description')} /><div className="grid grid-cols-2 gap-4"><TextField label="Số lượng" type="number" min={1} {...cf.bind('quantity')} /><MoneyField label="Đơn giá" currency={cur} {...cf.bind('amount')} /></div><TextField label="Lý do (tuỳ chọn)" {...cf.bind('reason')} /></div>
      </Modal>
      <Modal open={Boolean(balance)} onClose={() => setBalance(null)} title="Còn số dư chưa thanh toán" size="sm" footer={<><Button variant="secondary" onClick={() => setBalance(null)}>Đóng</Button>{manage && <Button variant="danger" onClick={() => setDlg('authorize')}>Cho trả phòng khi còn nợ</Button>}</>}>
        <p className="text-sm">{balance?.message}. Hãy ghi nhận thanh toán rồi trả phòng lại{manage ? ', hoặc cho phép trả phòng khi còn nợ (được ghi vào nhật ký).' : '. Chỉ quản lý mới có thể cho trả phòng khi còn nợ.'}</p>
      </Modal>
      <PromptDialog open={dlg === 'authorize'} title="Trả phòng khi còn nợ" danger confirmText="Cho phép & trả phòng" loading={coBusy} description="Hóa đơn vẫn được phát hành và tài khoản giữ mở để thu nợ sau." onClose={() => setDlg(null)} onConfirm={(reason) => doCheckOut({ authorizeOutstanding: true, reason })} />
      <PaymentDialog open={dlg === 'pay'} onClose={() => setDlg(null)} accountId={accountId} bookingId={id} currency={cur} online={own} outstandingMinor={activeInvoice && activeInvoice.status !== 'DRAFT' ? activeInvoice.outstandingMinor : depositLeft || preTaxLeft} onDone={refresh} />
      <InvoiceModal invoiceId={invoiceId} onClose={() => setInvoiceId(null)} onChanged={refresh} />
    </>
  );
}
