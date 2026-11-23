import { PageHeader } from '../../components/ui/index.jsx';
import { InvoicesList, PaymentsList } from './lists.jsx';

export const InvoicesPage = () => (<><PageHeader title="Hóa đơn" subtitle="Hóa đơn đã phát hành là bất biến; mọi chỉnh sửa là bản ghi điều chỉnh có người duyệt." /><InvoicesList staff /></>);
export const PaymentsPage = () => (<><PageHeader title="Thanh toán & hoàn tiền" subtitle="Hoàn tiền tham chiếu khoản thanh toán gốc; Manager có hạn mức duyệt, vượt hạn mức cần Admin." /><PaymentsList staff /></>);
