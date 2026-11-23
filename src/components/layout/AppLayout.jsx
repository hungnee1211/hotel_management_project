import { useQuery } from '@tanstack/react-query';
import { Bell, Hotel, LogOut, Menu, UserCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { ThemeToggle } from '../../context/theme.jsx';
import { useAuth } from '../../context/auth.jsx';
import { titleCase } from '../../lib/format.js';
import { NAV } from '../../lib/nav.js';
import { cx } from '../ui/index.jsx';

function Sidebar({ onNavigate }) {
  const { can } = useAuth();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.rule)) })).filter((g) => g.items.length);
  return (
    <nav aria-label="Điều hướng chính" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface2 hover:text-fg')}>
                  <Icon className="h-4 w-4 shrink-0" />{label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const Brand = () => (
  <Link to="/" className="flex items-center gap-2.5 px-5 py-4"><span className="rounded-lg bg-primary p-1.5 text-primary-fg"><Hotel className="h-5 w-5" /></span><span className="text-base font-semibold tracking-tight">Hotel Manager</span></Link>
);

export default function AppLayout() {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);
  const unread = useQuery({ queryKey: ['notifications', 'unread'], queryFn: () => api.notifications.list({ unread: true, limit: 1 }), refetchInterval: 60_000, staleTime: 30_000 });
  const count = unread.data?.meta?.unread ?? 0;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex"><Brand /><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-fg/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-surface shadow-pop"><button aria-label="Đóng menu" className="absolute right-3 top-4 rounded-md p-1 text-muted" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button><Brand /><Sidebar onNavigate={() => setOpen(false)} /></aside>
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur sm:px-6">
          <button className="rounded-lg border border-line p-2 text-muted lg:hidden" aria-label="Mở menu" onClick={() => setOpen(true)}><Menu className="h-4 w-4" /></button>
          <div className="flex-1" />
          <Link to="/notifications" aria-label={`Thông báo${count ? `, ${count} chưa đọc` : ''}`} className="relative rounded-lg border border-line bg-surface p-2 text-muted transition hover:bg-surface2 hover:text-fg">
            <Bell className="h-4 w-4" />{count > 0 && <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-primary-fg">{count > 99 ? '99+' : count}</span>}
          </Link>
          <ThemeToggle />
          <Link to="/profile" className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 transition hover:bg-surface2">
            <UserCircle2 className="h-5 w-5 text-muted" /><span className="hidden text-left leading-tight sm:block"><span className="block text-sm font-medium">{user?.fullName}</span><span className="block text-[11px] text-muted">{titleCase(user?.role)}</span></span>
          </Link>
          <button onClick={async () => { await logout(); navigate('/login'); }} aria-label="Đăng xuất" className="rounded-lg border border-line bg-surface p-2 text-muted transition hover:bg-surface2 hover:text-danger"><LogOut className="h-4 w-4" /></button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6"><Outlet context={{ can }} /></main>
      </div>
    </div>
  );
}
