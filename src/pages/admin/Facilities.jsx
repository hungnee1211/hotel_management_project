import { Plus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index.js';
import { ConfirmDialog, MoneyField } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, SelectField, StatusBadge, Tabs, TextField, TextareaField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { dateKey, fromMinor, titleCase, toMinor } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const TYPES = ['GYM', 'RESTAURANT', 'KITCHEN', 'SWIMMING_POOL', 'SPA', 'RECEPTION', 'LAUNDRY', 'PARKING', 'OTHER'];
const DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const dayOf = (iso) => (iso ? iso.slice(0, 10) : '');

function EquipmentTable({ facilityId, canManage }) {
  const navigate = useNavigate();
  const { params, patch, setPage } = usePaging({ limit: 20, facilityId });
  const { items, meta, isLoading, error, refetch } = useList('equipment', api.equipment.list, { ...params, facilityId }, { enabled: true });
  const facilities = useList('facilities', api.facilities.list, { limit: 100 });
  const [edit, setEdit] = useState(undefined); const [retire, setRetire] = useState(null); const f = useForm({});
  const save = useAction((b) => (edit ? api.equipment.update(edit.id, b) : api.equipment.create(b)), { invalidate: ['equipment', 'facilities'], success: 'Đã lưu thiết bị', onSuccess: () => setEdit(undefined) });
  const ret = useAction(api.equipment.retire, { invalidate: ['equipment', 'facilities'], success: 'Đã cho nghỉ sử dụng', onSuccess: () => setRetire(null) });
  const open = (e) => { f.reset({ name: e?.name ?? '', facilityId: e?.facilityId ?? facilityId ?? '', category: e?.category ?? '', brand: e?.brand ?? '', model: e?.model ?? '', quantity: e?.quantity ?? 1, purchaseDate: dayOf(e?.purchaseDate), price: e?.purchasePriceMinor !== undefined ? fromMinor(e.purchasePriceMinor) : '', warranty: dayOf(e?.warrantyExpiration), interval: e?.maintenanceIntervalDays ?? '', status: e?.status ?? 'ACTIVE' }); setEdit(e ?? null); };
  const submit = () => {
    const v = f.values; const body = { name: v.name, category: v.category || undefined, brand: v.brand || undefined, model: v.model || undefined, quantity: Number(v.quantity) || 1 };
    if (!edit) body.facilityId = v.facilityId;
    if (v.purchaseDate) body.purchaseDate = new Date(v.purchaseDate).toISOString(); if (v.warranty) body.warrantyExpiration = new Date(v.warranty).toISOString();
    if (v.price) { const m = toMinor(v.price); if (m !== null) body.purchasePriceMinor = m; } if (v.interval) body.maintenanceIntervalDays = Number(v.interval);
    if (edit && ['ACTIVE', 'OUT_OF_SERVICE'].includes(edit.status) && v.status !== edit.status) body.status = v.status;
    save.run(body);
  };
  return (
    <Card>
      <FilterBar>
        <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['ACTIVE', 'IN_MAINTENANCE', 'DAMAGED', 'OUT_OF_SERVICE', 'RETIRED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        <TextField label="Tìm kiếm" placeholder="Tên, mã, hãng…" value={params.search ?? ''} onChange={(e) => patch({ search: e.target.value || undefined })} />
        <SelectField label="Bảo trì trong" value={params.maintenanceDueDays ?? ''} onChange={(e) => patch({ maintenanceDueDays: e.target.value || undefined })}><option value="">Tất cả</option><option value="7">7 ngày tới</option><option value="30">30 ngày tới</option></SelectField>
        {canManage && <Button icon={Plus} className="ml-auto" onClick={() => open(null)}>Thêm thiết bị</Button>}
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Chưa có thiết bị" />} columns={[
        { key: 'c', header: 'Mã', render: (e) => <span className="font-mono text-xs">{e.equipmentCode}</span> },
        { key: 'n', header: 'Thiết bị', render: (e) => <span className="font-medium">{e.name}<span className="block text-xs font-normal text-muted">{[e.brand, e.model].filter(Boolean).join(' ')} · SL {e.quantity}</span></span> },
        { key: 's', header: 'Trạng thái', render: (e) => <StatusBadge status={e.status} /> },
        { key: 'm', header: 'Bảo trì kế tiếp', render: (e) => (e.nextMaintenanceAt ? <span className={new Date(e.nextMaintenanceAt) < new Date() ? 'text-danger' : ''}>{dateKey(dayOf(e.nextMaintenanceAt))}</span> : '-') },
        { key: 'w', header: 'Bảo hành đến', render: (e) => (e.warrantyExpiration ? dateKey(dayOf(e.warrantyExpiration)) : '-') },
        { key: 'a', header: '', align: 'right', render: (e) => (
          <span className="flex justify-end gap-2">
            {e.status !== 'RETIRED' && <Button size="sm" variant="ghost" icon={Wrench} onClick={() => navigate('/maintenance', { state: { equipmentId: e.id, equipmentName: e.name } })}>Báo hỏng</Button>}
            {canManage && e.status !== 'RETIRED' && <><Button size="sm" variant="secondary" onClick={() => open(e)}>Sửa</Button><Button size="sm" variant="ghost" onClick={() => setRetire(e)}>Cho nghỉ</Button></>}
          </span>) },
      ]} />}
      <Pager meta={meta} onPage={setPage} />
      <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} size="lg" title={edit ? `Sửa ${edit.name}` : 'Thêm thiết bị'} footer={<><Button variant="secondary" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.loading} onClick={submit}>Lưu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{save.error && <Alert tone="danger" className="sm:col-span-2">{save.error.message}</Alert>}
          <TextField label="Tên" {...f.bind('name')} error={save.fields.name} />{!edit && <SelectField label="Cơ sở" {...f.bind('facilityId')}><option value="">Chọn…</option>{facilities.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField>}
          <TextField label="Nhóm" {...f.bind('category')} /><TextField label="Số lượng" type="number" min={1} {...f.bind('quantity')} /><TextField label="Hãng" {...f.bind('brand')} /><TextField label="Model" {...f.bind('model')} />
          <TextField label="Ngày mua" type="date" {...f.bind('purchaseDate')} /><MoneyField label="Giá mua" {...f.bind('price')} /><TextField label="Bảo hành đến" type="date" {...f.bind('warranty')} /><TextField label="Chu kỳ bảo trì (ngày)" type="number" min={1} {...f.bind('interval')} />
          {edit && ['ACTIVE', 'OUT_OF_SERVICE'].includes(edit.status) && <SelectField label="Trạng thái" {...f.bind('status')}><option value="ACTIVE">Hoạt động</option><option value="OUT_OF_SERVICE">Ngừng sử dụng</option></SelectField>}</div>
      </Modal>
      <ConfirmDialog open={Boolean(retire)} danger title="Cho thiết bị nghỉ sử dụng" confirmText="Xác nhận" description={`${retire?.name} sẽ chuyển sang 'Retired' và không sửa được nữa. Không thực hiện được nếu còn yêu cầu bảo trì mở.`} loading={ret.loading} onClose={() => setRetire(null)} onConfirm={() => ret.run(retire.id)} />
    </Card>
  );
}

