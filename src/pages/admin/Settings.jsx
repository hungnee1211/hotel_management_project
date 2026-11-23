import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { MoneyField } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, Checkbox, DataTable, EmptyState, ErrorState, Loading, Modal, PageHeader, StatusBadge, Tabs, TextField } from '../../components/ui/index.jsx';
import { useAction, useForm, useOne } from '../../hooks/index.js';
import { dateKey, fromMinor, titleCase, toMinor } from '../../lib/format.js';

const bpsToPct = (b) => String(b / 100); const pctToBps = (s) => { const n = Number(String(s).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; };
const CATS = ['ROOM', 'FOOD_AND_BEVERAGE', 'ADDITIONAL_SERVICE', 'SURCHARGE'];
const rid = (r) => r.id ?? r._id; // tax rules come straight from the database

const Sec = ({ title, children }) => <Card><CardHeader title={title} /><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div></Card>;

function GeneralSettings() {
  const { data: s, isLoading, error, refetch } = useOne(['settings'], () => api.settings.get());
  const f = useForm({});
  useEffect(() => { if (s) f.reset({ hotelName: s.hotelName, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, holdMinutes: s.reservation.holdMinutes, maxNights: s.reservation.maxNightsPerBooking, maxAdvance: s.reservation.maxAdvanceBookingDays, freeHours: s.cancellationPolicy.freeCancellationHoursBeforeCheckIn, penaltyNights: s.cancellationPolicy.penaltyNights, deposit: bpsToPct(s.depositBps), service: bpsToPct(s.serviceChargeBps), requireInspection: s.housekeeping.requireInspection, late: s.attendance.lateGraceMinutes, early: s.attendance.earlyLeaveGraceMinutes, earlyIn: s.attendance.earlyCheckInMinutes, limit: fromMinor(s.billing.managerApprovalLimitMinor), dueDays: s.billing.invoiceDueDays, allowBalance: s.allowCheckoutWithOutstandingBalance }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const save = useAction(api.settings.update, { invalidate: ['settings'], success: 'Đã lưu cài đặt', onSuccess: refetch });
  const [bad, setBad] = useState(null);
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  const submit = () => {
    const v = f.values; const dep = pctToBps(v.deposit); const svc = pctToBps(v.service); const lim = toMinor(v.limit, s.currency);
    if (dep === null || svc === null || lim === null || dep > 10000 || svc > 10000) return setBad('Kiểm tra lại các ô phần trăm (0–100) và số tiền.');
    setBad(null);
    save.run({ hotelName: v.hotelName, checkInTime: v.checkInTime, checkOutTime: v.checkOutTime, reservation: { holdMinutes: Number(v.holdMinutes), maxNightsPerBooking: Number(v.maxNights), maxAdvanceBookingDays: Number(v.maxAdvance) }, cancellationPolicy: { freeCancellationHoursBeforeCheckIn: Number(v.freeHours), penaltyNights: Number(v.penaltyNights) }, housekeeping: { requireInspection: Boolean(v.requireInspection) }, attendance: { lateGraceMinutes: Number(v.late), earlyLeaveGraceMinutes: Number(v.early), earlyCheckInMinutes: Number(v.earlyIn) }, billing: { managerApprovalLimitMinor: lim, invoiceDueDays: Number(v.dueDays) }, depositBps: dep, serviceChargeBps: svc, allowCheckoutWithOutstandingBalance: Boolean(v.allowBalance) });
  };
  return (
    <div className="space-y-6">
      {(bad || save.error) && <Alert tone="danger">{bad ?? save.error.message}</Alert>}
      <p className="text-xs text-muted">Múi giờ ({s.timezone}) và tiền tệ ({s.currency}) được đặt khi cài đặt hệ thống và không đổi tại đây.</p>
      <Sec title="Khách sạn"><TextField label="Tên khách sạn" {...f.bind('hotelName')} /><TextField label="Giờ nhận phòng" type="time" {...f.bind('checkInTime')} /><TextField label="Giờ trả phòng" type="time" {...f.bind('checkOutTime')} /></Sec>
      <Sec title="Đặt phòng & hủy"><TextField label="Giữ chỗ chờ cọc (phút)" type="number" {...f.bind('holdMinutes')} /><TextField label="Tối đa đêm / đặt phòng" type="number" {...f.bind('maxNights')} /><TextField label="Đặt trước tối đa (ngày)" type="number" {...f.bind('maxAdvance')} /><TextField label="Hủy miễn phí trước (giờ)" type="number" {...f.bind('freeHours')} /><TextField label="Số đêm phạt khi hủy muộn / không đến" type="number" {...f.bind('penaltyNights')} /><TextField label="Đặt cọc (%)" hint="0 = không cần cọc; khách đặt online sẽ phải cọc để xác nhận." {...f.bind('deposit')} /></Sec>
      <Sec title="Tài chính"><TextField label="Phí dịch vụ (%)" {...f.bind('service')} /><MoneyField label="Hạn mức Manager được duyệt (hoàn tiền/giảm giá/điều chỉnh)" currency={s.currency} {...f.bind('limit')} /><TextField label="Hạn thanh toán hóa đơn (ngày)" type="number" {...f.bind('dueDays')} /><div className="pt-6"><Checkbox checked={Boolean(f.values.allowBalance)} onChange={(e) => f.set('allowBalance', e.target.checked)} label="Cho trả phòng khi còn nợ" /></div></Sec>
      <Sec title="Vận hành"><div className="pt-6"><Checkbox checked={Boolean(f.values.requireInspection)} onChange={(e) => f.set('requireInspection', e.target.checked)} label="Bắt buộc kiểm tra phòng sau khi dọn" /></div><TextField label="Ân hạn đi trễ (phút)" type="number" {...f.bind('late')} /><TextField label="Ân hạn về sớm (phút)" type="number" {...f.bind('early')} /><TextField label="Cho vào ca sớm (phút)" type="number" {...f.bind('earlyIn')} /></Sec>
      <div><Button loading={save.loading} onClick={submit}>Lưu cài đặt</Button></div>
    </div>
  );
}

function TaxRules() {
  const { data: rules, isLoading, error, refetch } = useOne(['tax-rules'], () => api.taxRules.list());
  const [dlg, setDlg] = useState(null); const f = useForm({}); const [cats, setCats] = useState(CATS);
  const create = useAction(api.taxRules.create, { invalidate: ['tax-rules'], success: 'Đã thêm mức thuế', onSuccess: () => { setDlg(null); refetch(); } });
  const upd = useAction(api.taxRules.update, { invalidate: ['tax-rules'], success: 'Đã cập nhật', onSuccess: () => { setDlg(null); refetch(); } });
  const open = () => { f.reset({ code: 'VAT', name: 'Thuế giá trị gia tăng', rate: '10', isServiceCharge: false, effectiveFrom: new Date().toISOString().slice(0, 10) }); setCats(CATS); setDlg('create'); };
  const submit = () => { const bps = pctToBps(f.values.rate); if (bps === null) return; create.run({ code: f.values.code, name: f.values.name, rateBps: bps, appliesTo: cats, isServiceCharge: Boolean(f.values.isServiceCharge), effectiveFrom: new Date(f.values.effectiveFrom).toISOString() }); };
  if (isLoading) return <Loading />; if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <>
      <Alert tone="info" className="mb-4">Mức thuế không sửa tại chỗ (để hóa đơn cũ giữ đúng thuế suất). Muốn đổi mức: kết thúc mức cũ rồi thêm mức mới có ngày hiệu lực sau.</Alert>
      <Card><CardHeader title="Thuế & phí" actions={<Button icon={Plus} onClick={open}>Thêm mức</Button>} />
        <DataTable rowKey={rid} rows={rules} empty={<EmptyState title="Chưa cấu hình thuế" hint="Không có mức nào thì hóa đơn không tính thuế." />} columns={[
          { key: 'c', header: 'Mã', render: (r) => <span className="font-medium">{r.code}</span> }, { key: 'n', header: 'Tên', render: (r) => <span>{r.name}{r.isServiceCharge && <Badge className="ml-2" tone="accent">Phí dịch vụ</Badge>}</span> },
          { key: 'r', header: 'Mức', align: 'right', render: (r) => `${r.rateBps / 100}%` }, { key: 'a', header: 'Áp dụng cho', render: (r) => <span className="text-xs text-muted">{r.appliesTo.map(titleCase).join(', ')}</span> },
          { key: 'f', header: 'Hiệu lực', render: (r) => `${dateKey((r.effectiveFrom ?? '').slice(0, 10))} → ${r.effectiveTo ? dateKey(r.effectiveTo.slice(0, 10)) : 'nay'}` }, { key: 's', header: 'Trạng thái', render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
          { key: 'x', header: '', align: 'right', render: (r) => r.isActive && !r.effectiveTo && <Button size="sm" variant="secondary" onClick={() => { f.reset({ end: new Date().toISOString().slice(0, 10) }); setDlg({ end: r }); }}>Kết thúc</Button> },
        ]} /></Card>
      <Modal open={dlg === 'create'} onClose={() => setDlg(null)} title="Thêm mức thuế / phí" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={create.loading} disabled={!cats.length} onClick={submit}>Thêm</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{create.error && <Alert tone="danger" className="sm:col-span-2">{create.error.code === 'DUPLICATE_KEY' ? 'Đã có mức cùng mã và ngày hiệu lực.' : create.error.message}</Alert>}
          <TextField label="Mã" {...f.bind('code')} /><TextField label="Tên" {...f.bind('name')} /><TextField label="Mức (%)" {...f.bind('rate')} /><TextField label="Hiệu lực từ" type="date" {...f.bind('effectiveFrom')} />
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-medium text-muted">Áp dụng cho</legend><div className="flex flex-wrap gap-4">{CATS.map((c) => <Checkbox key={c} checked={cats.includes(c)} onChange={(e) => setCats((l) => (e.target.checked ? [...l, c] : l.filter((x) => x !== c)))} label={titleCase(c)} />)}</div></fieldset>
          <div className="sm:col-span-2"><Checkbox checked={Boolean(f.values.isServiceCharge)} onChange={(e) => f.set('isServiceCharge', e.target.checked)} label="Đây là phí dịch vụ (tính trước thuế)" /></div></div>
      </Modal>
      <Modal open={Boolean(dlg?.end)} onClose={() => setDlg(null)} size="sm" title={`Kết thúc ${dlg?.end?.code}`} footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={upd.loading} onClick={() => upd.run(rid(dlg.end), { effectiveTo: new Date(f.values.end).toISOString() })}>Kết thúc</Button></>}><TextField label="Hết hiệu lực từ ngày" type="date" {...f.bind('end')} /></Modal>
    </>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('general');
  return (<><PageHeader title="Cài đặt & thuế" subtitle="Thay đổi có hiệu lực ngay cho các giao dịch mới; hóa đơn đã phát hành không đổi." /><Tabs value={tab} onChange={setTab} tabs={[{ value: 'general', label: 'Cấu hình chung' }, { value: 'tax', label: 'Thuế & phí' }]} />{tab === 'general' ? <GeneralSettings /> : <TaxRules />}</>);
}
