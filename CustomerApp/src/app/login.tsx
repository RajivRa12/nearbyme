import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { setToken, setUser } from '../lib/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('client@test.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { api } = require('../lib/api');
      const data = await api('/api/auth/login/', {
        method: 'POST',
        body: { email, password },
      });
      await setToken(data.access);
      await setUser(data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-white p-6 justify-center`}>
      <Text style={tw`text-4xl font-bold text-zinc-900 mb-2`}>Welcome back</Text>
      <Text style={tw`text-base text-zinc-500 mb-8`}>Sign in to your Nearbyme account</Text>

      <View style={tw`gap-4 mb-8`}>
        <View>
          <Text style={tw`text-sm font-semibold text-zinc-700 mb-1.5`}>Email</Text>
          <TextInput
            style={tw`h-14 bg-zinc-100 rounded-xl px-4 text-base text-zinc-900 border border-zinc-200`}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text style={tw`text-sm font-semibold text-zinc-700 mb-1.5`}>Password</Text>
          <TextInput
            style={tw`h-14 bg-zinc-100 rounded-xl px-4 text-base text-zinc-900 border border-zinc-200`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={tw`bg-[#5c6f59] h-14 rounded-full items-center justify-center flex-row gap-2`}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={tw`text-white text-base font-semibold`}>Sign in</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
