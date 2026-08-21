import { router } from "expo-router";

/**
 * router.back() throws "GO_BACK was not handled by any navigator" when there's
 * no history to pop (e.g. the screen was opened directly via a deep link or a
 * typed URL, which is common on web). Falls back to a known-good route instead.
 */
export function goBack(fallback: string = "/") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
