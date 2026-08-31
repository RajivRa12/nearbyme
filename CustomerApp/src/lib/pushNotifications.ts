import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

// expo-notifications removed remote push support from Expo Go in SDK 53.
// It throws a fatal error at MODULE LOAD TIME (not just at call time), so we
// must avoid importing the package entirely when running inside Expo Go.
const IS_EXPO_GO = Constants.appOwnership === "expo";

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web" || IS_EXPO_GO) return;

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
