import { getSetting, saveSetting } from "./settings";

// Which desktop notifications are sent (Settings › Notifications).
export const notificationDefaults = {
  fills: true,
  alerts: true,
  stopLosses: true,
  rules: true,
  /** Show order quantities in fill notifications even when privacy mode is off. */
  quantities: true,
};

export type NotificationSettings = typeof notificationDefaults;

const KEY = "notifications";

export const getNotifications = (): NotificationSettings => ({
  ...notificationDefaults,
  ...getSetting<Partial<NotificationSettings>>(KEY, {}),
});

export const setNotifications = (settings: NotificationSettings) => saveSetting(KEY, settings);
