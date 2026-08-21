import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { api, setToken, setUser, ApiError } from "../lib/api";
import { alertMessage } from "../lib/alert";
import { color } from "../lib/theme";

// The whole account: phone + OTP, nothing else. No password, no signup form —
// see customer-app-build-guide.pdf rule 26. Verifying the code either matches
// an existing customer by phone or creates one; name/email come later.
export function PhoneOtpForm({ onVerified }: { onVerified: (user: any) => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const requestCode = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      alertMessage("Enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ dev_otp?: string; expires_in: number }>("/api/auth/otp/request/", {
        method: "POST",
        body: { phone: digits },
      });
      setDevOtp(res.dev_otp ?? null);
      setStep("code");
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (e: any) {
      alertMessage("Couldn't send code", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length !== 6) {
      alertMessage("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await api<{ access: string; user: any }>("/api/auth/otp/verify/", {
        method: "POST",
        body: { phone: digits, code: code.trim() },
      });
      await setToken(res.access);
      await setUser(res.user);
      onVerified(res.user);
    } catch (e: any) {
      alertMessage("Couldn't verify", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <View style={tw`gap-4`}>
        <View>
          <Text style={tw`text-sm font-semibold text-zinc-700 mb-1.5`}>Phone number</Text>
          <View style={tw`flex-row items-center h-14 bg-zinc-100 rounded-xl px-4 border border-zinc-200`}>
            <Text style={tw`text-base text-zinc-500 mr-2`}>+91</Text>
            <TextInput
              style={tw`flex-1 text-base text-zinc-900`}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              maxLength={10}
              autoFocus
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={requestCode}
          disabled={loading}
          style={[tw`h-14 rounded-full items-center justify-center`, { backgroundColor: color.sage }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-base font-semibold`}>Send code</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`gap-4`}>
      <Text style={tw`text-sm text-zinc-500 -mt-1`}>Code sent to +91 {phone}</Text>
      <View>
        <Text style={tw`text-sm font-semibold text-zinc-700 mb-1.5`}>6-digit code</Text>
        <TextInput
          style={tw`h-14 bg-zinc-100 rounded-xl px-4 text-base text-zinc-900 border border-zinc-200 tracking-[8px]`}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="000000"
          maxLength={6}
          autoFocus
        />
        {devOtp && (
          <Text style={tw`text-xs text-zinc-400 mt-1.5`}>Dev mode — your code is {devOtp}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={verifyCode}
        disabled={loading}
        style={[tw`h-14 rounded-full items-center justify-center`, { backgroundColor: color.sage }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-base font-semibold`}>Verify & continue</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={requestCode} disabled={cooldown > 0 || loading}>
        <Text style={tw`text-center text-sm font-medium ${cooldown > 0 ? "text-zinc-300" : "text-[#5c6f59]"}`}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
