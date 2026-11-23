import { BarChart3, BedDouble, Building2, CalendarCheck, ClipboardList, Clock, CookingPot, FileText, Hotel, LayoutDashboard, ScrollText, Settings, Sparkles, SprayCan, UserCog, Users, UtensilsCrossed, Wallet, Wrench, Bell, ConciergeBell, UserRound } from 'lucide-react';
import { P, ROLES } from './permissions.js';

const STAFF_SIDE = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF];

/** Sidebar definition. `rule` uses the SAME permission names as the backend, so a user only sees what the API will let them use. */
export const NAV = [
  { group: 'Tổng quan', items: [{ to: '/', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true, rule: {} }, { to: '/notifications', label: 'Thông báo', icon: Bell, rule: {} }] },
  { group: 'Kỳ nghỉ của bạn', items: [
    { to: '/book', label: 'Tìm & đặt phòng', icon: Hotel, rule: { roles: [ROLES.CUSTOMER] } },
    { to: '/my/bookings', label: 'Đặt phòng của tôi', icon: CalendarCheck, rule: { roles: [ROLES.CUSTOMER] } },
    { to: '/my/invoices', label: 'Hóa đơn & thanh toán', icon: Wallet, rule: { roles: [ROLES.CUSTOMER] } },
    { to: '/room-service', label: 'Gọi món tại phòng', icon: UtensilsCrossed, rule: { roles: [ROLES.CUSTOMER] } },
    { to: '/services', label: 'Dịch vụ khách sạn', icon: ConciergeBell, rule: { roles: [ROLES.CUSTOMER] } },
    { to: '/my/guests', label: 'Khách đi cùng', icon: UserRound, rule: { roles: [ROLES.CUSTOMER] } },
  ] },
  { group: 'Lễ tân & vận hành', items: [
    { to: '/bookings', label: 'Đặt phòng', icon: CalendarCheck, rule: { roles: STAFF_SIDE, any: [P.BOOKING_READ_ALL] } },
    { to: '/guests', label: 'Khách lưu trú', icon: Users, rule: { roles: STAFF_SIDE, any: [P.GUEST_READ] } },
    { to: '/rooms', label: 'Phòng & loại phòng', icon: BedDouble, rule: { roles: STAFF_SIDE, any: [P.ROOM_READ] } },
    { to: '/housekeeping', label: 'Buồng phòng', icon: SprayCan, rule: { roles: STAFF_SIDE, any: [P.HOUSEKEEPING_READ] } },
    { to: '/orders', label: 'Đơn gọi món', icon: CookingPot, rule: { roles: STAFF_SIDE, any: [P.ORDER_PROCESS, P.ORDER_MANAGE] } },
    { to: '/service-requests', label: 'Yêu cầu dịch vụ', icon: Sparkles, rule: { roles: STAFF_SIDE, any: [P.SERVICE_FULFILL, P.SERVICE_MANAGE] } },
  ] },
  { group: 'Tài chính', items: [
    { to: '/billing/invoices', label: 'Hóa đơn', icon: FileText, rule: { roles: STAFF_SIDE, any: [P.BILLING_READ_ALL] } },
    { to: '/billing/payments', label: 'Thanh toán & hoàn tiền', icon: Wallet, rule: { roles: STAFF_SIDE, any: [P.BILLING_READ_ALL] } },
    { to: '/analytics', label: 'Báo cáo & phân tích', icon: BarChart3, rule: { roles: STAFF_SIDE, any: [P.REPORT_FINANCIAL, P.REPORT_OPERATIONAL] } },
  ] },
  { group: 'Danh mục', items: [
    { to: '/menu-admin', label: 'Thực đơn', icon: UtensilsCrossed, rule: { roles: STAFF_SIDE, any: [P.MENU_MANAGE] } },
    { to: '/services-admin', label: 'Danh mục dịch vụ', icon: ConciergeBell, rule: { roles: STAFF_SIDE, any: [P.SERVICE_MANAGE] } },
    { to: '/facilities', label: 'Cơ sở & thiết bị', icon: Building2, rule: { roles: STAFF_SIDE, any: [P.FACILITY_READ] } },
    { to: '/maintenance', label: 'Bảo trì', icon: Wrench, rule: { roles: STAFF_SIDE, any: [P.MAINTENANCE_REPORT] } },
  ] },
  { group: 'Nhân sự', items: [
    { to: '/staff', label: 'Nhân viên', icon: UserCog, rule: { roles: [ROLES.ADMIN, ROLES.MANAGER], any: [P.USER_READ] } },
    { to: '/users', label: 'Tài khoản', icon: Users, rule: { roles: [ROLES.ADMIN], any: [P.USER_READ] } },
    { to: '/shifts', label: 'Ca làm việc', icon: ClipboardList, rule: { roles: STAFF_SIDE, any: [P.SHIFT_MANAGE, P.ATTENDANCE_SELF] } },
    { to: '/attendance', label: 'Chấm công', icon: Clock, rule: { roles: STAFF_SIDE, any: [P.ATTENDANCE_SELF, P.ATTENDANCE_READ_TEAM] } },
  ] },
  { group: 'Hệ thống', items: [
    { to: '/settings', label: 'Cài đặt & thuế', icon: Settings, rule: { roles: [ROLES.ADMIN], any: [P.SETTINGS_MANAGE] } },
    { to: '/audit-logs', label: 'Nhật ký hệ thống', icon: ScrollText, rule: { roles: [ROLES.ADMIN], any: [P.AUDIT_LOG_READ] } },
  ] },
];
