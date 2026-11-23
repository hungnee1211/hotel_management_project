import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { PromptDialog } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, DataTable, EmptyState, ErrorState, FilterBar, Pager, PageHeader, SelectField, StatusBadge, Tabs, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, useOne, usePaging } from '../../hooks/index.js';
import { dateKey, hhmm, minutes, pct, titleCase, todayKey } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const ERR = { NO_SHIFT: 'Bạn không có ca làm nào đang diễn ra (cho phép vào ca sớm tối đa 60 phút).', ALREADY_CHECKED_IN: 'Bạn đã chấm công vào ca này rồi.', NOT_CHECKED_IN: 'Bạn chưa chấm công vào ca.' };
const iso = (v) => (v ? new Date(v).toISOString() : undefined);

function MyAttendance() {
  const { items, meta, isLoading, error, refetch } = useList('attendance', api.attendance.list, { limit: 10, sortBy: 'date', order: 'desc' }, { refetchInterval: 30_000 });
  const open = items.find((a) => a.status === 'OPEN');
  const done = { invalidate: ['attendance', 'dashboard'] };
  const inn = useAction(api.attendance.checkIn, { ...done, success: 'Đã vào ca' });
  const out = useAction(api.attendance.checkOut, { ...done, success: 'Đã kết thúc ca' });
  const [target, setTarget] = useState(null); const f = useForm({ checkInAt: '', checkOutAt: '' });
  const req = useAction(api.attendance.requestCorrection, { ...done, success: 'Đã gửi yêu cầu chỉnh công', onSuccess: () => setTarget(null) });
  const err = inn.error ?? out.error;
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs text-muted">Trạng thái hiện tại</p><p className="mt-1 text-2xl font-semibold">{open ? 'Đang trong ca' : 'Chưa vào ca'}</p>{open && <p className="mt-1 text-sm text-muted">Từ {hhmm(open.checkInAt)}{open.lateMinutes ? ` · trễ ${open.lateMinutes} phút` : ''}</p>}</div>
          {open ? <Button size="lg" variant="danger" icon={LogOut} loading={out.loading} onClick={() => out.run()}>Kết thúc ca</Button> : <Button size="lg" icon={LogIn} loading={inn.loading} onClick={() => inn.run()}>Vào ca</Button>}
        </div>
        {err && <Alert tone="warning" className="mt-4">{ERR[err.code] ?? err.message}</Alert>}
      </Card>
      <Card><CardHeader title="Lịch sử chấm công của tôi" />
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Chưa có dữ liệu chấm công" />} columns={[
          { key: 'd', header: 'Ngày', render: (a) => dateKey(a.date) }, { key: 'i', header: 'Vào', render: (a) => hhmm(a.checkInAt) }, { key: 'o', header: 'Ra', render: (a) => hhmm(a.checkOutAt) },
          { key: 'w', header: 'Giờ làm', render: (a) => minutes(a.workedMinutes) }, { key: 'f', header: 'Ghi chú', render: (a) => <span className="flex gap-1.5">{a.lateMinutes > 0 && <Badge tone="warning">Trễ {a.lateMinutes}p</Badge>}{a.earlyDepartureMinutes > 0 && <Badge tone="warning">Về sớm {a.earlyDepartureMinutes}p</Badge>}{a.correction?.status === 'PENDING' && <Badge tone="info">Chờ duyệt chỉnh công</Badge>}</span> },
          { key: 's', header: 'Trạng thái', render: (a) => <StatusBadge status={a.status} /> },
          { key: 'x', header: '', render: (a) => a.status !== 'ABSENT' && a.correction?.status !== 'PENDING' && <Button size="sm" variant="ghost" onClick={() => { f.reset({ checkInAt: '', checkOutAt: '' }); setTarget(a); }}>Xin chỉnh công</Button> },
        ]} />}
        <Pager meta={meta} onPage={() => {}} />
      </Card>
      <PromptDialog open={Boolean(target)} title="Xin chỉnh công" label="Lý do" confirmText="Gửi" loading={req.loading} onClose={() => setTarget(null)} minLength={5}
        description="Giờ phải ở quá khứ. Quản lý duyệt thì bản ghi mới được cập nhật." onConfirm={(reason) => req.run(target.id, { reason, ...(f.values.checkInAt && { checkInAt: iso(f.values.checkInAt) }), ...(f.values.checkOutAt && { checkOutAt: iso(f.values.checkOutAt) }) })}
        extra={<div className="grid grid-cols-2 gap-3"><TextField label="Giờ vào đúng" type="datetime-local" {...f.bind('checkInAt')} /><TextField label="Giờ ra đúng" type="datetime-local" {...f.bind('checkOutAt')} /></div>} />
    </div>
  );
}

