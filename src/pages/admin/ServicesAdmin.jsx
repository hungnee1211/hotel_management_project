import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { MoneyField } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, Checkbox, DataTable, EmptyState, ErrorState, Modal, Pager, PageHeader, SelectField, StatusBadge, TextField, TextareaField } from '../../components/ui/index.jsx';
import { useAction, useForm, useList, usePaging } from '../../hooks/index.js';
import { fromMinor, money, titleCase, toMinor } from '../../lib/format.js';

const CATS = ['LAUNDRY', 'SPA', 'TRANSPORT', 'DECORATION', 'EXTRA_BED', 'OTHER'];
const PRICING = { FIXED: 'Giá cố định', PER_PERSON: 'Theo người', PER_HOUR: 'Theo giờ', PER_UNIT: 'Theo đơn vị' };

export default function ServicesAdmin() {
  const { params, setPage } = usePaging({ limit: 20, sortBy: 'name', order: 'asc' });
  const { items, meta, isLoading, error, refetch } = useList('services', api.services.list, params);
  const [edit, setEdit] = useState(undefined); const f = useForm({});
  const save = useAction((b) => (edit ? api.services.update(edit.id, b) : api.services.create(b)), { invalidate: ['services'], success: 'Đã lưu dịch vụ', onSuccess: () => setEdit(undefined) });
  const open = (s) => { f.reset({ name: s?.name ?? '', description: s?.description ?? '', category: s?.category ?? 'OTHER', price: s ? fromMinor(s.priceMinor) : '', pricingType: s?.pricingType ?? 'FIXED', availability: s?.availability ?? true, status: s?.status ?? 'ACTIVE' }); setEdit(s ?? null); };
  return (
    <>
      <PageHeader title="Danh mục dịch vụ" subtitle="Giá được lưu cùng yêu cầu của khách, đổi giá không làm thay đổi yêu cầu cũ." actions={<Button icon={Plus} onClick={() => open(null)}>Thêm dịch vụ</Button>} />
      <Card>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} onRowClick={open} empty={<EmptyState title="Chưa có dịch vụ" />} columns={[
          { key: 'n', header: 'Dịch vụ', render: (s) => <span className="font-medium">{s.name}</span> }, { key: 'c', header: 'Nhóm', render: (s) => <Badge tone="primary">{titleCase(s.category)}</Badge> },
          { key: 'p', header: 'Giá', align: 'right', render: (s) => money(s.priceMinor) }, { key: 't', header: 'Cách tính', render: (s) => PRICING[s.pricingType] },
          { key: 'a', header: 'Nhận yêu cầu', render: (s) => (s.availability ? 'Có' : 'Tạm ngưng') }, { key: 's', header: 'Trạng thái', render: (s) => <StatusBadge status={s.status} /> },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} title={edit ? `Sửa ${edit.name}` : 'Thêm dịch vụ'} footer={<><Button variant="secondary" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.loading} onClick={() => { const p = toMinor(f.values.price); if (p === null) return; save.run({ name: f.values.name, description: f.values.description, category: f.values.category, priceMinor: p, pricingType: f.values.pricingType, availability: f.values.availability, status: f.values.status }); }}>Lưu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{save.error && <Alert tone="danger" className="sm:col-span-2">{save.error.code === 'DUPLICATE_KEY' ? 'Tên dịch vụ đã tồn tại.' : save.error.message}</Alert>}
          <TextField label="Tên" className="sm:col-span-2" {...f.bind('name')} error={save.fields.name} /><SelectField label="Nhóm" {...f.bind('category')}>{CATS.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</SelectField><SelectField label="Cách tính giá" {...f.bind('pricingType')}>{Object.entries(PRICING).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</SelectField>
          <MoneyField label="Đơn giá" {...f.bind('price')} /><SelectField label="Trạng thái" {...f.bind('status')}><option value="ACTIVE">Hiển thị</option><option value="INACTIVE">Ẩn</option></SelectField>
          <TextareaField label="Mô tả" className="sm:col-span-2" rows={2} {...f.bind('description')} /><Checkbox checked={Boolean(f.values.availability)} onChange={(e) => f.set('availability', e.target.checked)} label="Đang nhận yêu cầu" /></div>
      </Modal>
    </>
  );
}
