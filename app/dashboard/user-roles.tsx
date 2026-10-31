"use client";
import { useEffect, useState } from "react";
import { api, User } from "../lib/api";

const labels: Record<string, string> = {
  admin: "Quản trị viên", manager: "Quản lý", receptionist: "Lễ tân",
  staff: "Nhân viên", member: "Thành viên",
};

export default function UserRoles({ currentId }: { currentId: number }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ name: string }[]>([]);
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([api<User[]>(`/users?limit=20&offset=${offset}`), api<{ name: string }[]>("/roles")])
      .then(([items, available]) => {
        if (!active) return;
        setUsers(items); setRoles(available);
        setSelected(Object.fromEntries(items.map(user => [user.id, user.roles])));
      }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Không tải được tài khoản."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset]);
  async function save(user: User) {
    setBusy(user.id); setError(""); setMessage("");
    try {
      const updated = await api<User>(`/users/${user.id}/roles`, {
        method: "PUT", body: JSON.stringify({ roles: selected[user.id] }),
      });
      setUsers(items => items.map(item => item.id === updated.id ? updated : item));
      setMessage(`Đã cập nhật vai trò cho ${updated.email}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Không lưu được vai trò."); }
    finally { setBusy(null); }
  }
  function page(next: number) { setLoading(true); setError(""); setMessage(""); setOffset(next); }
  return <section className="mt-6 rounded-2xl bg-white p-6 shadow">
    <h2 className="text-xl font-bold">Phân quyền tài khoản</h2>
    <p className="mt-2 text-sm text-slate-600">Tài khoản mới là Thành viên. Chọn vai trò phù hợp và bấm Lưu. Không thể tự đổi vai trò của mình.</p>
    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
    {message && <p role="status" className="mt-3 text-emerald-700">{message}</p>}
    {loading ? <p role="status" className="mt-4">Đang tải tài khoản…</p> : <div className="mt-4 space-y-4">
      {users.map(user => <fieldset key={user.id} disabled={user.id === currentId || busy !== null} className="rounded-xl border border-slate-200 p-4">
        <legend className="px-2 font-medium">{user.full_name} · {user.email}{user.id === currentId ? " (Bạn)" : ""}</legend>
        <div className="flex flex-wrap gap-4 py-2">{roles.map(role => <label key={role.name} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={(selected[user.id] ?? []).includes(role.name)}
            onChange={event => setSelected(previous => ({ ...previous, [user.id]: event.target.checked
              ? [...(previous[user.id] ?? []), role.name] : (previous[user.id] ?? []).filter(name => name !== role.name) }))} />
          {labels[role.name] ?? role.name}
        </label>)}</div>
        {user.id !== currentId && <button type="button" disabled={!selected[user.id]?.length || busy !== null}
          onClick={() => void save(user)} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
          {busy === user.id ? "Đang lưu…" : "Lưu vai trò"}</button>}
      </fieldset>)}
      {!users.length && <p>Không có tài khoản ở trang này.</p>}
    </div>}
    <div className="mt-4 flex items-center gap-4">
      <button disabled={loading || busy !== null || offset === 0} onClick={() => page(offset - 20)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trang trước</button>
      <span>Trang {offset / 20 + 1}</span>
      <button disabled={loading || busy !== null || users.length < 20} onClick={() => page(offset + 20)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trang sau</button>
    </div>
  </section>;
}
