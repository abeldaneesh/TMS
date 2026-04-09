export const JWT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_SESSION_LEASE_MS = 90 * 1000;
export const SESSION_CLOSE_GRACE_MS = 35 * 1000;
export const SESSION_EXTENSION_THRESHOLD_MS = 30 * 1000;

export const buildSessionLeaseExpiry = (
    baseTimestamp = Date.now(),
    durationMs = ACTIVE_SESSION_LEASE_MS
) => new Date(baseTimestamp + durationMs);
