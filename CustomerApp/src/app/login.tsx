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
    </View>
  );
}
