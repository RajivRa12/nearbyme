import { useState } from "react";
import { Sparkles, Gift, Calendar, Star } from "lucide-react-native";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { alertMessage } from "../lib/alert";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { api } from "../lib/api";
import { color, shadow } from "../lib/theme";

const MILESTONE = 500;
const REDEEM_RATE_RUPEES = 50; // what MILESTONE points are worth

const TIERS = [
  { name: "Bronze", threshold: 0 },
  { name: "Silver", threshold: 1000 },
  { name: "Gold", threshold: 2500 },
];

function currentTier(points: number) {
  return [...TIERS].reverse().find((t) => points >= t.threshold) || TIERS[0];
}

export default function Rewards() {
  const { data: profile, isLoading, refetch } = useQuery<any>("/api/customer/profile/");
  const points: number = profile?.loyalty_points ?? 0;
  const [redeeming, setRedeeming] = useState(false);

  const nextMilestone = Math.ceil((points + 1) / MILESTONE) * MILESTONE;
  const pointsToNext = nextMilestone - points;
  const progress = Math.min(1, (points % MILESTONE) / MILESTONE);
  const tier = currentTier(points);
  const nextTier = TIERS.find((t) => t.threshold > points);
  const canRedeem = points >= MILESTONE;

  const redeem = async () => {
    setRedeeming(true);
    try {
      const res: any = await api("/api/customer/rewards/redeem/", { method: "POST", body: { points: MILESTONE } });
      alertMessage("Redeemed!", `₹${res?.data?.amount_credited ?? REDEEM_RATE_RUPEES} added to your wallet.`);
      refetch();
    } catch (e: any) {
      alertMessage("Couldn't redeem", e?.message || "Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Rewards" />
      {isLoading ? (
        <View style={tw`py-16 items-center`}>
          <ActivityIndicator color={color.sage} />
        </View>
      ) : (
        <View style={tw`gap-y-6 px-5 pb-8 pt-3`}>
          {/* Points hero */}
          <View style={{ ...tw`rounded-[28px] p-6 items-center gap-2`, backgroundColor: color.sage, ...shadow.md }}>
            <Sparkles size={22} color="#fff" strokeWidth={1.6} />
            <Text style={tw`text-[13px] font-semibold uppercase tracking-widest text-white/75 mt-1`}>
              {tier.name} member
            </Text>
            <Text style={tw`text-[44px] font-bold text-white leading-tight`}>{points.toLocaleString("en-IN")}</Text>
            <Text style={tw`text-[13px] text-white/85`}>Nearbyme points</Text>
          </View>

          {/* Progress to next milestone */}
          <Card>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-[14px] font-semibold text-zinc-800`}>
                {nextTier ? `Next tier: ${nextTier.name}` : "Next reward"}
              </Text>
              <Text style={tw`text-[12px] text-zinc-500`}>{pointsToNext} points to go</Text>
            </View>
            <View style={tw`h-2 rounded-full bg-stone-100 overflow-hidden`}>
              <View style={[tw`h-2 rounded-full`, { backgroundColor: color.sage, width: `${progress * 100}%` }]} />
            </View>
          </Card>

          {/* Redeem */}
          <Card style={tw`flex-row items-center gap-3.5`}>
            <View style={[tw`h-10 w-10 rounded-full items-center justify-center`, { backgroundColor: color.sageTint }]}>
              <Gift size={16} color={color.sage} strokeWidth={1.8} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[13px] font-semibold text-zinc-900`}>Redeem {MILESTONE} points</Text>
              <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>Get ₹{REDEEM_RATE_RUPEES} added to your wallet</Text>
            </View>
            <TouchableOpacity
              onPress={redeem}
              disabled={!canRedeem || redeeming}
              style={[tw`px-4 py-2.5 rounded-xl`, { backgroundColor: canRedeem ? color.sage : color.bgSoft, opacity: redeeming ? 0.6 : 1 }]}
            >
              {redeeming ? (
                <ActivityIndicator size="small" color={canRedeem ? "#fff" : color.ink3} />
              ) : (
                <Text style={[tw`text-[13px] font-semibold`, { color: canRedeem ? "#fff" : color.ink3 }]}>Redeem</Text>
              )}
            </TouchableOpacity>
          </Card>

          {/* How to earn */}
          <View style={tw`gap-3`}>
            <Text style={tw`text-[15px] font-semibold text-zinc-900`}>How you earn points</Text>
            {[
              { icon: Calendar, text: "Complete a booking to earn points automatically" },
              { icon: Star, text: "Leave a review after your visit" },
              { icon: Gift, text: `Redeem ${MILESTONE} points anytime for ₹${REDEEM_RATE_RUPEES} wallet credit` },
            ].map((row, i) => (
              <View key={i} style={tw`flex-row items-center gap-3.5`}>
                <View style={[tw`h-10 w-10 rounded-full items-center justify-center`, { backgroundColor: color.sageTint }]}>
                  <row.icon size={16} color={color.sage} strokeWidth={1.8} />
                </View>
                <Text style={tw`flex-1 text-[13px] text-zinc-600 leading-relaxed`}>{row.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </MobileShell>
  );
}
