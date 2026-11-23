import { useState } from 'react';
import { PageHeader, Tabs } from '../../components/ui/index.jsx';
import { InvoicesList, PaymentsList } from '../billing/lists.jsx';

export default function MyInvoices() {
  const [tab, setTab] = useState('invoices');
  return (
    <>
      <PageHeader title="Hóa đơn & thanh toán" subtitle="Hóa đơn chỉ hiện sau khi khách sạn phát hành (thường là khi trả phòng)." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'invoices', label: 'Hóa đơn' }, { value: 'payments', label: 'Lịch sử thanh toán' }]} />
      {tab === 'invoices' ? <InvoicesList /> : <PaymentsList />}
    </>
  );
}
