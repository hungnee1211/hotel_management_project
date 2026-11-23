import { ShieldAlert } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth.jsx';
import { Loading } from '../ui/index.jsx';

/** Signed-in users only; everyone else goes to /login and comes back afterwards. */
export function RequireAuth() {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <Loading label="Đang kiểm tra phiên đăng nhập…" />;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
}
export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  return status === 'authenticated' ? <Navigate to="/" replace /> : <Outlet />;
}
export const Forbidden = () => (
  <div className="flex flex-col items-center gap-3 py-24 text-center"><ShieldAlert className="h-10 w-10 text-warning" /><h1 className="text-xl">Bạn không có quyền truy cập trang này</h1><p className="max-w-md text-sm text-muted">Liên hệ quản lý nếu bạn cần quyền này. Máy chủ luôn kiểm tra quyền, ẩn menu chỉ là để gọn giao diện.</p></div>
);
/** Page-level permission gate: <Can rule={{ any: [P.X] }}><Page/></Can> */
export function Can({ rule, children }) {
  const { can } = useAuth();
  return can(rule) ? children : <Forbidden />;
}
