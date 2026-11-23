import { Eye, Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { ConfirmDialog, GuestFormModal, idTypeLabel } from '../../components/domain.jsx';
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, TextField } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useList, usePaging } from '../../hooks/index.js';
import { P } from '../../lib/permissions.js';

export default function Guests() {
  const { can } = useAuth();
  const { params, patch, setPage } = usePaging({ limit: 20 });
  const { items, meta, isLoading, error, refetch } = useList('guests', api.guests.list, params);
  const [edit, setEdit] = useState(undefined); const [del, setDel] = useState(null); const [reveal, setReveal] = useState(null);
  const remove = useAction(api.guests.remove, { invalidate: ['guests'], success: 'Đã xóa khách', onSuccess: () => setDel(null) });
  const show = useAction(api.guests.get, { silent: false });
  const doReveal = async (g) => { const r = await show.run(g.id, true); if (r) setReveal(r.data.guest); };
  return (
    <>
      <PageHeader title="Khách lưu trú" subtitle="Hồ sơ khách. Số giấy tờ được mã hóa; xem đầy đủ sẽ được ghi vào nhật ký." actions={can({ any: [P.GUEST_MANAGE] }) && <Button icon={Plus} onClick={() => setEdit(null)}>Thêm khách</Button>} />
      <Card>
        <FilterBar>
          <TextField label="Tìm kiếm" placeholder="Tên, SĐT, email…" value={params.search ?? ''} onChange={(e) => patch({ search: e.target.value || undefined })} />
          <TextField label="Số giấy tờ (khớp chính xác)" value={params.idNumber ?? ''} onChange={(e) => patch({ idNumber: e.target.value || undefined })} />
        </FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không tìm thấy khách" />} columns={[
          { key: 'n', header: 'Họ tên', render: (g) => <span className="font-medium">{g.fullName}</span> },
          { key: 'c', header: 'Liên hệ', render: (g) => g.phone ?? g.email ?? '-' },
          { key: 'i', header: 'Giấy tờ', render: (g) => (g.identification ? `${idTypeLabel(g.identification.type)} ${g.identification.maskedNumber}` : '-') },
          { key: 'na', header: 'Quốc tịch', render: (g) => g.nationality ?? '-' },
          { key: 'a', header: '', align: 'right', render: (g) => (
            <span className="flex justify-end gap-2">
              {g.identification && can({ any: [P.GUEST_VIEW_IDENTIFICATION] }) && <Button size="sm" variant="ghost" icon={Eye} loading={show.loading} onClick={() => doReveal(g)}>Xem số</Button>}
              {can({ any: [P.GUEST_MANAGE] }) && <Button size="sm" variant="secondary" onClick={() => setEdit(g)}>Sửa</Button>}
              {can({ any: [P.GUEST_DELETE] }) && <Button size="sm" variant="ghost" onClick={() => setDel(g)}>Xóa</Button>}
            </span>) },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      <GuestFormModal open={edit !== undefined} guest={edit} onClose={() => setEdit(undefined)} />
      <ConfirmDialog open={Boolean(del)} title="Xóa khách" danger confirmText="Xóa" description={`Xóa hồ sơ của ${del?.fullName}? Hồ sơ bị ẩn nhưng dữ liệu vẫn được lưu để đối soát.`} loading={remove.loading} onClose={() => setDel(null)} onConfirm={() => remove.run(del.id)} />
      <Modal open={Boolean(reveal)} onClose={() => setReveal(null)} title="Số giấy tờ" size="sm" footer={<Button onClick={() => setReveal(null)}>Đóng</Button>}>
        {reveal && <div className="space-y-3"><Alert tone="warning">Việc xem số giấy tờ đã được ghi vào nhật ký hệ thống.</Alert><p className="text-sm text-muted">{reveal.fullName} · {idTypeLabel(reveal.identification.type)}</p><p className="select-all rounded-lg bg-surface2 px-4 py-3 text-center font-mono text-lg tracking-wider">{reveal.identification.number}</p></div>}
      </Modal>
    </>
  );
}
