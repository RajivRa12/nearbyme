import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setToken, setUser } from '../lib/api';
import { C, T, E } from '../lib/design';

export const Login = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [pwdFocused, setPwdFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api<{ access: string; user: any }>(
        '/api/auth/login/', { method: 'POST', body: { email: email.trim().toLowerCase(), password } }
      );
      await setToken(res.access);
      await setUser(res.user ?? { email });
      onLoginSuccess();
    } catch {
      setError('Incorrect email or password.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bgCard }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.container, { paddingTop: insets.top + 80 }]}>
          {/* Logo / Brand */}
          <Text style={s.brand}>Nearbyme</Text>
          
          <Text style={s.headline}>Sign in</Text>

          {/* Form */}
          <View style={s.form}>
            {/* Email */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="name@store.com"
                placeholderTextColor={C.ink3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[s.input, emailFocused && s.inputFocused]}
              />
            </View>

            {/* Password */}
            <View style={[s.field, { marginTop: 24 }]}>
              <Text style={s.fieldLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                onFocus={() => setPwdFocused(true)}
                onBlur={() => setPwdFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={C.ink3}
                secureTextEntry
                style={[s.input, pwdFocused && s.inputFocused]}
              />
            </View>

            {/* Error */}
            {!!error && <Text style={s.error}>{error}</Text>}

            {/* Button */}
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              activeOpacity={1} 
              style={[s.btn, loading && { opacity: 0.7 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Continue</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    backgroundColor: C.bgCard,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -1,
    marginBottom: 48,
  },
  headline: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: C.ink, 
    letterSpacing: -1, 
    marginBottom: 32 
  },
  form: {
    width: '100%',
  },
  field:      {},
  fieldLabel: { 
    ...T.bodySB, 
    marginBottom: 8 
  },
  input: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8, 
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...T.body,
    color: C.ink,
  },
  inputFocused: { 
    borderColor: C.blue, 
    borderWidth: 2,
    paddingHorizontal: 15, 
    paddingVertical: 15,
  },

  error: { ...T.caption, color: C.err, marginTop: 12 },

  btn: {
    backgroundColor: C.ink, 
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  btnText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff', 
    letterSpacing: 0 
  },
});
