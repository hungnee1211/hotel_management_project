import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client.js';
import { Alert, Button, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useForm } from '../../hooks/index.js';
import AuthShell from './AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const f = useForm({ identifier: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(null); setBusy(true);
    try { await login(f.values.identifier.trim(), f.values.password); navigate(state?.from ?? '/', { replace: true }); }
    catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_NOT_VERIFIED') return navigate('/verify', { state: { identifier: f.values.identifier.trim(), notice: err.message } });
      setError(err instanceof ApiError ? err : new Error('Không thể kết nối tới máy chủ'));
      f.setErrors(err instanceof ApiError ? err.fields : {});
    } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Đăng nhập" subtitle="Dùng email hoặc số điện thoại của bạn." footer={<>Chưa có tài khoản? <Link to="/register" className="link">Đăng ký</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="danger">{error.code === 'INVALID_CREDENTIALS' ? 'Email/số điện thoại hoặc mật khẩu không đúng.' : error.code === 'ACCOUNT_DISABLED' ? 'Tài khoản đã bị vô hiệu hóa.' : error.message}</Alert>}
        <TextField label="Email hoặc số điện thoại" autoComplete="username" autoFocus required {...f.bind('identifier')} />
        <TextField label="Mật khẩu" type="password" autoComplete="current-password" required {...f.bind('password')} />
        <Button type="submit" loading={busy} className="w-full" size="lg">Đăng nhập</Button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="link">Quên mật khẩu?</Link></p>
      </form>
    </AuthShell>
  );
}
