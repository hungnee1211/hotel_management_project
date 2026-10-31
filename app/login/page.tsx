"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setMessage("");

    const newErrors: {
      email?: string;
      password?: string;
    } = {};

    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setBusy(true);
      try {
        await api("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password, remember }) });
        router.replace("/dashboard");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra.");
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center text-slate-900">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl grid md:grid-cols-2">
        <section className="hidden md:flex flex-col justify-between bg-slate-900 p-12 text-white">
          <div>
            <div className="text-3xl font-bold">
              HOTEL<span className="text-cyan-400">AI</span>
            </div>

            <h1 className="mt-16 text-4xl font-bold leading-tight">
              Quản lý khách sạn
              <br />
              thông minh hơn
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              Quản lý phòng, booking, khách hàng, dịch vụ, nhân viên và vận hành
              khách sạn trên cùng một hệ thống.
            </p>

            <div className="mt-10 space-y-4 text-sm text-slate-300">
              <div>✓ Quản lý phòng và booking</div>
              <div>✓ Check-in / Check-out</div>
              <div>✓ Quản lý dịch vụ và nhân viên</div>
              <div>✓ Trợ lý AI hỗ trợ vận hành</div>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            Hotel Management System
          </p>
        </section>

        <section className="p-8 sm:p-12">
          <div className="mb-8 text-2xl font-bold text-slate-900 md:hidden">
            HOTEL<span className="text-cyan-500">AI</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900">
            Đăng nhập
          </h2>

          <p className="mt-2 text-slate-500">
            Đăng nhập để truy cập hệ thống quản lý khách sạn.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    email: undefined,
                  }));
                }}
                placeholder="admin@hotel.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />

              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Mật khẩu
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    password: undefined,
                  }));
                }}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />

              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4"
                />
                Ghi nhớ đăng nhập
              </label>

              <button
                type="button"
                onClick={() => setMessage("Vui lòng liên hệ quản trị viên để được hỗ trợ khôi phục tài khoản.")}
                className="font-medium text-cyan-600 hover:text-cyan-700"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Đăng nhập
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-semibold text-cyan-600 hover:text-cyan-700"
            >
              Đăng ký ngay
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
