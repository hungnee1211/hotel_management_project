import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { ApiError } from '../../api/client.js';
import { Alert, Button, TextField } from '../../components/ui/index.jsx';
import { useForm } from '../../hooks/index.js';
import AuthShell from './AuthShell.jsx';

export default function Register() {
  const navigate = useNavigate();
  const f = useForm({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(null); setBusy(true);
    const { email, phone, ...rest } = f.values;
    try {
      await api.auth.register({ ...rest, ...(email.trim() && { email: email.trim() }), ...(phone.trim() && { phone: phone.trim() }) });
      navigate('/verify', { state: { identifier: email.trim() || phone.trim(), notice: 'Chúng tôi đã gửi mã xác nhận 6 số. Nhập mã để kích hoạt tài khoản.' } });
    } catch (err) { setError(err); f.setErrors(err instanceof ApiError ? err.fields : {}); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Tạo tài khoản" subtitle="Dành cho khách đặt phòng. Nhập email hoặc số điện thoại (hoặc cả hai)." footer={<>Đã có tài khoản? <Link to="/login" className="link">Đăng nhập</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && !Object.keys(f.errors).length && <Alert tone="danger">{error.message}</Alert>}
        <TextField label="Họ và tên" autoComplete="name" required {...f.bind('fullName')} />
        <TextField label="Email" type="email" autoComplete="email" {...f.bind('email')} />
        <TextField label="Số điện thoại" type="tel" autoComplete="tel" placeholder="+84901234567" {...f.bind('phone')} />
        <TextField label="Mật khẩu" type="password" autoComplete="new-password" required hint="Tối thiểu 8 ký tự, gồm chữ và số." {...f.bind('password')} />
        <Button type="submit" loading={busy} className="w-full" size="lg">Đăng ký</Button>
      </form>
    </AuthShell>
  );
}
