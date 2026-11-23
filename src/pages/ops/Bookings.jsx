import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, PageHeader } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/auth.jsx';
import { P } from '../../lib/permissions.js';
import { BookingsTable } from '../customer/MyBookings.jsx';

export default function Bookings() {
  const { can } = useAuth(); const navigate = useNavigate();
  return (<><PageHeader title="Đặt phòng" subtitle="Tất cả đặt phòng của khách sạn." actions={can({ any: [P.BOOKING_CREATE_FOR_GUEST] }) && <Button icon={Plus} onClick={() => navigate('/bookings/new')}>Đặt phòng mới</Button>} /><BookingsTable basePath="/bookings" staff /></>);
}
