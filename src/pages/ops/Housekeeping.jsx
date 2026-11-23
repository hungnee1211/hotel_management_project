import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { PromptDialog } from '../../components/domain.jsx';
import StaffSelect from '../../components/StaffSelect.jsx';
import { Alert, Button, Card, Checkbox, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, SelectField, StatusBadge, Tabs, TextareaField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { dateTime, titleCase } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const TYPES = ['CHECKOUT_CLEAN', 'DAILY_CLEAN', 'DEEP_CLEAN', 'INSPECTION'];

export default function Housekeeping() {
  const { can, user } = useAuth();
  const [tab, setTab] = useState('tasks');
  const { params, patch, setPage } = usePaging({ limit: 20 });
  const tasks = useList('housekeeping', api.housekeeping.tasks, params, { refetchInterval: 20_000 });
  const rooms = useList('housekeeping-rooms', api.housekeeping.rooms, { limit: 50 }, { enabled: tab === 'rooms' });
  const roomNames = useList('rooms', api.rooms.list, { limit: 100, sortBy: 'roomNumber', order: 'asc' });
  const byId = Object.fromEntries(roomNames.items.map((r) => [r.id, r.roomNumber]));
  const [dlg, setDlg] = useState(null);
  const f = useForm({ roomId: '', taskType: 'DAILY_CLEAN', priority: 'MEDIUM', assignedStaffId: '', notes: '' });
  const [assignee, setAssignee] = useState(''); const [passed, setPassed] = useState(true); const [damage, setDamage] = useState(true);
  const opts = { invalidate: ['housekeeping', 'housekeeping-rooms', 'rooms'], onSuccess: () => setDlg(null) };
  const create = useAction(api.housekeeping.createTask, { ...opts, success: 'Đã tạo công việc' });
  const assign = useAction(api.housekeeping.assign, { ...opts, success: 'Đã phân công' });
  const start = useAction(api.housekeeping.start, { ...opts, success: 'Đã bắt đầu dọn' });
  const complete = useAction(api.housekeeping.complete, { ...opts, success: 'Đã dọn xong, chờ kiểm tra' });
  const inspect = useAction(api.housekeeping.inspect, { ...opts, success: 'Đã ghi kết quả kiểm tra' });
  const report = useAction(api.housekeeping.damage, { ...opts, success: 'Đã báo hư hỏng' });
  const canAssign = can({ any: [P.HOUSEKEEPING_ASSIGN] }); const canWork = can({ any: [P.HOUSEKEEPING_UPDATE] }); const canInspect = can({ any: [P.HOUSEKEEPING_INSPECT] });
  const mine = (t) => t.assignedStaffId === user.id;

  return (
    <>
      <PageHeader title="Buồng phòng" subtitle="Phòng chỉ quay lại kho sau khi dọn xong và được kiểm tra." actions={canAssign && <Button icon={Plus} onClick={() => { f.reset({ roomId: '', taskType: 'DAILY_CLEAN', priority: 'MEDIUM', assignedStaffId: '', notes: '' }); setDlg({ type: 'create' }); }}>Tạo công việc</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'tasks', label: canAssign ? 'Công việc' : 'Việc của tôi' }, { value: 'rooms', label: 'Phòng chưa sẵn sàng' }]} />
      {tab === 'tasks' ? (
        <Card>
          <FilterBar><SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField></FilterBar>
          {tasks.error ? <ErrorState error={tasks.error} onRetry={tasks.refetch} /> : <DataTable loading={tasks.isLoading} rows={tasks.items} empty={<EmptyState title="Không có công việc" />} columns={[
            { key: 'r', header: 'Phòng', render: (t) => <span className="font-medium">{byId[t.roomId] ?? t.roomId.slice(-4)}</span> },
            { key: 't', header: 'Loại', render: (t) => titleCase(t.taskType) },
            { key: 'p', header: 'Ưu tiên', render: (t) => <StatusBadge status={t.priority} /> },
            { key: 's', header: 'Trạng thái', render: (t) => <StatusBadge status={t.status} /> },
            { key: 'c', header: 'Cập nhật', render: (t) => <span className="whitespace-nowrap text-muted">{dateTime(t.completedAt ?? t.startedAt ?? t.createdAt)}</span> },
            { key: 'a', header: '', align: 'right', render: (t) => (
              <span className="flex flex-wrap justify-end gap-2">
                {canAssign && ['PENDING', 'ASSIGNED'].includes(t.status) && <Button size="sm" variant="secondary" onClick={() => { setAssignee(t.assignedStaffId ?? ''); setDlg({ type: 'assign', t }); }}>Phân công</Button>}
                {canWork && ['PENDING', 'ASSIGNED'].includes(t.status) && (mine(t) || (!t.assignedStaffId) || canAssign) && <Button size="sm" loading={start.loading} onClick={() => start.run(t.id)}>Bắt đầu</Button>}
                {canWork && t.status === 'IN_PROGRESS' && (mine(t) || canAssign) && <Button size="sm" loading={complete.loading} onClick={() => complete.run(t.id, {})}>Hoàn thành</Button>}
                {canInspect && t.status === 'COMPLETED' && !mine(t) && <Button size="sm" onClick={() => { setPassed(true); setDlg({ type: 'inspect', t }); }}>Kiểm tra</Button>}
                {canWork && !['CANCELLED', 'INSPECTED'].includes(t.status) && <Button size="sm" variant="ghost" onClick={() => { setDamage(true); setDlg({ type: 'damage', t }); }}>Báo hư hỏng</Button>}
              </span>) },
          ]} />}
          <Pager meta={tasks.meta} onPage={setPage} />
        </Card>
      ) : (
        <Card><DataTable loading={rooms.isLoading} rows={rooms.items} empty={<EmptyState title="Mọi phòng đều đã sẵn sàng" />} columns={[
          { key: 'n', header: 'Phòng', render: (r) => <span className="font-medium">{r.roomNumber}<span className="ml-2 text-xs font-normal text-muted">tầng {r.floor}</span></span> },
          { key: 't', header: 'Loại', render: (r) => r.roomType }, { key: 's', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> }, { key: 'h', header: 'Vệ sinh', render: (r) => <StatusBadge status={r.housekeepingStatus} /> },
        ]} /><Pager meta={rooms.meta} onPage={() => {}} /></Card>
      )}

      <Modal open={dlg?.type === 'create'} onClose={() => setDlg(null)} title="Tạo công việc buồng phòng" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={create.loading} disabled={!f.values.roomId} onClick={() => create.run({ roomId: f.values.roomId, taskType: f.values.taskType, priority: f.values.priority, ...(f.values.assignedStaffId && { assignedStaffId: f.values.assignedStaffId }), ...(f.values.notes && { notes: f.values.notes }) })}>Tạo</Button></>}>
        <div className="space-y-4">{create.error && <Alert tone="danger">{create.error.message}</Alert>}
          <SelectField label="Phòng" {...f.bind('roomId')}><option value="">Chọn phòng…</option>{roomNames.items.map((r) => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}</SelectField>
          <div className="grid grid-cols-2 gap-4"><SelectField label="Loại" {...f.bind('taskType')}>{TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</SelectField><SelectField label="Ưu tiên" {...f.bind('priority')}>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</SelectField></div>
          <StaffSelect department="HOUSEKEEPING" label="Phân công (tuỳ chọn)" value={f.values.assignedStaffId} onChange={(e) => f.set('assignedStaffId', e.target.value)} /><TextareaField label="Ghi chú" {...f.bind('notes')} /></div>
      </Modal>
      <Modal open={dlg?.type === 'assign'} onClose={() => setDlg(null)} title="Phân công" size="sm" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={assign.loading} disabled={!assignee} onClick={() => assign.run(dlg.t.id, assignee)}>Phân công</Button></>}>
        <div className="space-y-4">{assign.error && <Alert tone="danger">{assign.error.code === 'INVALID_ASSIGNEE' ? 'Nhân viên không hợp lệ hoặc không thuộc nhóm của bạn.' : assign.error.message}</Alert>}<StaffSelect department="HOUSEKEEPING" label="Nhân viên buồng phòng" value={assignee} onChange={(e) => setAssignee(e.target.value)} /></div>
      </Modal>
      <PromptDialog open={dlg?.type === 'inspect'} title="Kiểm tra phòng" label="Ghi chú" minLength={0} confirmText="Ghi kết quả" loading={inspect.loading} onClose={() => setDlg(null)} onConfirm={(notes) => inspect.run(dlg.t.id, { passed, ...(notes && { notes }) })} extra={<Checkbox checked={passed} onChange={(e) => setPassed(e.target.checked)} label="Đạt yêu cầu (phòng được đưa trở lại kho)" />} />
      <PromptDialog open={dlg?.type === 'damage'} title="Báo hư hỏng" label="Mô tả hư hỏng" loading={report.loading} onClose={() => setDlg(null)} onConfirm={(description) => report.run(dlg.t.id, { description, createMaintenance: damage })} extra={<Checkbox checked={damage} onChange={(e) => setDamage(e.target.checked)} label="Tạo luôn yêu cầu bảo trì cho phòng" />} />
    </>
  );
}
