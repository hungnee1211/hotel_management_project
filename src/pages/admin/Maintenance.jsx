import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/index.js';
import { MoneyField, PromptDialog } from '../../components/domain.jsx';
import StaffSelect from '../../components/StaffSelect.jsx';
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, SelectField, StatusBadge, TextField, TextareaField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { dateTime, money, titleCase, toMinor, todayKey } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

export default function Maintenance() {
  const { can, user } = useAuth(); const { state } = useLocation();
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('maintenance', api.maintenance.list, params, { refetchInterval: 30_000 });
  const manage = can({ any: [P.MAINTENANCE_MANAGE] }); const equipRead = can({ any: [P.EQUIPMENT_READ] });
  const equipment = useList('equipment', api.equipment.list, { limit: 100, sortBy: 'name', order: 'asc' }, { enabled: equipRead });
  const facilities = useList('facilities', api.facilities.list, { limit: 100 });
  const rooms = useList('rooms', api.rooms.list, { limit: 100, sortBy: 'roomNumber', order: 'asc' }, { enabled: manage });
  const [dlg, setDlg] = useState(null); const [assignee, setAssignee] = useState('');
  const f = useForm({ target: 'equipment', equipmentId: '', facilityId: '', roomId: '', title: '', description: '', priority: 'MEDIUM', preventive: false, scheduledFor: '', blockFrom: '', blockTo: '' });
  const cf = useForm({ cost: '', resolution: '' });
  useEffect(() => { if (state?.equipmentId) { f.reset({ ...f.values, target: 'equipment', equipmentId: state.equipmentId, title: `Hỏng: ${state.equipmentName}` }); setDlg({ type: 'create' }); window.history.replaceState({}, ''); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const opts = { invalidate: ['maintenance', 'equipment', 'rooms', 'dashboard'], onSuccess: () => setDlg(null) };
  const create = useAction(api.maintenance.create, { ...opts, success: 'Đã tạo yêu cầu bảo trì' });
  const assign = useAction(api.maintenance.assign, { ...opts, success: 'Đã giao việc' });
  const start = useAction(api.maintenance.start, { ...opts, success: 'Đã bắt đầu' });
  const complete = useAction(api.maintenance.complete, { ...opts, success: 'Đã hoàn thành' });
  const cancel = useAction(api.maintenance.cancel, { ...opts, success: 'Đã hủy yêu cầu' });
  const mine = (m) => m.assignedStaffId === user.id;

  const submit = () => {
    const v = f.values; const body = { title: v.title, priority: v.priority, ...(v.description && { description: v.description }) };
    if (v.target === 'equipment' && v.equipmentId) body.equipmentId = v.equipmentId; if (v.target === 'facility' && v.facilityId) body.facilityId = v.facilityId;
    if (v.target === 'room' && v.roomId) { body.roomId = v.roomId; if (v.blockFrom && v.blockTo) { body.blockFrom = v.blockFrom; body.blockTo = v.blockTo; } }
    if (v.preventive) { body.type = 'PREVENTIVE'; if (v.scheduledFor) body.scheduledFor = new Date(v.scheduledFor).toISOString(); }
    create.run(body);
  };

  return (
    <>
      <PageHeader title="Bảo trì" subtitle="Thiết bị bị báo hỏng được đánh dấu 'Damaged' ngay; phòng có thể bị chặn khỏi kho trong thời gian sửa." actions={<Button icon={Plus} onClick={() => { f.reset({ target: equipRead ? 'equipment' : 'facility', equipmentId: '', facilityId: '', roomId: '', title: '', description: '', priority: 'MEDIUM', preventive: false, scheduledFor: '', blockFrom: todayKey(), blockTo: todayKey(1) }); setDlg({ type: 'create' }); }}>Báo sự cố / tạo yêu cầu</Button>} />
      <Card>
        <FilterBar>
          <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
          <SelectField label="Ưu tiên" value={params.priority ?? ''} onChange={(e) => patch({ priority: e.target.value || undefined })}><option value="">Tất cả</option>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
          <SelectField label="Loại" value={params.type ?? ''} onChange={(e) => patch({ type: e.target.value || undefined })}><option value="">Tất cả</option><option value="CORRECTIVE">Sửa chữa</option><option value="PREVENTIVE">Định kỳ</option></SelectField>
        </FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có yêu cầu bảo trì" />} columns={[
          { key: 'c', header: 'Mã', render: (m) => <span className="font-mono text-xs">{m.requestCode}</span> },
          { key: 't', header: 'Nội dung', render: (m) => <span className="font-medium">{m.title}<span className="block text-xs font-normal text-muted">{titleCase(m.type)}{m.blockFrom ? ` · chặn phòng ${m.blockFrom} → ${m.blockTo}` : ''}</span></span> },
          { key: 'p', header: 'Ưu tiên', render: (m) => <StatusBadge status={m.priority} /> }, { key: 's', header: 'Trạng thái', render: (m) => <StatusBadge status={m.status} /> },
          { key: 'k', header: 'Chi phí', align: 'right', render: (m) => (m.actualCostMinor ? money(m.actualCostMinor) : '-') }, { key: 'd', header: 'Tạo lúc', render: (m) => <span className="whitespace-nowrap text-muted">{dateTime(m.createdAt)}</span> },
          { key: 'a', header: '', align: 'right', render: (m) => (
            <span className="flex flex-wrap justify-end gap-2">
              {manage && ['PENDING', 'ASSIGNED'].includes(m.status) && <Button size="sm" variant="secondary" onClick={() => { setAssignee(m.assignedStaffId ?? ''); setDlg({ type: 'assign', m }); }}>Giao việc</Button>}
              {m.status === 'ASSIGNED' && (mine(m) || manage) && <Button size="sm" loading={start.loading} onClick={() => start.run(m.id)}>Bắt đầu</Button>}
              {m.status === 'IN_PROGRESS' && (mine(m) || manage) && <Button size="sm" onClick={() => { cf.reset({ cost: '', resolution: '' }); setDlg({ type: 'complete', m }); }}>Hoàn thành</Button>}
              {(manage || (m.reportedBy === user.id && m.status === 'PENDING')) && ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(m.status) && <Button size="sm" variant="ghost" onClick={() => setDlg({ type: 'cancel', m })}>Hủy</Button>}
            </span>) },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>

      <Modal open={dlg?.type === 'create'} onClose={() => setDlg(null)} size="lg" title="Yêu cầu bảo trì" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={create.loading} disabled={f.values.title.length < 3} onClick={submit}>Gửi</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{create.error && <Alert tone="danger" className="sm:col-span-2">{create.error.code === 'ROOM_HAS_BOOKINGS' ? 'Phòng đang có khách đặt trong khoảng thời gian này, không thể chặn.' : create.error.message}</Alert>}
          <TextField label="Tiêu đề" className="sm:col-span-2" {...f.bind('title')} error={create.fields.title} />
          <SelectField label="Đối tượng" {...f.bind('target')}>{equipRead && <option value="equipment">Thiết bị</option>}<option value="facility">Cơ sở</option>{manage && <option value="room">Phòng</option>}</SelectField>
          {f.values.target === 'equipment' && <SelectField label="Thiết bị" {...f.bind('equipmentId')}><option value="">Chọn…</option>{equipment.items.filter((e) => e.status !== 'RETIRED').map((e) => <option key={e.id} value={e.id}>{e.name} ({e.equipmentCode})</option>)}</SelectField>}
          {f.values.target === 'facility' && <SelectField label="Cơ sở" {...f.bind('facilityId')}><option value="">Chọn…</option>{facilities.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField>}
          {f.values.target === 'room' && <SelectField label="Phòng" {...f.bind('roomId')}><option value="">Chọn…</option>{rooms.items.map((r) => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}</SelectField>}
          <SelectField label="Mức ưu tiên" {...f.bind('priority')}>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</SelectField>
          <TextareaField label="Mô tả" className="sm:col-span-2" rows={3} {...f.bind('description')} />
          {f.values.target === 'room' && manage && <><TextField label="Chặn phòng từ ngày" type="date" {...f.bind('blockFrom')} /><TextField label="Đến (không gồm ngày này)" type="date" {...f.bind('blockTo')} /></>}
          {manage && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={Boolean(f.values.preventive)} onChange={(e) => f.set('preventive', e.target.checked)} />Bảo trì định kỳ (lên lịch trước)</label>}
          {f.values.preventive && <TextField label="Ngày dự kiến" type="datetime-local" {...f.bind('scheduledFor')} />}</div>
      </Modal>
      <Modal open={dlg?.type === 'assign'} onClose={() => setDlg(null)} size="sm" title="Giao việc bảo trì" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={assign.loading} disabled={!assignee} onClick={() => assign.run(dlg.m.id, assignee)}>Giao</Button></>}>
        <div className="space-y-4">{assign.error && <Alert tone="danger">{assign.error.code === 'INVALID_ASSIGNEE' ? 'Nhân viên không thuộc bộ phận bảo trì hoặc không thuộc nhóm của bạn.' : assign.error.message}</Alert>}<StaffSelect department="MAINTENANCE" label="Kỹ thuật viên" value={assignee} onChange={(e) => setAssignee(e.target.value)} /></div>
      </Modal>
      <Modal open={dlg?.type === 'complete'} onClose={() => setDlg(null)} size="sm" title="Hoàn thành bảo trì" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={complete.loading} onClick={() => complete.run(dlg.m.id, { ...(cf.values.cost && toMinor(cf.values.cost) !== null && { actualCostMinor: toMinor(cf.values.cost) }), ...(cf.values.resolution && { resolution: cf.values.resolution }) })}>Hoàn thành</Button></>}>
        <div className="space-y-4"><p className="text-sm text-muted">Hệ thống ghi lịch sử sửa chữa, đưa thiết bị về trạng thái hoạt động và mở lại phòng nếu đang bị chặn.</p><MoneyField label="Chi phí thực tế" {...cf.bind('cost')} /><TextareaField label="Kết quả xử lý" rows={3} {...cf.bind('resolution')} /></div>
      </Modal>
      <PromptDialog open={dlg?.type === 'cancel'} title="Hủy yêu cầu bảo trì" danger confirmText="Hủy yêu cầu" minLength={0} label="Ghi chú (tuỳ chọn)" loading={cancel.loading} onClose={() => setDlg(null)} onConfirm={() => cancel.run(dlg.m.id)} />
    </>
  );
}
