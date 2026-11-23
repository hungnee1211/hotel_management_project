import { Hotel } from 'lucide-react';
import { ThemeToggle } from '../../context/theme.jsx';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-fg lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-primary-fg/15 p-2"><Hotel className="h-6 w-6" /></span><span className="text-lg font-semibold">Hotel Manager</span></div>
        <div><h2 className="text-4xl font-semibold leading-tight">Đặt phòng, lưu trú và thanh toán<br />trong một hệ thống.</h2><p className="mt-4 max-w-md text-primary-fg/80">Theo dõi phòng trống theo từng đêm, gọi món tại phòng, hóa đơn hợp nhất và báo cáo doanh thu chính xác đến từng đồng.</p></div>
        <p className="text-xs text-primary-fg/70">© Hotel Management System</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary-fg/10" />
      </div>
      <div className="flex flex-col bg-page">
        <div className="flex justify-end p-4"><ThemeToggle /></div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl">{title}</h1>{subtitle && <p className="mb-6 mt-1.5 text-sm text-muted">{subtitle}</p>}
            {children}
            {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