export default function Facilities() {
  const { can, role } = useAuth();
  const [tab, setTab] = useState('facilities'); const [selected, setSelected] = useState(null);
  const { items, isLoading, error, refetch } = useList('facilities', api.facilities.list, { limit: 50, sortBy: 'name', order: 'asc' });
  const managers = useList('users', api.users.list, { role: 'MANAGER', limit: 50 }, { enabled: role === 'ADMIN' });
  const manage = can({ any: [P.FACILITY_MANAGE] }); const equipRead = can({ any: [P.EQUIPMENT_READ] });
  const [edit, setEdit] = useState(undefined); const [del, setDel] = useState(null); const f = useForm({}); const [hours, setHours] = useState([]);
  const save = useAction((b) => (edit ? api.facilities.update(edit.id, b) : api.facilities.create(b)), { invalidate: ['facilities'], success: 'Đã lưu cơ sở', onSuccess: () => setEdit(undefined) });
  const remove = useAction(api.facilities.remove, { invalidate: ['facilities'], success: 'Đã ngừng sử dụng cơ sở', onSuccess: () => setDel(null) });
  const open = (x) => { f.reset({ name: x?.name ?? '', type: x?.type ?? 'GYM', location: x?.location ?? '', description: x?.description ?? '', status: x?.status ?? 'OPEN', managerId: x?.managerId ?? '' }); setHours(DAYS.map((_, d) => { const h = x?.operatingHours?.find((o) => o.day === d); return { day: d, open: h?.open ?? '', close: h?.close ?? '' }; })); setEdit(x ?? null); };
  const submit = () => { const body = { name: f.values.name, type: f.values.type, location: f.values.location || undefined, description: f.values.description, status: f.values.status, operatingHours: hours.filter((h) => h.open && h.close) }; if (role === 'ADMIN') body.managerId = f.values.managerId || null; save.run(body); };

  return (
    <>
      <PageHeader title="Cơ sở & thiết bị" subtitle="Mỗi Manager phụ trách các cơ sở được giao." actions={manage && tab === 'facilities' && <Button icon={Plus} onClick={() => open(null)}>Thêm cơ sở</Button>} />
      <Tabs value={tab} onChange={(t) => { setTab(t); setSelected(null); }} tabs={[{ value: 'facilities', label: 'Cơ sở' }, ...(equipRead ? [{ value: 'equipment', label: 'Thiết bị' }] : [])]} />
      {tab === 'equipment' ? <EquipmentTable canManage={can({ any: [P.EQUIPMENT_MANAGE] })} /> : selected ? (
        <div className="space-y-4"><Button variant="secondary" onClick={() => setSelected(null)}>← Tất cả cơ sở</Button><Card><CardHeader title={selected.name} subtitle={`${titleCase(selected.type)} · ${selected.location ?? ''}`} actions={<StatusBadge status={selected.status} />} /></Card>{equipRead ? <EquipmentTable facilityId={selected.id} canManage={can({ any: [P.EQUIPMENT_MANAGE] })} /> : <Alert tone="info">Bạn không có quyền xem thiết bị.</Alert>}</div>
      ) : error ? <ErrorState error={error} onRetry={refetch} /> : (
        <Card><DataTable loading={isLoading} rows={items} onRowClick={setSelected} empty={<EmptyState title="Chưa có cơ sở" />} columns={[
          { key: 'n', header: 'Cơ sở', render: (x) => <span className="font-medium">{x.name}</span> }, { key: 't', header: 'Loại', render: (x) => <Badge tone="primary">{titleCase(x.type)}</Badge> }, { key: 'l', header: 'Vị trí', render: (x) => x.location ?? '-' },
          { key: 'h', header: 'Giờ mở cửa', render: (x) => (x.operatingHours?.length ? `${x.operatingHours.length}/7 ngày` : '-') }, { key: 's', header: 'Trạng thái', render: (x) => <StatusBadge status={x.status} /> },
          ...(manage ? [{ key: 'a', header: '', align: 'right', render: (x) => <span className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}><Button size="sm" variant="secondary" onClick={() => open(x)}>Sửa</Button><Button size="sm" variant="ghost" onClick={() => setDel(x)}>Ngừng</Button></span> }] : []),
        ]} /></Card>
      )}
      <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} size="lg" title={edit ? `Sửa ${edit.name}` : 'Thêm cơ sở'} footer={<><Button variant="secondary" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.loading} onClick={submit}>Lưu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{save.error && <Alert tone="danger" className="sm:col-span-2">{save.error.code === 'DUPLICATE_KEY' ? 'Tên cơ sở đã tồn tại.' : save.error.message}</Alert>}
          <TextField label="Tên" {...f.bind('name')} error={save.fields.name} /><SelectField label="Loại" {...f.bind('type')}>{TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</SelectField><TextField label="Vị trí" {...f.bind('location')} /><SelectField label="Trạng thái" {...f.bind('status')}><option value="OPEN">Mở cửa</option><option value="CLOSED">Đóng cửa</option><option value="MAINTENANCE">Bảo trì</option></SelectField>
          {role === 'ADMIN' && <SelectField label="Manager phụ trách" className="sm:col-span-2" {...f.bind('managerId')}><option value="">Chưa giao</option>{managers.items.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</SelectField>}
          <TextareaField label="Mô tả" className="sm:col-span-2" rows={2} {...f.bind('description')} />
          <div className="sm:col-span-2"><p className="mb-2 text-xs font-medium text-muted">Giờ hoạt động (để trống = đóng cửa)</p><div className="space-y-1.5">{hours.map((h, i) => <div key={h.day} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2"><span className="text-sm">{DAYS[h.day]}</span><input aria-label={`Mở ${DAYS[h.day]}`} type="time" className="input" value={h.open} onChange={(e) => setHours((l) => l.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} /><input aria-label={`Đóng ${DAYS[h.day]}`} type="time" className="input" value={h.close} onChange={(e) => setHours((l) => l.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} /></div>)}</div></div></div>
      </Modal>
      <ConfirmDialog open={Boolean(del)} danger title="Ngừng sử dụng cơ sở" confirmText="Ngừng" description={`Ngừng ${del?.name}? Cần cho nghỉ hết thiết bị và đóng yêu cầu bảo trì trước.`} loading={remove.loading} onClose={() => setDel(null)} onConfirm={() => remove.run(del.id)} />
      {remove.error && <Alert tone="danger" className="mt-4">{remove.error.code === 'FACILITY_IN_USE' ? 'Cơ sở còn thiết bị hoặc việc bảo trì đang mở.' : remove.error.message}</Alert>}
    </>
  );
}
