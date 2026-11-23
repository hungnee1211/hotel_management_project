/** One place that decides which theme colour each status uses, so a status looks the same on every page. */
const T = { good: 'success', warn: 'warning', bad: 'danger', info: 'info', neutral: 'neutral', accent: 'accent' };
const MAP = {
  PENDING: T.warn, REQUESTED: T.warn, DRAFT: T.neutral, ASSIGNED: T.info, CONFIRMED: T.info, ISSUED: T.info, SCHEDULED: T.info, IN_PROGRESS: T.accent, PREPARING: T.accent, DELIVERING: T.accent, READY: T.info, OPEN: T.info,
  CHECKED_IN: T.good, DELIVERED: T.good, COMPLETED: T.good, SUCCEEDED: T.good, PAID: T.good, ACTIVE: T.good, AVAILABLE: T.good, CLEAN: T.good, INSPECTED: T.good, CLOSED: T.neutral, CHECKED_OUT: T.neutral, INACTIVE: T.neutral, RETIRED: T.neutral,
  PARTIALLY_PAID: T.warn, PARTIALLY_REFUNDED: T.warn, OVERDUE: T.bad, CANCELLED: T.bad, REJECTED: T.bad, FAILED: T.bad, NO_SHOW: T.bad, EXPIRED: T.bad, VOID: T.bad, DAMAGED: T.bad, ABSENT: T.bad, OUT_OF_SERVICE: T.bad,
  REFUNDED: T.neutral, OCCUPIED: T.accent, CLEANING: T.warn, DIRTY: T.bad, MAINTENANCE: T.warn, IN_MAINTENANCE: T.warn, INSPECTING: T.info, MISSING_CHECKOUT: T.warn, PROCESSING: T.info,
  LOW: T.neutral, MEDIUM: T.info, HIGH: T.warn, URGENT: T.bad,
};
export const toneOf = (status) => MAP[status] ?? 'neutral';
export const KNOWN_STATUSES = Object.keys(MAP);
