import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';
import { registerForPushNotifications } from '../lib/pushNotifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      setIsAuthenticated(!!token);
      SplashScreen.hideAsync();
    }
    checkAuth();
    // Re-check whenever the route changes so a fresh login/logout is picked
    // up immediately instead of bouncing back on stale auth state.
  }, [segments]);

  // No app-wide login wall — browsing (discovery, salon pages, explore) works
  // for guests. Screens that need an identified customer (booking, chat,
  // tips, reviews, favorites) check auth themselves and send the guest to
  // /login with a returnTo, landing them right back where they were.
  // See customer-app-build-guide.pdf rule 26 — a signup wall before booking
  // is the single largest cause of drop-off in this category.
  useEffect(() => {
    if (isAuthenticated === null) return;
    const inAuthGroup = segments[0] === 'login';
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    return null; // Don't render until auth is checked
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
