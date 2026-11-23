import { useState } from 'react';
import { api } from '../../api/index.js';
import { Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, TextField } from '../../components/ui/index.jsx';
import { useList, usePaging } from '../../hooks/index.js';
import { dateTime } from '../../lib/format.js';

export default function AuditLogs() {
  const { params, patch, setPage } = usePaging({ limit: 25 });
  const { items, meta, isLoading, error, refetch } = useList('audit-logs', api.auditLogs.list, params);
  const [open, setOpen] = useState(null);
  const id = (r) => r.id ?? r._id; // audit rows come straight from the database
  return (
    <>
      <PageHeader title="Nhật ký hệ thống" subtitle="Chỉ ghi thêm, không sửa hoặc xóa được. Dữ liệu nhạy cảm (mật khẩu, mã OTP, số giấy tờ) không bao giờ được lưu ở đây." />
      <Card>
        <FilterBar>
          <TextField label="Hành động" placeholder="BOOKING_CREATED" value={params.action ?? ''} onChange={(e) => patch({ action: e.target.value.toUpperCase() || undefined })} />
          <TextField label="Đối tượng" placeholder="Booking, Invoice…" value={params.resourceType ?? ''} onChange={(e) => patch({ resourceType: e.target.value || undefined })} />
          <TextField label="Từ ngày" type="date" onChange={(e) => patch({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
          <TextField label="Đến ngày" type="date" onChange={(e) => patch({ to: e.target.value ? new Date(new Date(e.target.value).getTime() + 86_400_000).toISOString() : undefined })} />
        </FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} rowKey={id} empty={<EmptyState title="Không có bản ghi" />} columns={[
          { key: 't', header: 'Thời gian', render: (r) => <span className="whitespace-nowrap">{dateTime(r.createdAt)}</span> }, { key: 'a', header: 'Hành động', render: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { key: 'r', header: 'Đối tượng', render: (r) => r.resourceType }, { key: 'u', header: 'Người thực hiện', render: (r) => <span className="font-mono text-xs text-muted">{r.actorId ? String(r.actorId).slice(-8) : 'hệ thống'}</span> },
          { key: 'ip', header: 'IP', render: (r) => r.ipAddress ?? '-' }, { key: 'd', header: '', render: (r) => (r.before || r.after) && <Button size="sm" variant="ghost" onClick={() => setOpen(r)}>Chi tiết</Button> },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} size="lg" title={open?.action} footer={<Button onClick={() => setOpen(null)}>Đóng</Button>}>
        <div className="grid gap-4 md:grid-cols-2">{['before', 'after'].map((k) => <div key={k}><p className="mb-1 text-xs font-medium text-muted">{k === 'before' ? 'Trước' : 'Sau'}</p><pre className="max-h-96 overflow-auto rounded-lg bg-surface2 p-3 text-xs">{open?.[k] ? JSON.stringify(open[k], null, 2) : '—'}</pre></div>)}</div>
      </Modal>
    </>
  );
}
