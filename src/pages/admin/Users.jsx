import { useState } from 'react';
import { api } from '../../api/index.js';
import { ConfirmDialog } from '../../components/domain.jsx';
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, SelectField, StatusBadge, TextField } from '../../components/ui/index.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { dateTime, titleCase } from '../../lib/format.js';

export default function Users() {
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('users', api.users.list, params);
  const [dlg, setDlg] = useState(null); const f = useForm({ fullName: '' });
  const opts = { invalidate: ['users', 'staff'], onSuccess: () => setDlg(null) };
  const deact = useAction(api.users.deactivate, { ...opts, success: 'Đã vô hiệu hóa' });
  const react = useAction(api.users.reactivate, { ...opts, success: 'Đã kích hoạt lại' });
  const remove = useAction(api.users.remove, { ...opts, success: 'Đã xóa tài khoản' });
  const edit = useAction((id, b) => api.users.update(id, b), { ...opts, success: 'Đã cập nhật' });
  const err = deact.error ?? remove.error;
  return (
    <>
      <PageHeader title="Tài khoản" subtitle="Tất cả tài khoản. Tài khoản Admin được bảo vệ, không sửa được bởi Admin khác." />
      <Card>
        <FilterBar>
          <TextField label="Tìm kiếm" placeholder="Tên, email, điện thoại…" value={params.search ?? ''} onChange={(e) => patch({ search: e.target.value || undefined })} />
          <SelectField label="Vai trò" value={params.role ?? ''} onChange={(e) => patch({ role: e.target.value || undefined })}><option value="">Tất cả</option>{['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</SelectField>
          <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Vô hiệu</option></SelectField>
        </FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có tài khoản" />} columns={[
          { key: 'n', header: 'Họ tên', render: (u) => <span className="font-medium">{u.fullName}<span className="block text-xs font-normal text-muted">{u.email ?? u.phone}</span></span> },
          { key: 'r', header: 'Vai trò', render: (u) => titleCase(u.role) }, { key: 'v', header: 'Xác nhận', render: (u) => (u.isVerified ? 'Có' : 'Chưa') },
          { key: 's', header: 'Trạng thái', render: (u) => <StatusBadge status={u.status} /> }, { key: 'l', header: 'Đăng nhập gần nhất', render: (u) => dateTime(u.lastLoginAt) },
          { key: 'a', header: '', align: 'right', render: (u) => u.role === 'ADMIN' ? <span className="text-xs text-muted">Được bảo vệ</span> : (
            <span className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => { f.reset({ fullName: u.fullName }); setDlg({ type: 'edit', u }); }}>Sửa</Button>
              {u.status === 'ACTIVE' ? <Button size="sm" variant="ghost" onClick={() => setDlg({ type: 'deact', u })}>Vô hiệu</Button> : <Button size="sm" variant="ghost" loading={react.loading} onClick={() => react.run(u.id)}>Kích hoạt</Button>}
              <Button size="sm" variant="ghost" onClick={() => setDlg({ type: 'del', u })}>Xóa</Button>
            </span>) },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      {err && <Alert tone="danger" className="mt-4">{err.code === 'MANAGER_HAS_ACTIVE_STAFF' ? 'Quản lý này còn nhân viên đang làm. Hãy chuyển nhóm sang quản lý khác trước (trang Nhân viên → Chuyển nhóm).' : err.message}</Alert>}
      <Modal open={dlg?.type === 'edit'} onClose={() => setDlg(null)} size="sm" title="Sửa tài khoản" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={edit.loading} onClick={() => edit.run(dlg.u.id, { fullName: f.values.fullName })}>Lưu</Button></>}><TextField label="Họ tên" {...f.bind('fullName')} /><p className="mt-3 text-xs text-muted">Vai trò, email và số điện thoại không đổi được tại đây.</p></Modal>
      <ConfirmDialog open={dlg?.type === 'deact'} danger title="Vô hiệu hóa tài khoản" confirmText="Vô hiệu hóa" description={`${dlg?.u.fullName} sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được.`} loading={deact.loading} onClose={() => setDlg(null)} onConfirm={() => deact.run(dlg.u.id)} />
      <ConfirmDialog open={dlg?.type === 'del'} danger title="Xóa tài khoản" confirmText="Xóa" description={`Xóa ${dlg?.u.fullName}? Tài khoản bị ẩn; email/số điện thoại vẫn được giữ chỗ và lịch sử không mất.`} loading={remove.loading} onClose={() => setDlg(null)} onConfirm={() => remove.run(dlg.u.id)} />
    </>
  );
}
