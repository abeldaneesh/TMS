const DEVICE_ID_STORAGE_KEY = 'dmo_device_id';

const createFallbackDeviceId = () => `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getOrCreateDeviceId = (): string => {
    const existingDeviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existingDeviceId) {
        return existingDeviceId;
    }

    const nextDeviceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : createFallbackDeviceId();

    localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextDeviceId);
    return nextDeviceId;
};
