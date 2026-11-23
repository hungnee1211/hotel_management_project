import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { MoneyField } from '../../components/domain.jsx';
import { Alert, Badge, Button, Card, CardHeader, Checkbox, EmptyState, ErrorState, Loading, Modal, PageHeader, SelectField, StatusBadge, TextField, TextareaField } from '../../components/ui/index.jsx';
import { useAction, useForm, useOne } from '../../hooks/index.js';
import { fromMinor, money, toMinor } from '../../lib/format.js';

export default function MenuAdmin() {
  const { data, isLoading, error, refetch } = useOne(['menu', 'all'], () => api.menu.get({ includeInactive: true }));
  const [cat, setCat] = useState(undefined); const [item, setItem] = useState(undefined);
  const cf = useForm({}); const itf = useForm({});
  const saveCat = useAction((b) => (cat ? api.menu.updateCategory(cat.id, b) : api.menu.createCategory(b)), { invalidate: ['menu'], success: 'Đã lưu nhóm món', onSuccess: () => setCat(undefined) });
  const saveItem = useAction((b) => (item?.id ? api.menu.updateItem(item.id, b) : api.menu.createItem(b)), { invalidate: ['menu'], success: 'Đã lưu món', onSuccess: () => setItem(undefined) });
  const openCat = (c) => { cf.reset({ name: c?.name ?? '', description: c?.description ?? '', status: c?.status ?? 'ACTIVE' }); setCat(c ?? null); };
  const openItem = (i, categoryId) => { itf.reset({ categoryId: i?.categoryId ?? categoryId ?? '', name: i?.name ?? '', description: i?.description ?? '', price: i ? fromMinor(i.priceMinor) : '', preparationMinutes: i?.preparationMinutes ?? 15, availability: i?.availability ?? true, status: i?.status ?? 'ACTIVE' }); setItem(i ?? {}); };
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <>
      <PageHeader title="Thực đơn" subtitle="Đổi giá không ảnh hưởng đơn đã đặt (đơn lưu giá tại thời điểm đặt)." actions={<Button icon={Plus} onClick={() => openCat(null)}>Thêm nhóm món</Button>} />
      <div className="space-y-6">
        {data.map((c) => (
          <Card key={c.id}>
            <CardHeader title={<span className="flex items-center gap-2">{c.name}<StatusBadge status={c.status} /></span>} subtitle={c.description} actions={<><Button size="sm" variant="secondary" onClick={() => openCat(c)}>Sửa nhóm</Button><Button size="sm" icon={Plus} onClick={() => openItem(null, c.id)}>Thêm món</Button></>} />
            {c.items.length === 0 ? <EmptyState title="Chưa có món" /> : <ul className="divide-y divide-line">{c.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{i.name}</p><p className="text-xs text-muted">{i.description}</p></div>
                <div className="flex items-center gap-3"><span className="tabular-nums">{money(i.priceMinor)}</span>{!i.availability && <Badge tone="warning">Hết món</Badge>}<StatusBadge status={i.status} /><Button size="sm" variant="ghost" onClick={() => openItem(i)}>Sửa</Button></div></li>))}</ul>}
          </Card>
        ))}
        {data.length === 0 && <Card><EmptyState title="Chưa có thực đơn" action={<Button onClick={() => openCat(null)}>Tạo nhóm món đầu tiên</Button>} /></Card>}
      </div>
      <Modal open={cat !== undefined} onClose={() => setCat(undefined)} title={cat ? 'Sửa nhóm món' : 'Thêm nhóm món'} size="sm" footer={<><Button variant="secondary" onClick={() => setCat(undefined)}>Hủy</Button><Button loading={saveCat.loading} onClick={() => saveCat.run({ name: cf.values.name, description: cf.values.description, status: cf.values.status })}>Lưu</Button></>}>
        <div className="space-y-4">{saveCat.error && <Alert tone="danger">{saveCat.error.code === 'DUPLICATE_KEY' ? 'Tên nhóm đã tồn tại.' : saveCat.error.message}</Alert>}<TextField label="Tên nhóm" {...cf.bind('name')} /><TextareaField label="Mô tả" rows={2} {...cf.bind('description')} /><SelectField label="Trạng thái" {...cf.bind('status')}><option value="ACTIVE">Hiển thị</option><option value="INACTIVE">Ẩn</option></SelectField></div>
      </Modal>
      <Modal open={item !== undefined} onClose={() => setItem(undefined)} title={item?.id ? 'Sửa món' : 'Thêm món'} footer={<><Button variant="secondary" onClick={() => setItem(undefined)}>Hủy</Button><Button loading={saveItem.loading} onClick={() => { const p = toMinor(itf.values.price); if (p === null) return; saveItem.run({ categoryId: itf.values.categoryId, name: itf.values.name, description: itf.values.description, priceMinor: p, preparationMinutes: Number(itf.values.preparationMinutes), availability: itf.values.availability, status: itf.values.status }); }}>Lưu</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">{saveItem.error && <Alert tone="danger" className="sm:col-span-2">{saveItem.error.message}</Alert>}
          <SelectField label="Nhóm" {...itf.bind('categoryId')}>{data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField><TextField label="Tên món" {...itf.bind('name')} error={saveItem.fields.name} />
          <MoneyField label="Giá" {...itf.bind('price')} /><TextField label="Thời gian chế biến (phút)" type="number" min={0} {...itf.bind('preparationMinutes')} />
          <TextareaField label="Mô tả" className="sm:col-span-2" rows={2} {...itf.bind('description')} />
          <Checkbox checked={Boolean(itf.values.availability)} onChange={(e) => itf.set('availability', e.target.checked)} label="Còn món hôm nay" /><SelectField label="Trạng thái" {...itf.bind('status')}><option value="ACTIVE">Hiển thị</option><option value="INACTIVE">Ẩn</option></SelectField></div>
      </Modal>
    </>
  );
}
