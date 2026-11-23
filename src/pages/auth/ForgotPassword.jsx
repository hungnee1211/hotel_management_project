import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { ApiError } from '../../api/client.js';
import { Alert, Button, TextField } from '../../components/ui/index.jsx';
import { useToast } from '../../context/toast.jsx';
import { useForm } from '../../hooks/index.js';
import AuthShell from './AuthShell.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate(); const toast = useToast();
  const [step, setStep] = useState(1);
  const f = useForm({ identifier: '', otp: '', newPassword: '' });
  const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const run = async (fn, after) => { setError(null); setBusy(true); try { await fn(); after(); } catch (err) { setError(err); f.setErrors(err instanceof ApiError ? err.fields : {}); } finally { setBusy(false); } };

  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle={step === 1 ? 'Nhập email hoặc số điện thoại đã đăng ký.' : 'Nhập mã chúng tôi đã gửi và mật khẩu mới.'} footer={<Link to="/login" className="link">Quay lại đăng nhập</Link>}>
      {error && <Alert tone="danger" className="mb-4">{error.message}</Alert>}
      {step === 1 ? (
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => api.auth.forgotPassword(f.values.identifier.trim()), () => { toast.info('Nếu tài khoản tồn tại, mã đặt lại đã được gửi.'); setStep(2); }); }}>
          <TextField label="Email hoặc số điện thoại" required autoFocus {...f.bind('identifier')} />
          <Button type="submit" loading={busy} className="w-full" size="lg">Gửi mã</Button>
        </form>
      ) : (
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => api.auth.resetPassword({ identifier: f.values.identifier.trim(), otp: f.values.otp.trim(), newPassword: f.values.newPassword }), () => { toast.success('Đã đặt lại mật khẩu. Hãy đăng nhập lại.'); navigate('/login'); }); }}>
          <TextField label="Mã xác nhận" inputMode="numeric" maxLength={6} required {...f.bind('otp')} />
          <TextField label="Mật khẩu mới" type="password" autoComplete="new-password" required hint="Tối thiểu 8 ký tự, gồm chữ và số." {...f.bind('newPassword')} />
          <Button type="submit" loading={busy} className="w-full" size="lg">Đặt lại mật khẩu</Button>
          <p className="text-center text-sm text-muted"><button type="button" onClick={() => setStep(1)} className="link">Gửi lại mã</button></p>
        </form>
      )}
    </AuthShell>
  );
}
