let refreshing: Promise<Response> | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const request = () => fetch(`/api${path}`, {
    ...options, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Requested-With": "HotelApp", ...options.headers },
  });
  let response: Response;
  try {
    response = await request();
    if (response.status === 401 && retry && !path.startsWith("/auth/")) {
      refreshing ??= fetch("/api/auth/refresh", {
        method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "HotelApp" },
      }).finally(() => { refreshing = null; });
      const refresh = await refreshing;
      if (refresh.ok) response = await request();
    }
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Vui lòng thử lại.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(typeof data?.detail === "string" ? data.detail :
      response.status === 422 ? "Thông tin không hợp lệ. Vui lòng kiểm tra lại." :
      "Máy chủ chưa sẵn sàng. Vui lòng thử lại.", response.status);
  }
  return data as T;
}

export type User = { id: number; email: string; full_name: string; roles: string[]; permissions: string[] };
