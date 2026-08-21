import { Platform } from "react-native";
import { api } from "./api";

// Expo push tokens require a physical device (or simulator) build — there's
// no equivalent on web, and Notifications.getExpoPushTokenAsync() would
// throw there, so this is a deliberate no-op on Platform.OS === 'web'.
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return;

    await api("/api/customer/profile/", { method: "PATCH", body: { expo_push_token: token } });
  } catch {
    // Non-critical — booking confirmations still show up in-app either way.
  }
}
