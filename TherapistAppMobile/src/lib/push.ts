import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';

let Notifications: any = null;

async function getNotificationsModule() {
  if (Notifications) return Notifications;
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  } catch (e) {
    console.warn("Could not load expo-notifications:", e);
    return null;
  }
}

export async function registerForPushNotificationsAsync() {
  let token;
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo && Platform.OS === 'android') {
    console.log('Push notifications are not supported in Expo Go on Android (SDK 53+).');
    return null;
  }

  const notifModule = await getNotificationsModule();
  if (!notifModule) return null;

  if (Platform.OS === 'android') {
    await notifModule.setNotificationChannelAsync('default', {
      name: 'default',
      importance: notifModule.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A66C2',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await notifModule.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await notifModule.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      const pushTokenString = (
        await notifModule.getExpoPushTokenAsync({
          projectId: projectId || "nearbyme-therapist-app", 
        })
      ).data;
      token = pushTokenString;
    } catch (e: unknown) {
      console.error(e);
      token = `${e}`;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendPushTokenToBackend(token: string) {
  if (!token) return;
  try {
  
    await api('/api/staff/profile/', {
      method: 'PATCH',
      body: { expo_push_token: token },
    });
    console.log("Successfully registered push token with backend");
  } catch (error) {
    console.error('Failed to send push token to backend:', error);
  }
}
