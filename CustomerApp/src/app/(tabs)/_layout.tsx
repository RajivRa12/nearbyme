import { Tabs } from 'expo-router';
import { Home, Compass, Calendar, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { color } from '@/lib/theme';

export default function TabLayout() {
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
          paddingBottom: Platform.OS === 'ios' ? 26 : 14,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 88 : 66,
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
