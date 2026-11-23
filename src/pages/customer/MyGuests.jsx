import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/index.js';
import { GuestFormModal, idTypeLabel } from '../../components/domain.jsx';
import { Button, Card, DataTable, EmptyState, ErrorState, Pager, PageHeader } from '../../components/ui/index.jsx';
import { useList, usePaging } from '../../hooks/index.js';

export default function MyGuests() {
  const { params, setPage } = usePaging({ limit: 20 });
  const { items, meta, isLoading, error, refetch } = useList('guests', api.guests.list, params);
  const [edit, setEdit] = useState(undefined);
  return (
    <>
      <PageHeader title="Khách đi cùng" subtitle="Lưu thông tin người ở cùng để chọn nhanh khi đặt phòng. Khách sạn cần giấy tờ của khách chính khi nhận phòng." actions={<Button icon={Plus} onClick={() => setEdit(null)}>Thêm khách</Button>} />
      <Card>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} onRowClick={setEdit} empty={<EmptyState title="Chưa có khách nào" action={<Button size="sm" onClick={() => setEdit(null)}>Thêm khách</Button>} />} columns={[
          { key: 'n', header: 'Họ tên', render: (g) => <span className="font-medium">{g.fullName}</span> },
          { key: 'c', header: 'Liên hệ', render: (g) => g.phone ?? g.email ?? '-' },
          { key: 'i', header: 'Giấy tờ', render: (g) => (g.identification ? `${idTypeLabel(g.identification.type)} ${g.identification.maskedNumber}` : '-') },
          { key: 'na', header: 'Quốc tịch', render: (g) => g.nationality ?? '-' },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      <GuestFormModal open={edit !== undefined} guest={edit} onClose={() => setEdit(undefined)} />
    </>
  );
}
