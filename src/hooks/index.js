import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ApiError } from '../api/client.js';
import { useToast } from '../context/toast.jsx';

/** Paginated list: returns { items, meta, isLoading, error, refetch }. Keeps the previous page visible while the next loads. */
export const useList = (key, fn, params, options = {}) => {
  const q = useQuery({ queryKey: [key, params], queryFn: () => fn(params), placeholderData: keepPreviousData, ...options });
  return { items: q.data?.data ?? [], meta: q.data?.meta, isLoading: q.isLoading, error: q.error, refetch: q.refetch, isFetching: q.isFetching };
};
/** Single resource: returns { data, isLoading, error, refetch }. */
export const useOne = (key, fn, enabled = true, options = {}) => {
  const q = useQuery({ queryKey: key, queryFn: fn, enabled, ...options });
  return { data: q.data?.data, meta: q.data?.meta, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
};

/**
 * Runs a mutation with consistent UX: success toast, error toast (plus field errors for forms), cache invalidation.
 *   const save = useAction(api.rooms.create, { invalidate: ['rooms'], success: 'Đã tạo phòng' });
 *   await save.run(body)   // resolves to the envelope, or null if it failed (the error is in save.error)
 */
export const useAction = (fn, { invalidate = [], success, onSuccess, silent } = {}) => {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({ mutationFn: (args) => fn(...(Array.isArray(args) ? args : [args])) });
  const run = useCallback(async (...args) => {
    try {
      const res = await m.mutateAsync(args);
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] })));
      if (success) toast.success(typeof success === 'function' ? success(res) : success);
      onSuccess?.(res);
      return res;
    } catch (e) {
      if (!silent) toast.error(e instanceof ApiError ? e.message : 'Không thể kết nối tới máy chủ');
      return null;
    }
  }, [m, qc, invalidate, success, onSuccess, toast, silent]);
  return { run, loading: m.isPending, error: m.error, fields: m.error instanceof ApiError ? m.error.fields : {}, reset: m.reset };
};

/** Tiny form state: bind('name') gives { value, onChange, error }. */
export const useForm = (initial = {}) => {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = useCallback((k, v) => setValues((s) => ({ ...s, [k]: v })), []);
  const bind = (name) => ({ name, value: values[name] ?? '', error: errors[name], onChange: (e) => set(name, e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e) });
  const reset = useCallback((next = initial) => { setValues(next); setErrors({}); }, [initial]);
  return { values, set, bind, errors, setErrors, reset, setValues };
};

export const usePaging = (initial = {}) => {
  const [params, setParams] = useState({ page: 1, limit: 20, ...initial });
  const patch = useCallback((p) => setParams((s) => ({ ...s, page: 1, ...p })), []);
  const setPage = useCallback((page) => setParams((s) => ({ ...s, page })), []);
  return { params, patch, setPage };
};
