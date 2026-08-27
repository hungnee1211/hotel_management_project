"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên quá ngắn.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (form.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      alert("Đăng ký hợp lệ. Backend sẽ được tích hợp sau.");
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl grid md:grid-cols-2">
        <section className="hidden md:flex flex-col justify-between bg-slate-900 p-12 text-white">
          <div>
            <div className="text-3xl font-bold">
              HOTEL<span className="text-cyan-400">AI</span>
            </div>

            <h1 className="mt-16 text-4xl font-bold leading-tight">
              Bắt đầu xây dựng
              <br />
              khách sạn thông minh
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              Tạo tài khoản để sử dụng hệ thống quản lý khách sạn và trợ lý AI
              hỗ trợ vận hành.
            </p>

            <div className="mt-10 space-y-4 text-sm text-slate-300">
              <div>✓ Quản lý phòng tập trung</div>
              <div>✓ Theo dõi booking</div>
              <div>✓ Quản lý nhân viên và dịch vụ</div>
              <div>✓ Phân quyền tài khoản</div>
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
            Đăng ký
          </h2>

          <p className="mt-2 text-slate-500">
            Tạo tài khoản mới để truy cập hệ thống.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Họ và tên
              </label>

              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  updateField("fullName", e.target.value)
                }
                placeholder="Nguyễn Văn A"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />

              {errors.fullName && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.fullName}
                </p>
              )}
            </div>

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
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
                placeholder="name@hotel.com"
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
                value={form.password}
                onChange={(e) =>
                  updateField("password", e.target.value)
                }
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />

              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Xác nhận mật khẩu
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  updateField("confirmPassword", e.target.value)
                }
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />

              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                required
                className="mt-1 h-4 w-4"
              />

              <span>
                Tôi đồng ý với điều khoản sử dụng và chính sách của hệ thống.
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Tạo tài khoản
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-semibold text-cyan-600 hover:text-cyan-700"
            >
              Đăng nhập
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}