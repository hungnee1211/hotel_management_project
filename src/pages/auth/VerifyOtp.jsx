import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { ApiError } from '../../api/client.js';
import { Alert, Button, TextField } from '../../components/ui/index.jsx';
import { useToast } from '../../context/toast.jsx';
import { useForm } from '../../hooks/index.js';
import AuthShell from './AuthShell.jsx';

export default function VerifyOtp() {
  const { state } = useLocation(); const navigate = useNavigate(); const toast = useToast();
  const f = useForm({ identifier: state?.identifier ?? '', otp: '' });
  const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(null); setBusy(true);
    try { await api.auth.verifyOtp({ identifier: f.values.identifier.trim(), otp: f.values.otp.trim() }); toast.success('Tài khoản đã được kích hoạt. Hãy đăng nhập.'); navigate('/login'); }
    catch (err) { setError(err); f.setErrors(err instanceof ApiError ? err.fields : {}); } finally { setBusy(false); }
  };
  const resend = async () => { try { await api.auth.resendOtp(f.values.identifier.trim()); toast.info('Nếu tài khoản tồn tại và chưa xác nhận, một mã mới đã được gửi.'); } catch (err) { toast.error(err.message); } };
  return (
    <AuthShell title="Xác nhận tài khoản" subtitle="Nhập mã gồm 6 chữ số. Mã hết hạn sau 5 phút." footer={<Link to="/login" className="link">Quay lại đăng nhập</Link>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {state?.notice && <Alert tone="info">{state.notice}</Alert>}
        {error && <Alert tone="danger">{error.code === 'OTP_ATTEMPTS_EXCEEDED' ? 'Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới.' : error.message}</Alert>}
        <TextField label="Email hoặc số điện thoại" required {...f.bind('identifier')} />
        <TextField label="Mã xác nhận" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required className="tracking-[0.4em]" {...f.bind('otp')} />
        <Button type="submit" loading={busy} className="w-full" size="lg">Xác nhận</Button>
        <p className="text-center text-sm text-muted">Chưa nhận được mã? <button type="button" onClick={resend} className="link">Gửi lại</button></p>
      </form>
    </AuthShell>
  );
}
