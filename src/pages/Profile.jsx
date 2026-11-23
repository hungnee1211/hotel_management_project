import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { Alert, Button, Card, CardHeader, KeyValue, PageHeader, StatusBadge, Tabs, TextField } from '../components/ui/index.jsx';
import { useAuth } from '../context/auth.jsx';
import { useAction, useForm } from '../hooks/index.js';
import { dateTime, titleCase } from '../lib/format.js';

export default function Profile() {
  const { user, permissions, reload, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');
  const info = useForm({ fullName: user.fullName, avatar: user.avatar ?? '' });
  const pw = useForm({ currentPassword: '', newPassword: '' });
  const del = useForm({ password: '' });

  const save = useAction(api.auth.updateMe, { success: 'Đã cập nhật hồ sơ', onSuccess: reload });
  const change = useAction(api.auth.changePassword, { success: 'Đã đổi mật khẩu. Hãy đăng nhập lại.', onSuccess: async () => { await logout(); navigate('/login'); } });
  const all = useAction(api.auth.logoutAll, { success: 'Đã đăng xuất khỏi mọi thiết bị', onSuccess: async () => { await logout(); navigate('/login'); } });
  const deact = useAction(api.auth.deactivate, { success: 'Tài khoản đã được vô hiệu hóa', onSuccess: async () => { await logout(); navigate('/login'); } });

  return (
    <>
      <PageHeader title="Hồ sơ của tôi" subtitle={user.email ?? user.phone} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'info', label: 'Thông tin' }, { value: 'security', label: 'Bảo mật' }, { value: 'danger', label: 'Vô hiệu hóa' }]} />
      {tab === 'info' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader title="Thông tin cá nhân" />
            <form className="space-y-4 p-5" onSubmit={async (e) => { e.preventDefault(); info.setErrors({}); const r = await save.run({ fullName: info.values.fullName, avatar: info.values.avatar || null }); if (!r) info.setErrors(save.fields); }}>
              <TextField label="Họ và tên" {...info.bind('fullName')} error={info.errors.fullName ?? save.fields.fullName} />
              <TextField label="Ảnh đại diện (URL https)" placeholder="https://…" {...info.bind('avatar')} error={save.fields.avatar} />
              <Button type="submit" loading={save.loading}>Lưu thay đổi</Button>
            </form></Card>
          <Card><CardHeader title="Tài khoản" /><div className="p-5"><KeyValue items={[['Vai trò', titleCase(user.role)], ['Trạng thái', <StatusBadge key="s" status={user.status} />], ['Email', user.email], ['Điện thoại', user.phone], ['Đăng nhập gần nhất', dateTime(user.lastLoginAt)], ['Số quyền hiện có', permissions.length]]} /></div></Card>
        </div>
      )}
      {tab === 'security' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader title="Đổi mật khẩu" subtitle="Sau khi đổi, mọi thiết bị sẽ phải đăng nhập lại." />
            <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); change.run(pw.values); }}>
              <TextField label="Mật khẩu hiện tại" type="password" autoComplete="current-password" {...pw.bind('currentPassword')} error={change.fields.currentPassword} />
              <TextField label="Mật khẩu mới" type="password" autoComplete="new-password" hint="Tối thiểu 8 ký tự, gồm chữ và số." {...pw.bind('newPassword')} error={change.fields.newPassword} />
              <Button type="submit" loading={change.loading}>Đổi mật khẩu</Button>
            </form></Card>
          <Card><CardHeader title="Phiên đăng nhập" /><div className="space-y-3 p-5"><p className="text-sm text-muted">Đăng xuất khỏi mọi trình duyệt và thiết bị đang đăng nhập, kể cả phiên hiện tại.</p><Button variant="secondary" loading={all.loading} onClick={() => all.run()}>Đăng xuất mọi thiết bị</Button></div></Card>
        </div>
      )}
      {tab === 'danger' && (
        <Card className="max-w-xl border-danger/40"><CardHeader title="Vô hiệu hóa tài khoản" subtitle="Bạn sẽ không đăng nhập được nữa. Quản lý hoặc Admin có thể kích hoạt lại." />
          <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); deact.run(del.values.password); }}>
            <Alert tone="warning">Hành động này đăng xuất bạn ngay lập tức.</Alert>
            <TextField label="Nhập mật khẩu để xác nhận" type="password" {...del.bind('password')} error={deact.fields.password} />
            <Button type="submit" variant="danger" loading={deact.loading} disabled={!del.values.password}>Vô hiệu hóa tài khoản</Button>
          </form></Card>
      )}
    </>
  );
}
