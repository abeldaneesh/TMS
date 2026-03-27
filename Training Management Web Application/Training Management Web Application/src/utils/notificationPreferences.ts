export type NotificationMode = 'sound' | 'vibrate' | 'silent' | 'off';

const DEFAULT_NOTIFICATION_MODE: NotificationMode = 'sound';

const getStorageKey = (userId?: string) =>
  userId ? `dmo_notification_mode_${userId}` : 'dmo_notification_mode_guest';

export const getNotificationMode = (userId?: string): NotificationMode => {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_MODE;

  const storedValue = window.localStorage.getItem(getStorageKey(userId));
  if (storedValue === 'sound' || storedValue === 'vibrate' || storedValue === 'silent' || storedValue === 'off') {
    return storedValue;
  }

  return DEFAULT_NOTIFICATION_MODE;
};

export const setNotificationMode = (userId: string | undefined, mode: NotificationMode) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(getStorageKey(userId), mode);
  window.dispatchEvent(
    new CustomEvent('dmo-notification-mode-changed', {
      detail: { userId, mode },
    })
  );
};
