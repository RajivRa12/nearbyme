import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/** Real, measured height of the app's bottom tab bar (varies by device —
 * gesture nav vs 3-button nav vs no nav bar all report different insets)
 * plus a small buffer. Use as a scroll view's contentContainerStyle
 * paddingBottom so the last bit of content never sits under the tab bar. */
export function useContentBottomPadding(extra = 24): number {
  const tabBarHeight = useBottomTabBarHeight();
  return tabBarHeight + extra;
}
