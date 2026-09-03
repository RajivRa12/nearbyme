import './global.css';
import { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dashboard, Schedule, Clients, Earnings, Hub, Profile, Login } from './src/pages';
import { getToken } from './src/lib/api';
import { C } from './src/lib/design';
import { registerForPushNotificationsAsync, sendPushTokenToBackend } from './src/lib/push';

import {
  LayoutGrid, CalendarDays, Users2, CreditCard, BookOpen, UserCircle
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const TABS = [
  { key: 'Dashboard', label: 'Home',     Icon: LayoutGrid },
  { key: 'Schedule',  label: 'Schedule', Icon: CalendarDays },
  { key: 'Clients',   label: 'Clients',  Icon: Users2 },
  { key: 'Earnings',  label: 'Earnings', Icon: CreditCard },
  { key: 'Hub',       label: 'Hub',      Icon: BookOpen },
  { key: 'Profile',   label: 'Me',       Icon: UserCircle },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  const press = (i: number, routeKey: string, routeName: string) => {
    const focused = state.index === i;
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(routeName);
  };

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom || 14 }]}>
      {state.routes.map((route: any, i: number) => {
        const focused = state.index === i;
        const { Icon, label } = TABS[i];
        return (
          <View key={route.key} style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => press(i, route.key, route.name)}
              activeOpacity={0.75}
              style={s.tabItem}
            >
              <Icon
                size={26}
                strokeWidth={focused ? 2.1 : 1.6}
                color={focused ? C.blue : C.ink3}
              />
              <Text style={[s.tabLabel, { color: focused ? C.blue : C.ink3, fontWeight: focused ? '700' : '500' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  
  useEffect(() => { 
    getToken().then(t => setAuthed(!!t)); 
  }, []);

  useEffect(() => {
    if (authed) {
      registerForPushNotificationsAsync().then(token => {
        if (token) sendPushTokenToBackend(token);
      });
    }
  }, [authed]);

  if (authed === null) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        {authed ? (
          <Tab.Navigator tabBar={p => <CustomTabBar {...p} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
            {TABS.map(t => {
              const pages: any = { Dashboard, Schedule, Clients, Earnings, Hub };
              if (t.key === 'Profile') {
                return <Tab.Screen key={t.key} name={t.key}>{() => <Profile onLogout={() => setAuthed(false)} />}</Tab.Screen>;
              }
              return <Tab.Screen key={t.key} name={t.key} component={pages[t.key]} />;
            })}
          </Tab.Navigator>
        ) : (
          <Login onLoginSuccess={() => setAuthed(true)} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: 'row',
    paddingTop: 12,
  },
  tabItem: { alignItems: 'center', flex: 1, gap: 4 },
  tabLabel: { fontSize: 10.5, letterSpacing: 0.1 },
});
