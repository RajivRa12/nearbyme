import { Alert, Platform } from "react-native";

type AlertButton = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };

// react-native-web's Alert.alert is a hard no-op (`static alert() {}`) —
// calling it on web silently does nothing, no popup, no console output.
// Every error/confirmation message in this app goes through here instead,
// so web gets real feedback while native keeps the native Alert UI.
export function alertMessage(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons as any);
    return;
  }
  if (typeof window === "undefined") return;
  const text = message ? `${title}\n\n${message}` : title;
  if (buttons && buttons.length > 1) {
    const confirmBtn = buttons.find((b) => b.style !== "cancel") ?? buttons[buttons.length - 1];
    if (window.confirm(text)) confirmBtn.onPress?.();
    return;
  }
  window.alert(text);
  buttons?.[0]?.onPress?.();
}
