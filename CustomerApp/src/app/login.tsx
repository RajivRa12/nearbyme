import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import tw from 'twrnc';
import { PhoneOtpForm } from '../components/PhoneOtpForm';

export default function LoginScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  return (
    <View style={tw`flex-1 bg-white p-6 justify-center`}>
      <Text style={tw`text-4xl font-bold text-zinc-900 mb-2`}>Welcome</Text>
      <Text style={tw`text-base text-zinc-500 mb-8`}>Enter your phone number to sign in — no password needed.</Text>

      <PhoneOtpForm
        onVerified={() => {
          router.replace((returnTo as any) || '/(tabs)');
        }}
      />
      
      <View style={tw`mt-8 items-center`}>
        <Text 
          style={tw`text-blue-500 font-medium p-4`}
          onPress={async () => {
            try {
              const { api, setToken, setUser } = require('../lib/api');
              // 1. Request OTP for a dummy number
              const reqRes = await api("/api/auth/otp/request/", {
                method: "POST",
                body: { phone: "9999999999" }
              });
              // 2. Verify using the dev OTP returned
              const verRes = await api("/api/auth/otp/verify/", {
                method: "POST",
                body: { phone: "9999999999", code: reqRes.dev_otp }
              });
              await setToken(verRes.access);
              await setUser(verRes.user);
              router.replace((returnTo as any) || '/(tabs)');
            } catch (e) {
              alert("Backend is not running or unreachable.");
            }
          }}
        >
          Skip Login (Demo)
        </Text>
      </View>
    </View>
  );
}
