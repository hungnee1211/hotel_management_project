import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { Alert, Badge, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, KeyValue, Loading, Modal, Pager, PageHeader, SelectField, StatusBadge, Tabs, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, useOne, usePaging } from '../../hooks/index.js';
import { dateTime, titleCase } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const DEPTS = ['RECEPTION', 'HOUSEKEEPING', 'RESTAURANT', 'KITCHEN', 'MAINTENANCE'];
/** Permissions an override may grant to staff (the server enforces the same list and rejects anything else). */
export const GRANTABLE = [P.BOOKING_CREATE_FOR_GUEST, P.BOOKING_READ_ALL, P.BOOKING_CHECKIN_CHECKOUT, P.GUEST_READ, P.GUEST_MANAGE, P.GUEST_VIEW_IDENTIFICATION, P.HOUSEKEEPING_READ, P.HOUSEKEEPING_UPDATE, P.PAYMENT_CREATE, P.BILLING_READ_ALL, P.SERVICE_FULFILL, P.ORDER_PROCESS, P.MAINTENANCE_WORK, P.EQUIPMENT_READ];

function PermissionsPanel({ id, canEdit, onSaved }) {
  const { data, isLoading, error, refetch } = useOne(['staff', id, 'permissions'], () => api.staff.permissions(id));
  const [grant, setGrant] = useState([]); const [revoke, setRevoke] = useState([]);
  useEffect(() => { if (data) { setGrant(data.granted); setRevoke(data.revoked); } }, [data]);
  const save = useAction((b) => api.staff.update(id, { permissionOverrides: b }), { invalidate: ['staff'], success: 'Đã cập nhật quyền', onSuccess: () => { refetch(); onSaved?.(); } });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const toggle = (list, set, p) => set(list.includes(p) ? list.filter((x) => x !== p) : [...list, p]);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Quyền hiện có = quyền cơ bản + quyền theo bộ phận <strong>{titleCase(data.department)}</strong> + quyền cấp thêm − quyền thu hồi. Quyền tài chính, giá phòng, báo cáo và quản lý người dùng không bao giờ cấp được cho nhân viên.</p>
      <div><p className="mb-2 text-xs font-medium text-muted">Quyền hiện có ({data.effective.length})</p><div className="flex flex-wrap gap-1.5">{data.effective.map((p) => <Badge key={p} tone={data.granted.includes(p) ? 'accent' : 'neutral'}>{p}</Badge>)}</div></div>
      {canEdit && (
        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset><legend className="mb-2 text-xs font-medium text-muted">Cấp thêm</legend><div className="space-y-1.5">{GRANTABLE.map((p) => <label key={p} className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-[rgb(var(--primary))]" checked={grant.includes(p)} onChange={() => toggle(grant, setGrant, p)} />{p}</label>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-xs font-medium text-muted">Thu hồi (ưu tiên hơn cấp thêm)</legend><div className="space-y-1.5">{data.effective.map((p) => <label key={p} className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-[rgb(var(--danger))]" checked={revoke.includes(p)} onChange={() => toggle(revoke, setRevoke, p)} />{p}</label>)}</div></fieldset>
        </div>
      )}
      {save.error && <Alert tone="danger">{save.error.code === 'PERMISSION_NOT_DELEGABLE' ? 'Bạn không thể cấp quyền mà chính bạn không có.' : save.error.message}</Alert>}
      {canEdit && <Button loading={save.loading} onClick={() => save.run({ grant, revoke })}>Lưu quyền</Button>}
    </div>
  );
}

function StaffDetail({ id, onClose }) {
  const { can, role } = useAuth();
  const { data: staff, isLoading, error, refetch } = useOne(['staff', id], () => api.staff.get(id), Boolean(id));
  const s = staff?.staff;
  const managers = useList('users', api.users.list, { role: 'MANAGER', limit: 100 }, { enabled: role === 'ADMIN' });
  const [tab, setTab] = useState('info'); const f = useForm({});
  useEffect(() => { if (s) f.reset({ fullName: s.fullName, department: s.department, jobTitle: s.jobTitle ?? '', managerId: s.managerId ?? '' }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const save = useAction((b) => api.staff.update(id, b), { invalidate: ['staff'], success: 'Đã cập nhật', onSuccess: refetch });
  const toggle = useAction((active) => (active ? api.users.reactivate(id) : api.users.deactivate(id)), { invalidate: ['staff', 'users'], success: 'Đã cập nhật trạng thái', onSuccess: refetch });
  const submit = () => { const v = f.values; const b = { fullName: v.fullName, department: v.department, jobTitle: v.jobTitle || null }; if (role === 'ADMIN') b.managerId = v.managerId || null; save.run(b); };
  return (
    <Modal open={Boolean(id)} onClose={onClose} size="lg" title={s ? `${s.fullName} · ${s.employeeCode}` : 'Nhân viên'}
      footer={s && can({ any: [P.USER_MANAGE_STAFF] }) && <Button variant={s.status === 'ACTIVE' ? 'danger' : 'primary'} loading={toggle.loading} onClick={() => toggle.run(s.status !== 'ACTIVE')}>{s.status === 'ACTIVE' ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt lại'}</Button>}>
      {isLoading ? <Loading /> : error ? <ErrorState error={error} onRetry={refetch} /> : !s ? <Loading /> : (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'info', label: 'Thông tin' }, { value: 'perm', label: 'Quyền' }]} />
          {tab === 'info' ? (
            <div className="space-y-5">
              <KeyValue items={[['Trạng thái', <StatusBadge key="s" status={s.status} />], ['Email', s.email], ['Điện thoại', s.phone], ['Quản lý trực tiếp', s.manager?.fullName ?? 'Chưa giao'], ['Đăng nhập gần nhất', dateTime(s.lastLoginAt)], ['Tạo lúc', dateTime(s.createdAt)]]} />
              <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">{save.error && <Alert tone="danger" className="sm:col-span-2">{save.error.message}</Alert>}
                <TextField label="Họ tên" {...f.bind('fullName')} /><SelectField label="Bộ phận" {...f.bind('department')}>{DEPTS.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</SelectField><TextField label="Chức danh" {...f.bind('jobTitle')} />
                {role === 'ADMIN' && <SelectField label="Quản lý trực tiếp" {...f.bind('managerId')}><option value="">Chưa giao</option>{managers.items.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</SelectField>}
                <div className="sm:col-span-2"><Button loading={save.loading} onClick={submit}>Lưu thay đổi</Button></div></div>
            </div>
          ) : <PermissionsPanel id={id} canEdit={can({ any: [P.STAFF_PERMISSIONS_MANAGE] })} onSaved={refetch} />}
        </>
      )}
    </Modal>
  );
}

export default function Staff() {
  const { can, role } = useAuth();
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('staff', api.staff.list, params);
  const managers = useList('users', api.users.list, { role: 'MANAGER', limit: 100 }, { enabled: role === 'ADMIN' });
  const [detail, setDetail] = useState(null); const [dlg, setDlg] = useState(null);
  const f = useForm({ fullName: '', email: '', phone: '', password: '', department: 'RECEPTION', jobTitle: '', managerId: '' });
  const mf = useForm({ fullName: '', email: '', phone: '', password: '' }); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const create = useAction(api.staff.create, { invalidate: ['staff', 'dashboard'], success: 'Đã tạo nhân viên', onSuccess: () => setDlg(null) });
  const createMgr = useAction(api.staff.createManager, { invalidate: ['users'], success: 'Đã tạo quản lý', onSuccess: () => setDlg(null) });
  const transfer = useAction(api.staff.transferStaff, { invalidate: ['staff'], success: (r) => r.message, onSuccess: () => setDlg(null) });
  const submit = () => { const v = f.values; create.run({ fullName: v.fullName, ...(v.email && { email: v.email }), ...(v.phone && { phone: v.phone }), password: v.password, department: v.department, ...(v.jobTitle && { jobTitle: v.jobTitle }), ...(role === 'ADMIN' && v.managerId && { managerId: v.managerId }) }); };
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
  return (
    <>
      <PageHeader title="Nhân viên" subtitle={role === 'MANAGER' ? 'Nhân viên thuộc nhóm của bạn.' : 'Toàn bộ nhân viên và quản lý.'} actions={<>{role === 'ADMIN' && <Button variant="secondary" onClick={() => { mf.reset({ fullName: '', email: '', phone: '', password: '' }); setDlg('manager'); }}>Thêm quản lý</Button>}{role === 'ADMIN' && <Button variant="secondary" onClick={() => { setFrom(''); setTo(''); setDlg('transfer'); }}>Chuyển nhóm</Button>}{can({ any: [P.USER_MANAGE_STAFF] }) && <Button icon={Plus} onClick={() => { f.reset({ fullName: '', email: '', phone: '', password: '', department: 'RECEPTION', jobTitle: '', managerId: '' }); setDlg('create'); }}>Thêm nhân viên</Button>}</>} />
      <Card>
        <FilterBar>
          <TextField label="Tìm kiếm" placeholder="Tên, email, mã NV…" value={params.search ?? ''} onChange={(e) => patch({ search: e.target.value || undefined })} />
          <SelectField label="Bộ phận" value={params.department ?? ''} onChange={(e) => patch({ department: e.target.value || undefined })}><option value="">Tất cả</option>{DEPTS.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</SelectField>
          <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option><option value="ACTIVE">Đang làm</option><option value="INACTIVE">Đã vô hiệu</option></SelectField>
          {role === 'ADMIN' && <SelectField label="Quản lý" value={params.managerId ?? ''} onChange={(e) => patch({ managerId: e.target.value || undefined })}><option value="">Tất cả</option>{managers.items.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</SelectField>}
        </FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} onRowClick={(s) => setDetail(s.id)} empty={<EmptyState title="Chưa có nhân viên" />} columns={[
          { key: 'c', header: 'Mã', render: (s) => <span className="font-mono text-xs">{s.employeeCode}</span> },
          { key: 'n', header: 'Họ tên', render: (s) => <span className="font-medium">{s.fullName}<span className="block text-xs font-normal text-muted">{s.email ?? s.phone}</span></span> },
          { key: 'd', header: 'Bộ phận', render: (s) => <Badge tone="primary">{titleCase(s.department)}</Badge> }, { key: 'j', header: 'Chức danh', render: (s) => s.jobTitle ?? '-' },
          { key: 'm', header: 'Quản lý', render: (s) => s.manager?.fullName ?? <span className="text-muted">Chưa giao</span> }, { key: 's', header: 'Trạng thái', render: (s) => <StatusBadge status={s.status} /> },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      <StaffDetail id={detail} onClose={() => setDetail(null)} />
      <Modal open={dlg === 'create'} onClose={() => setDlg(null)} size="lg" title="Thêm nhân viên" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={create.loading} onClick={submit}>Tạo tài khoản</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{create.error && <Alert tone="danger" className="sm:col-span-2">{create.error.code === 'ACCOUNT_EXISTS' ? 'Email hoặc số điện thoại đã được sử dụng.' : create.error.message}</Alert>}
          <TextField label="Họ tên" {...f.bind('fullName')} error={create.fields.fullName} /><SelectField label="Bộ phận" {...f.bind('department')}>{DEPTS.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</SelectField>
          <TextField label="Email" type="email" {...f.bind('email')} error={create.fields.email} /><TextField label="Số điện thoại" {...f.bind('phone')} error={create.fields.phone} />
          <TextField label="Mật khẩu ban đầu" type="password" hint="Hãy yêu cầu nhân viên đổi mật khẩu sau lần đăng nhập đầu." {...f.bind('password')} error={create.fields.password} /><TextField label="Chức danh" {...f.bind('jobTitle')} />
          {role === 'ADMIN' && <SelectField label="Quản lý trực tiếp" className="sm:col-span-2" {...f.bind('managerId')}><option value="">Chưa giao</option>{managers.items.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</SelectField>}
          {role === 'MANAGER' && <p className="text-xs text-muted sm:col-span-2">Nhân viên mới sẽ thuộc nhóm của bạn.</p>}</div>
      </Modal>
      <Modal open={dlg === 'manager'} onClose={() => setDlg(null)} title="Thêm quản lý" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={createMgr.loading} onClick={() => createMgr.run(clean(mf.values))}>Tạo</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{createMgr.error && <Alert tone="danger" className="sm:col-span-2">{createMgr.error.message}</Alert>}<TextField label="Họ tên" {...mf.bind('fullName')} error={createMgr.fields.fullName} /><TextField label="Mật khẩu" type="password" {...mf.bind('password')} error={createMgr.fields.password} /><TextField label="Email" type="email" {...mf.bind('email')} /><TextField label="Điện thoại" {...mf.bind('phone')} /></div>
      </Modal>
      <Modal open={dlg === 'transfer'} onClose={() => setDlg(null)} size="sm" title="Chuyển toàn bộ nhân viên sang quản lý khác" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={transfer.loading} disabled={!from || !to} onClick={() => transfer.run(from, to)}>Chuyển</Button></>}>
        <div className="space-y-4"><p className="text-sm text-muted">Cần thực hiện trước khi vô hiệu hóa một quản lý còn nhân viên đang làm.</p>{transfer.error && <Alert tone="danger">{transfer.error.message}</Alert>}
          <SelectField label="Từ quản lý" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">Chọn…</option>{managers.items.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</SelectField>
          <SelectField label="Sang quản lý" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Chọn…</option>{managers.items.filter((m) => m.id !== from && m.status === 'ACTIVE').map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</SelectField></div>
      </Modal>
    </>
  );
}
