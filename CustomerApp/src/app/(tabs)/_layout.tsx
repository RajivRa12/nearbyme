import { Tabs } from 'expo-router';
import { Home, Compass, Calendar, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@/lib/theme';

// React Navigation's own default bottom-tab bar reserves 49dp for the
// icon+label row (TABBAR_HEIGHT_UIKIT) with no separate top padding. We add
// a 10dp paddingTop for visual breathing room on top of that same budget —
// so the content height must be 49 + 10, not 49 alone, or the extra
// paddingTop eats into the icon/label's own space and clips the label.
// insets.bottom (the device's real nav-bar/home-indicator height) is added
// on top of this fixed content height, never folded into it.
const TAB_BAR_CONTENT_HEIGHT = 59;
// Pure visual breathing room below the tab bar's own content, on top of
// whatever the device's real safe-area inset already requires — without
// this the bar sits flush against the system nav bar with zero gap.
const TAB_BAR_EXTRA_BOTTOM_GAP = 10;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10) + TAB_BAR_EXTRA_BOTTOM_GAP;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.sage,
        tabBarInactiveTintColor: color.ink3,
        tabBarStyle: {
          backgroundColor: color.bg,
          borderTopWidth: 1,
          borderTopColor: color.line,
          paddingBottom: bottomInset,
          paddingTop: 10,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 1,
        },
        tabBarItemStyle: {
          gap: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: c, focused }) => <Home color={c} size={22} strokeWidth={focused ? 2.1 : 1.6} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color: c, focused }) => <Compass color={c} size={22} strokeWidth={focused ? 2.1 : 1.6} />,
        }}
      />
      <Tabs.Screen
        name="ai-beauty"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color: c, focused }) => <Calendar color={c} size={22} strokeWidth={focused ? 2.1 : 1.6} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color: c, focused }) => <User color={c} size={22} strokeWidth={focused ? 2.1 : 1.6} />,
        }}
      />
    </Tabs>
  );
}
