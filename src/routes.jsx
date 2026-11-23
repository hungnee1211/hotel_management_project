import { lazy } from 'react';
import { P, ROLES } from './lib/permissions.js';

const L = (loader, name = 'default') => lazy(() => loader().then((m) => ({ default: m[name] })));
const STAFF_SIDE = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF];
const CUSTOMER = { roles: [ROLES.CUSTOMER] };
const staff = (...any) => ({ roles: STAFF_SIDE, any });
const BookingDetail = L(() => import('./pages/customer/BookingDetail.jsx'));

/**
 * Every page and the rule that guards it. The rules use the same permission names as the backend, and the backend
 * re-checks them on every call, so these only decide what the UI shows.
 */
export const ROUTES = [
  { path: '/', Page: L(() => import('./pages/Dashboard.jsx')), rule: {} },
  { path: '/profile', Page: L(() => import('./pages/Profile.jsx')), rule: {} },
  { path: '/notifications', Page: L(() => import('./pages/Notifications.jsx')), rule: {} },
  // ---- guest ----
  { path: '/book', Page: L(() => import('./pages/customer/BookRoom.jsx')), rule: CUSTOMER },
  { path: '/my/bookings', Page: L(() => import('./pages/customer/MyBookings.jsx')), rule: CUSTOMER },
  { path: '/my/bookings/:id', Page: BookingDetail, props: { back: '/my/bookings' }, rule: CUSTOMER },
  { path: '/my/invoices', Page: L(() => import('./pages/customer/MyInvoices.jsx')), rule: CUSTOMER },
  { path: '/room-service', Page: L(() => import('./pages/customer/RoomService.jsx')), rule: CUSTOMER },
  { path: '/services', Page: L(() => import('./pages/customer/Services.jsx')), rule: CUSTOMER },
  { path: '/my/guests', Page: L(() => import('./pages/customer/MyGuests.jsx')), rule: CUSTOMER },
  // ---- front desk & operations ----
  { path: '/bookings', Page: L(() => import('./pages/ops/Bookings.jsx')), rule: staff(P.BOOKING_READ_ALL) },
  { path: '/bookings/new', Page: L(() => import('./pages/ops/NewBooking.jsx')), rule: staff(P.BOOKING_CREATE_FOR_GUEST) },
  { path: '/bookings/:id', Page: BookingDetail, props: { back: '/bookings' }, rule: staff(P.BOOKING_READ_ALL) },
  { path: '/guests', Page: L(() => import('./pages/ops/Guests.jsx')), rule: staff(P.GUEST_READ) },
  { path: '/rooms', Page: L(() => import('./pages/ops/Rooms.jsx')), rule: staff(P.ROOM_READ) },
  { path: '/housekeeping', Page: L(() => import('./pages/ops/Housekeeping.jsx')), rule: staff(P.HOUSEKEEPING_READ) },
  { path: '/orders', Page: L(() => import('./pages/ops/OrdersBoard.jsx')), rule: staff(P.ORDER_PROCESS, P.ORDER_MANAGE) },
  { path: '/service-requests', Page: L(() => import('./pages/ops/ServiceRequests.jsx')), rule: staff(P.SERVICE_FULFILL, P.SERVICE_MANAGE) },
  // ---- finance & reports ----
  { path: '/billing/invoices', Page: L(() => import('./pages/billing/BillingPages.jsx'), 'InvoicesPage'), rule: staff(P.BILLING_READ_ALL) },
  { path: '/billing/payments', Page: L(() => import('./pages/billing/BillingPages.jsx'), 'PaymentsPage'), rule: staff(P.BILLING_READ_ALL) },
  { path: '/analytics', Page: L(() => import('./pages/admin/Analytics.jsx')), rule: staff(P.REPORT_FINANCIAL, P.REPORT_OPERATIONAL) },
  // ---- catalogues & assets ----
  { path: '/menu-admin', Page: L(() => import('./pages/admin/MenuAdmin.jsx')), rule: staff(P.MENU_MANAGE) },
  { path: '/services-admin', Page: L(() => import('./pages/admin/ServicesAdmin.jsx')), rule: staff(P.SERVICE_MANAGE) },
  { path: '/facilities', Page: L(() => import('./pages/admin/Facilities.jsx')), rule: staff(P.FACILITY_READ) },
  { path: '/maintenance', Page: L(() => import('./pages/admin/Maintenance.jsx')), rule: staff(P.MAINTENANCE_REPORT) },
  // ---- people ----
  { path: '/staff', Page: L(() => import('./pages/admin/Staff.jsx')), rule: { roles: [ROLES.ADMIN, ROLES.MANAGER], any: [P.USER_READ] } },
  { path: '/users', Page: L(() => import('./pages/admin/Users.jsx')), rule: { roles: [ROLES.ADMIN], any: [P.USER_READ] } },
  { path: '/shifts', Page: L(() => import('./pages/admin/Shifts.jsx')), rule: staff(P.SHIFT_MANAGE, P.ATTENDANCE_SELF) },
  { path: '/attendance', Page: L(() => import('./pages/admin/Attendance.jsx')), rule: staff(P.ATTENDANCE_SELF, P.ATTENDANCE_READ_TEAM) },
  // ---- system ----
  { path: '/settings', Page: L(() => import('./pages/admin/Settings.jsx')), rule: { roles: [ROLES.ADMIN], any: [P.SETTINGS_MANAGE] } },
  { path: '/audit-logs', Page: L(() => import('./pages/admin/AuditLogs.jsx')), rule: { roles: [ROLES.ADMIN], any: [P.AUDIT_LOG_READ] } },
];
