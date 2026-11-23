/** Error from the API envelope { success:false, message, code, errors:[{field,message}] }. */
export class ApiError extends Error {
  constructor(status, body = {}) {
    super(body.message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code || 'ERROR';
    this.errors = Array.isArray(body.errors) ? body.errors : [];
    this.requestId = body.requestId;
    /** { fieldName: message } where fieldName is the last path segment ("body.password" -> "password"). */
    this.fields = Object.fromEntries(this.errors.filter((e) => e.field).map((e) => [e.field.split('.').slice(1).join('.') || e.field, e.message]));
  }
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) { if (v.length) p.set(k, v.join(',')); } else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
};

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/logout'];

/**
 * HTTP client for the backend.
 *  - credentials are cookies only (HTTP-only), never localStorage;
 *  - every request carries X-Requested-With (the backend's CSRF rule for cookie auth);
 *  - on 401 it refreshes the session ONCE (concurrent requests share one refresh) and retries.
 */
export const createClient = ({ baseUrl = '/api', fetchImpl = (...a) => fetch(...a), onSessionExpired = () => {} } = {}) => {
  let refreshing = null;
  const refresh = () => (refreshing ??= send('POST', '/auth/refresh').finally(() => { refreshing = null; }));

  async function send(method, path, { params, body, headers, blob } = {}) {
    const res = await fetchImpl(`${baseUrl}${path}${qs(params)}`, {
      method,
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (blob && res.ok) return { blob: await res.blob(), filename: /filename="?([^";]+)/.exec(res.headers.get('content-disposition') ?? '')?.[1] };
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) throw new ApiError(res.status, json ?? {});
    return { data: json?.data ?? null, meta: json?.meta, message: json?.message };
  }

  async function request(method, path, opts) {
    try {
      return await send(method, path, opts);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401 || AUTH_PATHS.includes(path)) throw err;
      try { await refresh(); } catch { onSessionExpired(); throw err; }
      return send(method, path, opts); // retry once with the fresh cookies
    }
  }

  return {
    get: (path, params) => request('GET', path, { params }),
    post: (path, body, opts) => request('POST', path, { body: body ?? {}, ...opts }),
    patch: (path, body) => request('PATCH', path, { body }),
    del: (path) => request('DELETE', path),
    download: (path) => request('GET', path, { blob: true }),
  };
};
