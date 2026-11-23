import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { ConfirmDialog, MoneyField } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, SelectField, StatusBadge, Tabs, TextField, TextareaField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { fromMinor, money, titleCase, toMinor } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function RoomsTab({ manage, types }) {
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'roomNumber', order: 'asc' });
  const { items, meta, isLoading, error, refetch } = useList('rooms', api.rooms.list, params);
  const [edit, setEdit] = useState(undefined); const [statusFor, setStatusFor] = useState(null); const [del, setDel] = useState(null);
  const f = useForm({}); const sf = useForm({ status: 'MAINTENANCE', reason: '' });
  useEffect(() => { if (edit !== undefined) f.reset({ roomNumber: edit?.roomNumber ?? '', floor: edit?.floor ?? 1, roomTypeId: edit?.roomType?.id ?? '', amenities: (edit?.amenities ?? []).join(', '), notes: edit?.notes ?? '' }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);
  const save = useAction((b) => (edit ? api.rooms.update(edit.id, b) : api.rooms.create(b)), { invalidate: ['rooms'], success: 'Đã lưu phòng', onSuccess: () => setEdit(undefined) });
  const setSt = useAction(api.rooms.setStatus, { invalidate: ['rooms'], success: 'Đã đổi trạng thái', onSuccess: () => setStatusFor(null) });
  const remove = useAction(api.rooms.remove, { invalidate: ['rooms'], success: 'Đã xóa phòng', onSuccess: () => setDel(null), silent: false });
  return (
    <Card>
      <FilterBar>
        <SelectField label="Loại phòng" value={params.roomTypeId ?? ''} onChange={(e) => patch({ roomTypeId: e.target.value || undefined })}><option value="">Tất cả</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</SelectField>
        <SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        <SelectField label="Vệ sinh" value={params.housekeepingStatus ?? ''} onChange={(e) => patch({ housekeepingStatus: e.target.value || undefined })}><option value="">Tất cả</option>{['DIRTY', 'CLEANING', 'CLEAN', 'INSPECTED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField>
        <TextField label="Tầng" type="number" value={params.floor ?? ''} onChange={(e) => patch({ floor: e.target.value || undefined })} />
        <TextField label="Tìm số phòng" value={params.search ?? ''} onChange={(e) => patch({ search: e.target.value || undefined })} />
        {manage && <Button icon={Plus} className="ml-auto" onClick={() => setEdit(null)}>Thêm phòng</Button>}
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có phòng" />} columns={[
        { key: 'n', header: 'Phòng', render: (r) => <span className="font-medium">{r.roomNumber}<span className="ml-2 text-xs font-normal text-muted">tầng {r.floor}</span></span> },
        { key: 't', header: 'Loại', render: (r) => r.roomType?.name },
        { key: 'p', header: 'Giá cơ bản', align: 'right', render: (r) => money(r.roomType?.basePriceMinor) },
        { key: 's', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'h', header: 'Vệ sinh', render: (r) => <StatusBadge status={r.housekeepingStatus} /> },
        ...(manage ? [{ key: 'a', header: '', align: 'right', render: (r) => <span className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setEdit(r)}>Sửa</Button><Button size="sm" variant="ghost" onClick={() => { sf.reset({ status: r.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE', reason: '' }); setStatusFor(r); }}>Trạng thái</Button><Button size="sm" variant="ghost" aria-label="Xóa" onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></Button></span> }] : []),
      ]} />}
      <Pager meta={meta} onPage={setPage} />
      <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} title={edit ? `Sửa phòng ${edit.roomNumber}` : 'Thêm phòng'} footer={<><Button variant="secondary" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.loading} onClick={() => save.run({ roomNumber: f.values.roomNumber, floor: Number(f.values.floor), roomTypeId: f.values.roomTypeId, amenities: csv(f.values.amenities), notes: f.values.notes })}>Lưu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{save.error?.code === 'DUPLICATE_KEY' && <Alert tone="danger" className="sm:col-span-2">Số phòng đã tồn tại.</Alert>}
          <TextField label="Số phòng" {...f.bind('roomNumber')} error={save.fields.roomNumber} /><TextField label="Tầng" type="number" {...f.bind('floor')} error={save.fields.floor} />
          <SelectField label="Loại phòng" className="sm:col-span-2" {...f.bind('roomTypeId')} error={save.fields.roomTypeId}><option value="">Chọn…</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</SelectField>
          <TextField label="Tiện nghi riêng (phẩy)" className="sm:col-span-2" {...f.bind('amenities')} /><TextareaField label="Ghi chú nội bộ" className="sm:col-span-2" {...f.bind('notes')} /></div>
      </Modal>
      <Modal open={Boolean(statusFor)} onClose={() => setStatusFor(null)} title={`Trạng thái phòng ${statusFor?.roomNumber}`} size="sm" footer={<><Button variant="secondary" onClick={() => setStatusFor(null)}>Hủy</Button><Button loading={setSt.loading} onClick={() => setSt.run(statusFor.id, sf.values)}>Lưu</Button></>}>
        <div className="space-y-4">{setSt.error && <Alert tone="danger">{setSt.error.message}</Alert>}<SelectField label="Trạng thái mới" {...sf.bind('status')}><option value="AVAILABLE">Sẵn sàng</option><option value="MAINTENANCE">Bảo trì</option><option value="OUT_OF_SERVICE">Ngừng sử dụng</option></SelectField><TextField label="Lý do" {...sf.bind('reason')} /><p className="text-xs text-muted">"Có khách" và "Đang dọn" do nhận/trả phòng và buồng phòng tự đặt.</p></div>
      </Modal>
      <ConfirmDialog open={Boolean(del)} title="Xóa phòng" danger confirmText="Xóa" description={`Xóa phòng ${del?.roomNumber}? Không xóa được nếu còn đặt phòng sắp tới hoặc việc đang mở.`} loading={remove.loading} onClose={() => setDel(null)} onConfirm={() => remove.run(del.id)} />
    </Card>
  );
}

function TypesTab({ manage, pricing }) {
  const { items, isLoading, error, refetch } = useList('room-types', api.roomTypes.list, { limit: 50 });
  const [edit, setEdit] = useState(undefined);
  const f = useForm({}); const [rates, setRates] = useState([]);
  useEffect(() => { if (edit !== undefined) { f.reset({ name: edit?.name ?? '', description: edit?.description ?? '', capacity: edit?.capacity ?? 2, bedConfiguration: edit?.bedConfiguration ?? '', amenities: (edit?.amenities ?? []).join(', '), price: edit ? fromMinor(edit.basePriceMinor) : '', status: edit?.status ?? 'ACTIVE' }); setRates((edit?.rates ?? []).map((r) => ({ name: r.name ?? '', from: r.from, to: r.to, price: fromMinor(r.priceMinor) }))); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);
  const save = useAction((b) => (edit ? api.roomTypes.update(edit.id, b) : api.roomTypes.create(b)), { invalidate: ['room-types', 'rooms'], success: 'Đã lưu loại phòng', onSuccess: () => setEdit(undefined) });
  const submit = () => {
    const base = toMinor(f.values.price); if (base === null) return;
    const body = { name: f.values.name, description: f.values.description, capacity: Number(f.values.capacity), bedConfiguration: f.values.bedConfiguration || undefined, amenities: csv(f.values.amenities), status: f.values.status };
    if (pricing) { body.basePriceMinor = base; body.rates = rates.filter((r) => r.from && r.to && toMinor(r.price) !== null).map((r) => ({ ...(r.name && { name: r.name }), from: r.from, to: r.to, priceMinor: toMinor(r.price) })); }
    save.run(body);
  };
  return (
    <Card>
      <FilterBar>{manage && <Button icon={Plus} className="ml-auto" onClick={() => setEdit(null)}>Thêm loại phòng</Button>}</FilterBar>
      {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Chưa có loại phòng" />} onRowClick={manage ? setEdit : undefined} columns={[
        { key: 'n', header: 'Loại', render: (t) => <span className="font-medium">{t.name}</span> },
        { key: 'c', header: 'Sức chứa', render: (t) => `${t.capacity} khách` },
        { key: 'p', header: 'Giá cơ bản/đêm', align: 'right', render: (t) => money(t.basePriceMinor) },
        { key: 'r', header: 'Giá theo mùa', render: (t) => (t.rates?.length ? <Badge tone="accent">{t.rates.length} mức</Badge> : '-') },
        { key: 'a', header: 'Tiện nghi', render: (t) => <span className="text-xs text-muted">{t.amenities.join(', ')}</span> },
        { key: 's', header: 'Trạng thái', render: (t) => <StatusBadge status={t.status} /> },
      ]} />}
      <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} size="lg" title={edit ? `Sửa ${edit.name}` : 'Thêm loại phòng'} footer={<><Button variant="secondary" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.loading} onClick={submit}>Lưu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {save.error && <Alert tone="danger" className="sm:col-span-2">{save.error.code === 'RATE_OVERLAP' ? 'Các mức giá theo mùa không được chồng lấn.' : save.error.message}</Alert>}
          <TextField label="Tên loại" {...f.bind('name')} error={save.fields.name} /><TextField label="Sức chứa" type="number" min={1} {...f.bind('capacity')} />
          <MoneyField label="Giá cơ bản / đêm" disabled={!pricing} {...f.bind('price')} /><TextField label="Cấu hình giường" {...f.bind('bedConfiguration')} />
          <TextField label="Tiện nghi (phẩy)" className="sm:col-span-2" {...f.bind('amenities')} /><TextareaField label="Mô tả" className="sm:col-span-2" {...f.bind('description')} />
          <SelectField label="Trạng thái" {...f.bind('status')}><option value="ACTIVE">Đang bán</option><option value="INACTIVE">Ngừng bán</option></SelectField>
          {pricing && <div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted">Giá theo mùa (ghi đè giá cơ bản trong khoảng ngày)</p><Button size="sm" variant="secondary" icon={Plus} onClick={() => setRates((r) => [...r, { name: '', from: '', to: '', price: '' }])}>Thêm mức</Button></div>
            {rates.map((r, i) => <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2"><TextField label={i === 0 ? 'Tên' : undefined} value={r.name} onChange={(e) => setRates((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /><TextField label={i === 0 ? 'Từ ngày' : undefined} type="date" value={r.from} onChange={(e) => setRates((l) => l.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} /><TextField label={i === 0 ? 'Đến ngày' : undefined} type="date" value={r.to} onChange={(e) => setRates((l) => l.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} /><TextField label={i === 0 ? 'Giá/đêm' : undefined} value={r.price} onChange={(e) => setRates((l) => l.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} /><Button variant="ghost" size="sm" aria-label="Xóa mức" onClick={() => setRates((l) => l.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
        </div>
      </Modal>
    </Card>
  );
}

export default function Rooms() {
  const { can } = useAuth();
  const [tab, setTab] = useState('rooms');
  const manage = can({ any: [P.ROOM_MANAGE] }); const pricing = can({ any: [P.ROOM_PRICING_MANAGE] });
  const types = useList('room-types', api.roomTypes.list, { limit: 50 });
  return (
    <>
      <PageHeader title="Phòng & loại phòng" subtitle={manage ? 'Quản lý danh mục phòng, giá và trạng thái.' : 'Danh sách phòng (chỉ xem).'} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'rooms', label: 'Phòng' }, { value: 'types', label: 'Loại phòng & giá' }]} />
      {tab === 'rooms' ? <RoomsTab manage={manage} types={types.items} /> : <TypesTab manage={manage} pricing={pricing} />}
    </>
  );
}
