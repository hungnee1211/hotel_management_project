import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { ConfirmDialog } from '../../components/domain.jsx';
import StaffSelect from '../../components/StaffSelect.jsx';
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, StatusBadge, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { dateKey, todayKey } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

export default function Shifts() {
  const { can } = useAuth(); const manage = can({ any: [P.SHIFT_MANAGE] });
  const { params, patch, setPage } = usePaging({ limit: 30, from: todayKey(-1), to: todayKey(14), sortBy: 'date', order: 'asc' });
  const { items, meta, isLoading, error, refetch } = useList('shifts', api.shifts.list, params);
  const staff = useList('staff', api.staff.list, { limit: 100 }, { enabled: manage });
  const names = Object.fromEntries(staff.items.map((s) => [s.id, s.fullName]));
  const [edit, setEdit] = useState(undefined); const [del, setDel] = useState(null); const f = useForm({});
  const opts = { invalidate: ['shifts'], onSuccess: () => { setEdit(undefined); setDel(null); } };
  const save = useAction((b) => (edit ? api.shifts.update(edit.id, b) : api.shifts.create(b)), { ...opts, success: 'Đã lưu ca làm' });
  const cancel = useAction(api.shifts.cancel, { ...opts, success: 'Đã hủy ca' });
  const open = (s) => { f.reset({ staffId: s?.staffId ?? '', date: s?.date ?? todayKey(1), startTime: s?.startTime ?? '08:00', endTime: s?.endTime ?? '16:00' }); setEdit(s ?? null); };
  return (
    <>
      <PageHeader title="Ca làm việc" subtitle="Giờ theo múi giờ khách sạn. Giờ kết thúc sớm hơn giờ bắt đầu nghĩa là ca qua đêm." actions={manage && <Button icon={Plus} onClick={() => open(null)}>Thêm ca</Button>} />
      <Card>
        <FilterBar><TextField label="Từ ngày" type="date" value={params.from} onChange={(e) => patch({ from: e.target.value })} /><TextField label="Đến ngày" type="date" value={params.to} onChange={(e) => patch({ to: e.target.value })} /></FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có ca trong khoảng này" />} columns={[
          { key: 'd', header: 'Ngày', render: (s) => <span className="font-medium">{dateKey(s.date)}</span> },
          ...(manage ? [{ key: 'st', header: 'Nhân viên', render: (s) => names[s.staffId] ?? s.staffId.slice(-6) }] : []),
          { key: 'dp', header: 'Bộ phận', render: (s) => s.department }, { key: 't', header: 'Giờ', render: (s) => `${s.startTime} – ${s.endTime}${s.endTime < s.startTime ? ' (+1 ngày)' : ''}` }, { key: 's', header: 'Trạng thái', render: (s) => <StatusBadge status={s.status} /> },
          ...(manage ? [{ key: 'a', header: '', align: 'right', render: (s) => s.status === 'SCHEDULED' && <span className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => open(s)}>Sửa</Button><Button size="sm" variant="ghost" onClick={() => setDel(s)}>Hủy ca</Button></span> }] : []),
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} size="sm" title={edit ? 'Sửa ca' : 'Thêm ca'} footer={<><Button variant="secondary" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.loading} onClick={() => save.run(edit ? { date: f.values.date, startTime: f.values.startTime, endTime: f.values.endTime } : f.values)}>Lưu</Button></>}>
        <div className="space-y-4">{save.error && <Alert tone="danger">{{ SHIFT_OVERLAP: 'Nhân viên đã có ca trùng giờ.', SHIFT_TOO_LONG: 'Một ca không dài quá 16 giờ.', SHIFT_HAS_ATTENDANCE: 'Ca đã có chấm công, không sửa được.' }[save.error.code] ?? save.error.message}</Alert>}
          {!edit && <StaffSelect label="Nhân viên" value={f.values.staffId} onChange={(e) => f.set('staffId', e.target.value)} />}<TextField label="Ngày bắt đầu" type="date" {...f.bind('date')} /><div className="grid grid-cols-2 gap-4"><TextField label="Giờ bắt đầu" type="time" {...f.bind('startTime')} /><TextField label="Giờ kết thúc" type="time" {...f.bind('endTime')} /></div></div>
      </Modal>
      <ConfirmDialog open={Boolean(del)} danger title="Hủy ca làm" confirmText="Hủy ca" description="Ca đã có chấm công thì không hủy được." loading={cancel.loading} onClose={() => setDel(null)} onConfirm={() => cancel.run(del.id)} />
    </>
  );
}