function TeamAttendance() {
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'date', order: 'desc', from: todayKey(-7) });
  const { items, meta, isLoading, error, refetch } = useList('attendance', api.attendance.list, params);
  const staff = useList('staff', api.staff.list, { limit: 100 });
  const names = Object.fromEntries(staff.items.map((s) => [s.id, s.fullName]));
  const { can } = useAuth(); const approve = can({ any: [P.ATTENDANCE_APPROVE] });
  const [fix, setFix] = useState(null); const f = useForm({ checkInAt: '', checkOutAt: '', note: '' });
  const opts = { invalidate: ['attendance'], onSuccess: () => setFix(null) };
  const ok = useAction(api.attendance.approve, { ...opts, success: 'Đã duyệt' }); const no = useAction(api.attendance.reject, { ...opts, success: 'Đã từ chối' });
  const correct = useAction(api.attendance.correct, { ...opts, success: 'Đã chỉnh công' });
  return (
    <Card>
      <FilterBar>
        <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['OPEN', 'CLOSED', 'MISSING_CHECKOUT', 'ABSENT'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        <SelectField label="Nhân viên" value={params.staffId ?? ''} onChange={(e) => patch({ staffId: e.target.value || undefined })}><option value="">Tất cả</option>{staff.items.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</SelectField>
        <TextField label="Từ ngày" type="date" value={params.from ?? ''} onChange={(e) => patch({ from: e.target.value || undefined })} /><TextField label="Đến ngày" type="date" value={params.to ?? ''} onChange={(e) => patch({ to: e.target.value || undefined })} />
        <SelectField label="Đi trễ" value={params.late ?? ''} onChange={(e) => patch({ late: e.target.value || undefined })}><option value="">Tất cả</option><option value="true">Chỉ đi trễ</option></SelectField>
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có bản ghi" />} columns={[
        { key: 'd', header: 'Ngày', render: (a) => dateKey(a.date) }, { key: 'n', header: 'Nhân viên', render: (a) => <span className="font-medium">{names[a.staffId] ?? a.staffId.slice(-6)}</span> },
        { key: 'i', header: 'Vào', render: (a) => hhmm(a.checkInAt) }, { key: 'o', header: 'Ra', render: (a) => hhmm(a.checkOutAt) }, { key: 'w', header: 'Giờ làm', render: (a) => minutes(a.workedMinutes) },
        { key: 'f', header: 'Cờ', render: (a) => <span className="flex gap-1.5">{a.lateMinutes > 0 && <Badge tone="warning">Trễ {a.lateMinutes}p</Badge>}{a.earlyDepartureMinutes > 0 && <Badge tone="warning">Sớm {a.earlyDepartureMinutes}p</Badge>}</span> },
        { key: 's', header: 'Trạng thái', render: (a) => <StatusBadge status={a.status} /> },
        ...(approve ? [{ key: 'x', header: '', align: 'right', render: (a) => (
          <span className="flex flex-wrap justify-end gap-2">
            {a.correction?.status === 'PENDING' && <><span className="text-xs text-muted" title={a.correction.reason}>“{a.correction.reason.slice(0, 24)}…”</span><Button size="sm" loading={ok.loading} onClick={() => ok.run(a.id)}>Duyệt</Button><Button size="sm" variant="secondary" loading={no.loading} onClick={() => no.run(a.id)}>Từ chối</Button></>}
            {a.status !== 'ABSENT' && <Button size="sm" variant="ghost" onClick={() => { f.reset({ checkInAt: '', checkOutAt: '', note: '' }); setFix(a); }}>Sửa công</Button>}
          </span>) }] : []),
      ]} />}
      <Pager meta={meta} onPage={setPage} />
      <PromptDialog open={Boolean(fix)} title="Sửa công trực tiếp" label="Ghi chú" minLength={0} loading={correct.loading} onClose={() => setFix(null)} description="Thay đổi được ghi vào nhật ký (trước/sau)." onConfirm={(note) => correct.run(fix.id, { ...(f.values.checkInAt && { checkInAt: iso(f.values.checkInAt) }), ...(f.values.checkOutAt && { checkOutAt: iso(f.values.checkOutAt) }), ...(note && { note }) })}
        extra={<div className="grid grid-cols-2 gap-3"><TextField label="Giờ vào" type="datetime-local" {...f.bind('checkInAt')} /><TextField label="Giờ ra" type="datetime-local" {...f.bind('checkOutAt')} /></div>} />
      {(ok.error || correct.error) && <Alert tone="danger" className="m-4">{(ok.error ?? correct.error).message}</Alert>}
    </Card>
  );
}

