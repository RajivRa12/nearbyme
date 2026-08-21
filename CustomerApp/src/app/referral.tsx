import { useState } from "react";
import { Gift, Share2, Users } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, Share } from "react-native";
import { alertMessage } from "../lib/alert";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card, PrimaryButton } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { api } from "../lib/api";
import { color, shadow } from "../lib/theme";

export default function Referral() {
  const { data, isLoading, refetch } = useQuery<any>("/api/customer/referral/");
  const referral = data?.data ?? data;
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const share = async () => {
    if (!referral?.referral_code) return;
    try {
      await Share.share({
        message: `Join me on Nearbyme and get rewarded! Use my referral code ${referral.referral_code} when you sign up.`,
      });
    } catch {
      // user cancelled — nothing to do
    }
  };

  const applyCode = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      const res: any = await api("/api/customer/referral/", { method: "POST", body: { code: code.trim() } });
      alertMessage("Referral applied!", res?.message || "Your friend has been rewarded.");
      setCode("");
      refetch();
    } catch (e: any) {
      alertMessage("Couldn't apply code", e?.message || "Please check the code and try again.");
    } finally {
      setApplying(false);
    }
  };

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Refer a friend" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Refer a friend" subtitle="Share Nearbyme, earn rewards." />
      <View style={tw`gap-y-5 px-5 pb-8 pt-2`}>
        <View style={{ ...tw`rounded-[28px] p-6 items-center`, backgroundColor: color.sage, ...shadow.md }}>
          <Gift size={28} color="#fff" strokeWidth={1.6} />
          <Text style={tw`mt-3 text-[12px] font-semibold uppercase tracking-widest text-white opacity-75`}>
            Your referral code
          </Text>
          <Text style={tw`mt-1.5 text-[30px] font-bold text-white tracking-wider font-mono`}>
            {referral?.referral_code}
          </Text>
          <TouchableOpacity onPress={share} style={tw`mt-5 flex-row items-center gap-2 rounded-xl bg-white px-5 py-3`}>
            <Share2 size={15} color={color.sage} strokeWidth={2} />
            <Text style={[tw`text-[13px] font-semibold`, { color: color.sage }]}>Share your code</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <View style={tw`flex-row items-center gap-3`}>
            <View style={[tw`h-10 w-10 rounded-full items-center justify-center`, { backgroundColor: color.sageTint }]}>
              <Users size={16} color={color.sage} strokeWidth={1.8} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[15px] font-bold text-zinc-900`}>{referral?.total_referred ?? 0} friends referred</Text>
              <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>{referral?.total_points_earned ?? 0} loyalty points earned</Text>
            </View>
          </View>
        </Card>

        {!referral?.was_referred && (
          <Card style={tw`gap-y-3`}>
            <Text style={tw`text-[13px] font-semibold text-zinc-800`}>Have a friend's code?</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="NBXXX"
              autoCapitalize="characters"
              style={tw`h-12 px-4 rounded-xl border border-stone-200 text-[14px] text-zinc-800 font-mono`}
            />
            <PrimaryButton disabled={applying || !code.trim()} onClick={applyCode}>
              {applying ? "Applying…" : "Apply code"}
            </PrimaryButton>
          </Card>
        )}
      </View>
    </MobileShell>
  );
}
