import { Tabs } from 'expo-router';
import { Home, Compass, Sparkles, Calendar, User } from 'lucide-react-native';
import { View, Platform } from 'react-native';
import tw from 'twrnc';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5c6f59', // sage-600
        tabBarInactiveTintColor: '#a1a1aa', // zinc-400
        tabBarStyle: {
          backgroundColor: '#faf9f6', // sand-50
          borderTopWidth: 1,
          borderTopColor: 'rgba(0, 0, 0, 0.05)',
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={20} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Compass color={color} size={20} strokeWidth={1.6} />,
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
          tabBarIcon: ({ color }) => <Calendar color={color} size={20} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={20} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}