function Report() {
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const { data, isLoading, error, refetch } = useOne(['attendance', 'report', month], () => api.attendance.report({ month }), /^\d{4}-\d{2}$/.test(month));
  return (
    <div className="space-y-6">
      <div className="max-w-xs"><TextField label="Tháng" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      {isLoading ? null : error ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <Card><CardHeader title="Theo bộ phận" /><DataTable rowKey={(r) => r.department} rows={data.byDepartment} empty={<EmptyState title="Chưa có ca trong tháng" />} columns={[{ key: 'd', header: 'Bộ phận', render: (r) => titleCase(r.department) }, { key: 's', header: 'Nhân viên', render: (r) => r.staff }, { key: 'e', header: 'Ca đã kết thúc', render: (r) => r.endedShifts }, { key: 'p', header: 'Có mặt', render: (r) => r.present }, { key: 'l', header: 'Đi trễ', render: (r) => r.late }, { key: 'a', header: 'Vắng', render: (r) => r.absent }, { key: 'w', header: 'Giờ làm', render: (r) => minutes(r.workedMinutes) }]} /></Card>
          <Card><CardHeader title="Theo nhân viên" subtitle={`Tháng ${month} · múi giờ ${data.timezone}`} /><DataTable rowKey={(r) => r.staffId} rows={data.staff} empty={<EmptyState title="Chưa có dữ liệu" />} columns={[{ key: 'n', header: 'Nhân viên', render: (r) => <span className="font-medium">{r.fullName}</span> }, { key: 'd', header: 'Bộ phận', render: (r) => titleCase(r.department) }, { key: 'sc', header: 'Ca lên lịch', render: (r) => r.scheduledShifts }, { key: 'p', header: 'Có mặt', render: (r) => r.present }, { key: 'l', header: 'Trễ', render: (r) => r.late }, { key: 'a', header: 'Vắng', render: (r) => r.absent }, { key: 'm', header: 'Quên ra ca', render: (r) => r.missingCheckouts }, { key: 'w', header: 'Giờ làm', render: (r) => minutes(r.workedMinutes) }, { key: 'r', header: 'Tỷ lệ', align: 'right', render: (r) => pct(r.attendanceRate) }]} /></Card>
        </>
      )}
    </div>
  );
}

export default function Attendance() {
  const { role } = useAuth(); const team = role === 'ADMIN' || role === 'MANAGER';
  const [tab, setTab] = useState(role === 'STAFF' ? 'me' : 'team');
  return (
    <>
      <PageHeader title="Chấm công" subtitle="Giờ tính theo múi giờ khách sạn; đi trễ/về sớm xét theo thời gian ân hạn cấu hình trong Cài đặt." />
      <Tabs value={tab} onChange={setTab} tabs={[...(role === 'STAFF' ? [{ value: 'me', label: 'Của tôi' }] : []), ...(team ? [{ value: 'team', label: 'Nhóm' }, { value: 'report', label: 'Báo cáo tháng' }] : [])]} />
      {tab === 'me' ? <MyAttendance /> : tab === 'team' ? <TeamAttendance /> : <Report />}
    </>
  );
}
