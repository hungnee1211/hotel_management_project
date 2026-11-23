/**
 * One function per backend endpoint (paths, methods and bodies mirror the API 1:1; see /api/docs).
 * `c` is an API client, so the same code runs in the browser and in the contract tests against a real server.
 */
export const createApi = (c) => ({
  auth: {
    register: (b) => c.post('/auth/register', b),
    verifyOtp: (b) => c.post('/auth/verify-otp', b),
    resendOtp: (identifier) => c.post('/auth/resend-otp', { identifier }),
    login: (identifier, password) => c.post('/auth/login', { identifier, password }),
    refresh: () => c.post('/auth/refresh'),
    logout: () => c.post('/auth/logout'),
    logoutAll: () => c.post('/auth/logout-all'),
    me: () => c.get('/auth/me'),
    updateMe: (b) => c.patch('/auth/me', b),
    changePassword: (b) => c.post('/auth/change-password', b),
    deactivate: (password) => c.post('/auth/deactivate', { password }),
    forgotPassword: (identifier) => c.post('/auth/forgot-password', { identifier }),
    resetPassword: (b) => c.post('/auth/reset-password', b),
  },
  dashboard: { get: () => c.get('/dashboard') },
  notifications: { list: (p) => c.get('/notifications', p), read: (id) => c.post(`/notifications/${id}/read`), readAll: () => c.post('/notifications/read-all') },

  users: { list: (p) => c.get('/users', p), get: (id) => c.get(`/users/${id}`), update: (id, b) => c.patch(`/users/${id}`, b), deactivate: (id) => c.post(`/users/${id}/deactivate`), reactivate: (id) => c.post(`/users/${id}/reactivate`), remove: (id) => c.del(`/users/${id}`) },
  staff: { list: (p) => c.get('/staff', p), get: (id) => c.get(`/staff/${id}`), me: () => c.get('/staff/me'), create: (b) => c.post('/staff', b), update: (id, b) => c.patch(`/staff/${id}`, b), permissions: (id) => c.get(`/staff/${id}/permissions`), attendance: (id, p) => c.get(`/staff/${id}/attendance`, p), createManager: (b) => c.post('/managers', b), transferStaff: (managerId, toManagerId) => c.post(`/managers/${managerId}/transfer-staff`, { toManagerId }) },
  guests: { list: (p) => c.get('/guests', p), get: (id, reveal) => c.get(`/guests/${id}`, reveal ? { revealIdentification: true } : undefined), create: (b) => c.post('/guests', b), update: (id, b) => c.patch(`/guests/${id}`, b), remove: (id) => c.del(`/guests/${id}`) },

  roomTypes: { list: (p) => c.get('/room-types', p), get: (id) => c.get(`/room-types/${id}`), create: (b) => c.post('/room-types', b), update: (id, b) => c.patch(`/room-types/${id}`, b) },
  rooms: { list: (p) => c.get('/rooms', p), get: (id) => c.get(`/rooms/${id}`), create: (b) => c.post('/rooms', b), update: (id, b) => c.patch(`/rooms/${id}`, b), setStatus: (id, b) => c.patch(`/rooms/${id}/status`, b), remove: (id) => c.del(`/rooms/${id}`), history: (id) => c.get(`/rooms/${id}/history`), availability: (p) => c.get('/rooms/availability', p) },
  bookings: { list: (p) => c.get('/bookings', p), get: (id) => c.get(`/bookings/${id}`), create: (b) => c.post('/bookings', b), update: (id, b) => c.patch(`/bookings/${id}`, b), cancel: (id, b) => c.post(`/bookings/${id}/cancel`, b), confirm: (id) => c.post(`/bookings/${id}/confirm`), noShow: (id) => c.post(`/bookings/${id}/no-show`), checkIn: (id) => c.post(`/bookings/${id}/check-in`), checkOut: (id, b) => c.post(`/bookings/${id}/check-out`, b), extend: (id, newCheckOutDate) => c.post(`/bookings/${id}/extend`, { newCheckOutDate }) },

  billing: { accounts: (p) => c.get('/billing-accounts', p), account: (id) => c.get(`/billing-accounts/${id}`), charges: (id, p) => c.get(`/billing-accounts/${id}/charges`, p), addCharge: (id, b) => c.post(`/billing-accounts/${id}/charges`, b), generateInvoice: (id) => c.post(`/billing-accounts/${id}/invoices`) },
  invoices: { list: (p) => c.get('/invoices', p), get: (id) => c.get(`/invoices/${id}`), issue: (id) => c.post(`/invoices/${id}/issue`), adjust: (id, b) => c.post(`/invoices/${id}/adjustments`, b), void: (id, reason) => c.post(`/invoices/${id}/void`, { reason }), pdf: (id) => c.download(`/invoices/${id}/pdf`) },
  payments: { list: (p) => c.get('/payments', p), get: (id) => c.get(`/payments/${id}`), record: (b) => c.post('/payments', b), online: (b) => c.post('/payments/online', b), refund: (id, b) => c.post(`/payments/${id}/refund`, b) },

  housekeeping: { rooms: (p) => c.get('/housekeeping/rooms', p), tasks: (p) => c.get('/housekeeping/tasks', p), task: (id) => c.get(`/housekeeping/tasks/${id}`), createTask: (b) => c.post('/housekeeping/tasks', b), assign: (id, assignedStaffId) => c.patch(`/housekeeping/tasks/${id}`, { assignedStaffId }), start: (id) => c.post(`/housekeeping/tasks/${id}/start`), complete: (id, b) => c.post(`/housekeeping/tasks/${id}/complete`, b), inspect: (id, b) => c.post(`/housekeeping/tasks/${id}/inspect`, b), damage: (id, b) => c.post(`/housekeeping/tasks/${id}/damage`, b) },
  shifts: { list: (p) => c.get('/shifts', p), create: (b) => c.post('/shifts', b), update: (id, b) => c.patch(`/shifts/${id}`, b), cancel: (id) => c.del(`/shifts/${id}`) },
  attendance: { checkIn: () => c.post('/attendance/check-in'), checkOut: () => c.post('/attendance/check-out'), list: (p) => c.get('/attendance', p), get: (id) => c.get(`/attendance/${id}`), requestCorrection: (id, b) => c.post(`/attendance/${id}/correction-request`, b), approve: (id) => c.post(`/attendance/${id}/correction/approve`), reject: (id) => c.post(`/attendance/${id}/correction/reject`), correct: (id, b) => c.patch(`/attendance/${id}`, b), report: (p) => c.get('/attendance/reports', p) },

  menu: { get: (p) => c.get('/menu', p), createCategory: (b) => c.post('/menu/categories', b), updateCategory: (id, b) => c.patch(`/menu/categories/${id}`, b), createItem: (b) => c.post('/menu/items', b), updateItem: (id, b) => c.patch(`/menu/items/${id}`, b), item: (id) => c.get(`/menu/items/${id}`) },
  orders: { create: (b) => c.post('/orders', b), list: (p) => c.get('/orders', p), get: (id) => c.get(`/orders/${id}`), setStatus: (id, b) => c.patch(`/orders/${id}/status`, b), cancel: (id, reason) => c.post(`/orders/${id}/cancel`, { reason }), complete: (id) => c.post(`/orders/${id}/complete`) },
  services: { list: (p) => c.get('/services', p), create: (b) => c.post('/services', b), update: (id, b) => c.patch(`/services/${id}`, b) },
  serviceRequests: { create: (b) => c.post('/service-requests', b), list: (p) => c.get('/service-requests', p), get: (id) => c.get(`/service-requests/${id}`), setStatus: (id, b) => c.patch(`/service-requests/${id}/status`, b), cancel: (id, reason) => c.post(`/service-requests/${id}/cancel`, { reason }) },

  facilities: { list: (p) => c.get('/facilities', p), get: (id) => c.get(`/facilities/${id}`), create: (b) => c.post('/facilities', b), update: (id, b) => c.patch(`/facilities/${id}`, b), remove: (id) => c.del(`/facilities/${id}`), equipment: (id, p) => c.get(`/facilities/${id}/equipment`, p) },
  equipment: { list: (p) => c.get('/equipment', p), get: (id) => c.get(`/equipment/${id}`), create: (b) => c.post('/equipment', b), update: (id, b) => c.patch(`/equipment/${id}`, b), retire: (id) => c.del(`/equipment/${id}`), history: (id) => c.get(`/equipment/${id}/history`) },
  maintenance: { list: (p) => c.get('/maintenance', p), get: (id) => c.get(`/maintenance/${id}`), create: (b) => c.post('/maintenance', b), update: (id, b) => c.patch(`/maintenance/${id}`, b), assign: (id, assignedStaffId) => c.post(`/maintenance/${id}/assign`, { assignedStaffId }), start: (id) => c.post(`/maintenance/${id}/start`), complete: (id, b) => c.post(`/maintenance/${id}/complete`, b), cancel: (id) => c.post(`/maintenance/${id}/cancel`) },

  analytics: { overview: (p) => c.get('/analytics/overview', p), revenue: (p) => c.get('/analytics/revenue', p), occupancy: (p) => c.get('/analytics/occupancy', p), foodBeverage: (p) => c.get('/analytics/food-beverage', p), staff: (p) => c.get('/analytics/staff', p), maintenance: (p) => c.get('/analytics/maintenance', p), monthly: (p) => c.get('/analytics/monthly', p) },
  settings: { get: () => c.get('/settings'), update: (b) => c.patch('/settings', b) },
  taxRules: { list: () => c.get('/tax-rules'), create: (b) => c.post('/tax-rules', b), update: (id, b) => c.patch(`/tax-rules/${id}`, b) },
  auditLogs: { list: (p) => c.get('/audit-logs', p) },
});
