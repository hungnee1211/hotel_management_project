import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../api/index.js';
import { Button, Card, DataTable, EmptyState, ErrorState, Pager, PageHeader, cx } from '../components/ui/index.jsx';
import { useAction, useList, usePaging } from '../hooks/index.js';
import { dateTime } from '../lib/format.js';

export default function Notifications() {
  const { params, setPage } = usePaging({ limit: 20 });
  const { items, meta, isLoading, error, refetch } = useList('notifications', api.notifications.list, params);
  const read = useAction(api.notifications.read, { invalidate: ['notifications'], silent: true });
  const readAll = useAction(api.notifications.readAll, { invalidate: ['notifications'], success: 'Đã đánh dấu tất cả là đã đọc' });
  return (
    <>
      <PageHeader title="Thông báo" subtitle={meta ? `${meta.unread} chưa đọc` : undefined} actions={<Button variant="secondary" icon={CheckCheck} onClick={() => readAll.run()} loading={readAll.loading} disabled={!meta?.unread}>Đọc tất cả</Button>} />
      <Card>
        {error ? <ErrorState error={error} onRetry={refetch} /> : (
          <DataTable loading={isLoading} rows={items} empty={<EmptyState title="Không có thông báo" hint="Cảnh báo bảo trì và công việc được giao sẽ hiện ở đây." />}
            onRowClick={(n) => !n.readAt && read.run(n.id)}
            columns={[
              { key: 'title', header: 'Nội dung', render: (n) => <span className={cx('flex items-start gap-3', !n.readAt && 'font-semibold')}><Bell className={cx('mt-0.5 h-4 w-4 shrink-0', n.readAt ? 'text-muted' : 'text-primary')} /><span>{n.title}{n.body && <span className="block text-xs font-normal text-muted">{n.body}</span>}</span></span> },
              { key: 'at', header: 'Thời gian', render: (n) => <span className="whitespace-nowrap text-muted">{dateTime(n.createdAt)}</span> },
            ]} />
        )}
        <Pager meta={meta} onPage={setPage} />
      </Card>
    </>
  );
}
