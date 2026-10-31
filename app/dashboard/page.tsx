"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, User } from "../lib/api";
import UserRoles from "./user-roles";

const permissionLabels: Record<string, string> = { "dashboard:read": "Xem Dashboard", "audit:read": "Xem nhật ký hoạt động", "users:manage": "Quản lý phân quyền tài khoản" };
const roleLabels: Record<string, string> = { admin: "Quản trị viên", manager: "Quản lý", receptionist: "Lễ tân", staff: "Nhân viên", member: "Thành viên" };

type Dashboard = { user: User; active_sessions: number; last_login_at: string | null; modules: string[] };
type Log = { id: number; user_id: number | null; action: string; created_at: string };

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const dashboard = await api<Dashboard>("/dashboard");
        if (cancelled) return;
        setData(dashboard);
        if (dashboard.user.permissions.includes("audit:read")) {
          const items = await api<Log[]>("/audit-logs");
          if (!cancelled) setLogs(items);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "Không tải được Dashboard.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    setBusy(true);
    try {
      await api("/auth/logout", { method: "POST" }, false);
      setData(null);
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đăng xuất được.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div><p className="text-2xl font-bold">HOTEL<span className="text-cyan-600">AI</span></p>
            <h1 className="mt-4 text-3xl font-bold">Dashboard</h1></div>
          <button disabled={busy} onClick={logout} className="rounded-xl bg-slate-900 px-5 py-3 text-white">Đăng xuất</button>
        </header>
        {error && <p role="alert" className="my-4 text-red-600">{error}</p>}
        {!data && !error && <p role="status">Đang tải thông tin…</p>}
        {data && <>
          <p className="mb-6">Xin chào, {data.user.full_name} · {data.user.email}</p>
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl bg-white p-6 shadow"><h2 className="text-slate-500">Vai trò</h2><p className="mt-3 text-xl font-semibold">{data.user.roles.map(role => roleLabels[role] ?? role).join(", ")}</p></article>
            <article className="rounded-2xl bg-white p-6 shadow"><h2 className="text-slate-500">Phiên đang hoạt động</h2><p className="mt-3 text-3xl font-semibold">{data.active_sessions}</p></article>
            <article className="rounded-2xl bg-white p-6 shadow"><h2 className="text-slate-500">Đăng nhập gần nhất</h2><p className="mt-3">{data.last_login_at ? new Date(data.last_login_at + "Z").toLocaleString("vi-VN") : "—"}</p></article>
          </section>
          <section className="mt-6 rounded-2xl bg-white p-6 shadow"><h2 className="text-xl font-bold">Quyền truy cập</h2><ul className="mt-3 space-y-2">{data.user.permissions.map(p => <li key={p}>{permissionLabels[p] ?? p}</li>)}</ul></section>
          {data.user.permissions.includes("audit:read") && <section className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">Nhật ký hoạt động gần đây</h2>
            <table className="mt-4 w-full text-left text-sm"><thead><tr><th className="p-2">Thời gian</th><th>Tài khoản</th><th>Hoạt động</th></tr></thead>
              <tbody>{logs.map(log => <tr key={log.id} className="border-t border-slate-100"><td className="p-2">{new Date(log.created_at + "Z").toLocaleString("vi-VN")}</td><td>{log.user_id ?? "—"}</td><td>{log.action}</td></tr>)}</tbody></table>
            {!logs.length && <p className="mt-3 text-slate-500">Chưa có hoạt động.</p>}
          </section>}
          {data.user.permissions.includes("users:manage") && <UserRoles currentId={data.user.id} />}
        </>}
      </div>
    </main>
  );
}
