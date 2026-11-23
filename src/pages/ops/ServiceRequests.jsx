import { useState } from 'react';
import { api } from '../../api/index.js';
import { PromptDialog } from '../../components/domain.jsx';
import StaffSelect from '../../components/StaffSelect.jsx';
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FilterBar, Modal, Pager, PageHeader, SelectField, StatusBadge } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { useAction, useList, usePaging } from '../../hooks/index.js';
import { dateTime, money, titleCase } from '../../lib/format.js';
import { P } from '../../lib/permissions.js';

export default function ServiceRequests() {
  const { can, user } = useAuth();
  const { params, patch, setPage } = usePaging({ limit: 20, sortBy: 'createdAt', order: 'desc' });
  const { items, meta, isLoading, error, refetch } = useList('service-requests', api.serviceRequests.list, params, { refetchInterval: 15_000 });
  const [dlg, setDlg] = useState(null); const [assignee, setAssignee] = useState('');
  const manage = can({ any: [P.SERVICE_MANAGE] });
  const set = useAction(api.serviceRequests.setStatus, { invalidate: ['service-requests', 'bookings'], success: 'Đã cập nhật', onSuccess: () => setDlg(null) });
  const cancel = useAction(api.serviceRequests.cancel, { invalidate: ['service-requests'], success: 'Đã hủy', onSuccess: () => setDlg(null) });
  return (
    <>
      <PageHeader title="Yêu cầu dịch vụ" subtitle="Khi hoàn thành, chi phí được cộng vào hóa đơn của khách (mỗi yêu cầu một lần)." />
      <Card>
        <FilterBar><SelectField label="Trạng thái" value={params.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })}><option value="">Tất cả</option>{['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</SelectField></FilterBar>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có yêu cầu" />} columns={[
          { key: 'c', header: 'Mã', render: (r) => <span className="font-medium">{r.requestCode}</span> },
          { key: 's', header: 'Dịch vụ', render: (r) => `${r.serviceSnapshot.name} × ${r.quantity}` },
          { key: 't', header: 'Thành tiền', align: 'right', render: (r) => money(r.totalMinor) },
          { key: 'a', header: 'Lịch hẹn', render: (r) => dateTime(r.scheduledAt) },
          { key: 'st', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'x', header: '', align: 'right', render: (r) => (
            <span className="flex flex-wrap justify-end gap-2">
              {r.status === 'REQUESTED' && <Button size="sm" loading={set.loading} onClick={() => set.run(r.id, { status: 'ASSIGNED' })}>Nhận việc</Button>}
              {r.status === 'REQUESTED' && manage && <Button size="sm" variant="secondary" onClick={() => { setAssignee(''); setDlg({ type: 'assign', r }); }}>Giao cho…</Button>}
              {r.status === 'REQUESTED' && <Button size="sm" variant="ghost" onClick={() => setDlg({ type: 'reject', r })}>Từ chối</Button>}
              {r.status === 'ASSIGNED' && (r.assignedStaffId === user.id || manage) && <Button size="sm" loading={set.loading} onClick={() => set.run(r.id, { status: 'IN_PROGRESS' })}>Bắt đầu</Button>}
              {r.status === 'IN_PROGRESS' && (r.assignedStaffId === user.id || manage) && <Button size="sm" loading={set.loading} onClick={() => set.run(r.id, { status: 'COMPLETED' })}>Hoàn thành</Button>}
              {manage && ['REQUESTED', 'ASSIGNED'].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => setDlg({ type: 'cancel', r })}>Hủy</Button>}
            </span>) },
        ]} />}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      {set.error && !dlg && <Alert tone="danger" className="mt-4">{set.error.code === 'BOOKING_NOT_ACTIVE' ? 'Khách phải đang lưu trú để tính phí dịch vụ.' : set.error.message}</Alert>}
      <Modal open={dlg?.type === 'assign'} onClose={() => setDlg(null)} title="Giao việc" size="sm" footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Hủy</Button><Button loading={set.loading} disabled={!assignee} onClick={() => set.run(dlg.r.id, { status: 'ASSIGNED', assignedStaffId: assignee })}>Giao</Button></>}>
        <div className="space-y-4">{set.error?.code === 'INVALID_ASSIGNEE' && <Alert tone="danger">Nhân viên không thể làm dịch vụ hoặc không thuộc nhóm của bạn.</Alert>}<StaffSelect label="Nhân viên" value={assignee} onChange={(e) => setAssignee(e.target.value)} /></div>
      </Modal>
      <PromptDialog open={dlg?.type === 'reject'} title="Từ chối yêu cầu" danger confirmText="Từ chối" loading={set.loading} onClose={() => setDlg(null)} onConfirm={(reason) => set.run(dlg.r.id, { status: 'REJECTED', reason })} />
      <PromptDialog open={dlg?.type === 'cancel'} title="Hủy yêu cầu" danger confirmText="Hủy" loading={cancel.loading} onClose={() => setDlg(null)} onConfirm={(reason) => cancel.run(dlg.r.id, reason)} />
    </>
  );
}
