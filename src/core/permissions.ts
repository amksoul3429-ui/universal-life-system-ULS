/**
 * ARVENA capability and permission boundary.
 * No browser permission is requested automatically; the user must initiate it.
 */
export type NotificationAccess = "unsupported" | "default" | "granted" | "denied";

export function getNotificationAccess(): NotificationAccess {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationAccess(): Promise<NotificationAccess> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); }
    catch { return getNotificationAccess(); }
  }
  return Notification.permission;
}

export function sendSystemNotification(title: string, body: string): boolean {
  if (getNotificationAccess() !== "granted") return false;
  try {
    new Notification(title, { body, icon: "/icons.svg", tag: "arvena-system" });
    return true;
  } catch { return false; }
}

/** Central allow-list for capabilities exposed by this local-first build. */
export const SYSTEM_CAPABILITIES = {
  localPersistence: true,
  crossTabSync: true,
  versionedBackup: true,
  browserNotifications: true,
  cloudSync: false,
  remoteAI: false,
  externalActions: false,
  encryptedStorage: false,
} as const;
