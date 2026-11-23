/** Permission names mirror the backend matrix (constants/permissions.js). The server enforces them; the UI only uses them to show/hide. */
export const P = {
  USER_READ: 'user:read', USER_MANAGE_MANAGERS: 'user:manage:managers', USER_MANAGE_STAFF: 'user:manage:staff', STAFF_PERMISSIONS_MANAGE: 'staff:permissions:manage',
  SETTINGS_MANAGE: 'settings:manage', TAX_RULE_MANAGE: 'tax-rule:manage',
  ROOM_READ: 'room:read', ROOM_MANAGE: 'room:manage', ROOM_PRICING_MANAGE: 'room:pricing:manage',
  BOOKING_CREATE_OWN: 'booking:create:own', BOOKING_CREATE_FOR_GUEST: 'booking:create:guest', BOOKING_READ_OWN: 'booking:read:own', BOOKING_READ_ALL: 'booking:read:all',
  BOOKING_MANAGE: 'booking:manage', BOOKING_CANCEL_OWN: 'booking:cancel:own', BOOKING_CANCEL_ANY: 'booking:cancel:any', BOOKING_CHECKIN_CHECKOUT: 'booking:checkin-checkout',
  GUEST_READ: 'guest:read', GUEST_MANAGE: 'guest:manage', GUEST_MANAGE_OWN: 'guest:manage:own', GUEST_VIEW_IDENTIFICATION: 'guest:view-identification', GUEST_DELETE: 'guest:delete',
  HOUSEKEEPING_READ: 'housekeeping:read', HOUSEKEEPING_UPDATE: 'housekeeping:update', HOUSEKEEPING_ASSIGN: 'housekeeping:assign', HOUSEKEEPING_INSPECT: 'housekeeping:inspect',
  SHIFT_MANAGE: 'shift:manage', ATTENDANCE_SELF: 'attendance:self', ATTENDANCE_READ_TEAM: 'attendance:read:team', ATTENDANCE_APPROVE: 'attendance:approve',
  MENU_READ: 'menu:read', MENU_MANAGE: 'menu:manage', ORDER_CREATE_OWN: 'order:create:own', ORDER_READ_OWN: 'order:read:own', ORDER_PROCESS: 'order:process', ORDER_MANAGE: 'order:manage',
  SERVICE_READ: 'service:read', SERVICE_MANAGE: 'service:manage', SERVICE_REQUEST_OWN: 'service:request:own', SERVICE_FULFILL: 'service:fulfill',
  FACILITY_READ: 'facility:read', FACILITY_MANAGE: 'facility:manage', EQUIPMENT_READ: 'equipment:read', EQUIPMENT_MANAGE: 'equipment:manage',
  MAINTENANCE_REPORT: 'maintenance:report', MAINTENANCE_WORK: 'maintenance:work', MAINTENANCE_MANAGE: 'maintenance:manage',
  BILLING_READ_OWN: 'billing:read:own', BILLING_READ_ALL: 'billing:read:all', BILLING_ADJUST: 'billing:adjust', PAYMENT_CREATE: 'payment:create', PAYMENT_CREATE_OWN: 'payment:create:own', PAYMENT_REFUND: 'payment:refund',
  INVOICE_READ_OWN: 'invoice:read:own', INVOICE_MANAGE: 'invoice:manage', REPORT_OPERATIONAL: 'report:operational', REPORT_FINANCIAL: 'report:financial', AUDIT_LOG_READ: 'audit-log:read',
};

export const ROLES = { ADMIN: 'ADMIN', MANAGER: 'MANAGER', STAFF: 'STAFF', CUSTOMER: 'CUSTOMER' };
export const isStaffSide = (role) => role && role !== ROLES.CUSTOMER;

/** `rule` = { roles?: [...], any?: [perms], all?: [perms] }. An empty rule means "any signed-in user". */
export const allowed = (rule = {}, { role, permissions = [] } = {}) => {
  if (rule.roles && !rule.roles.includes(role)) return false;
  const held = new Set(permissions);
  if (rule.any && !rule.any.some((p) => held.has(p))) return false;
  if (rule.all && !rule.all.every((p) => held.has(p))) return false;
  return true;
};
