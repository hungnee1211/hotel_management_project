import { api } from '../api/index.js';
import { useList } from '../hooks/index.js';
import { SelectField } from './ui/index.jsx';

/** Active staff of a department (only Admin/Manager can list staff; the API scopes managers to their own team). */
export default function StaffSelect({ department, label = 'Nhân viên', value, onChange, error }) {
  const { items } = useList('staff', api.staff.list, { department, status: 'ACTIVE', limit: 100, sortBy: 'fullName', order: 'asc' });
  return (
    <SelectField label={label} value={value} onChange={onChange} error={error}>
      <option value="">Chọn nhân viên…</option>
      {items.map((s) => <option key={s.id} value={s.id}>{s.fullName} · {s.employeeCode}</option>)}
    </SelectField>
  );
}
