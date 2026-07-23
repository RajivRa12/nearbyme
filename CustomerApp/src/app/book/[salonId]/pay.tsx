import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar } from "../../../components/primitives";
import { useDraft } from "../../../lib/bookingState";
import { api } from "../../../lib/api";

const HOME_SURCHARGE = 15;

export default function Pay() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();
  const [method, setMethod] = useState<"wallet" | "card">("card");
  const [loading, setLoading] = useState(false);

  const isHome = draft.mode === "home";
  const surcharge = isHome ? HOME_SURCHARGE : 0;
  
  // Since we only store serviceId/Name/Price on draft, we reconstruct the display
  const svcName = draft.serviceName || "Service";
  const svcPrice = draft.servicePrice || 0;
  const total = Number(svcPrice) + surcharge;

  if (!draft.serviceId) {
    return (
      <BookingStepper salonId={salonId as string} current="pay" title="Summary">
        <View style={tw`p-5`}>
          <Text style={tw`text-sm text-zinc-500`}>
            Missing details. Please go back and pick a service.
          </Text>
        </View>
      </BookingStepper>
    );
  }

  const confirm = async () => {
    setLoading(true);
    try {
      // Create ISO 8601 combined string
      const dateStr = draft.date || new Date().toISOString().slice(0, 10);
      const timeStr = draft.startTime ? `${draft.startTime}:00` : "10:00:00";
      
      const payload = {
        store: Number(salonId),
        start_time: `${dateStr}T${timeStr}Z`,
        notes: `Booked via CustomerApp (${draft.mode})`,
        items: [
          { service: Number(draft.serviceId) }
        ]
      };
      
      const res = await api('/api/customer/appointments/', {
        method: 'POST',
        body: payload
      });
      
      setLoading(false);
      // Replace layout state with the details page
      router.replace({ pathname: "/booking/[id]", params: { id: res.id } });
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Booking Failed", err.message || "Could not confirm appointment.");
    }
  };

  return (
    <BookingStepper salonId={salonId as string} current="pay" title="Summary">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-5`}>
          {/* Order Details */}
          <View style={tw`rounded-3xl bg-stone-100/60 p-5 border border-stone-200/30`}>
            <View style={tw`border-b border-stone-200/40 pb-4`}>
              <View style={tw`flex-row justify-between items-start mb-2`}>
                <Text style={tw`text-base font-bold text-zinc-900`}>{svcName}</Text>
                <Text style={tw`text-base font-bold text-zinc-900`}>₹{svcPrice}</Text>
              </View>
              <Text style={tw`text-sm text-zinc-600`}>
                {draft.when}
              </Text>
              {draft.mode === "home" && (
                <View style={tw`flex-row justify-between items-start mt-3`}>
                  <Text style={tw`text-sm font-medium text-zinc-700`}>Home visit travel fee</Text>
                  <Text style={tw`text-sm font-medium text-zinc-700`}>₹{HOME_SURCHARGE}</Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row justify-between items-center pt-4`}>
              <Text style={tw`text-lg font-bold text-zinc-900`}>Total</Text>
              <Text style={tw`text-2xl font-bold text-[#5c6f59]`}>₹{total}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View>
            <Text style={tw`mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
              Pay with
            </Text>
            <View style={tw`gap-2`}>
              <TouchableOpacity
                onPress={() => setMethod("wallet")}
                style={tw`flex-row items-center justify-between rounded-2xl p-4 border ${method === "wallet"
                    ? "bg-[#5c6f59] border-[#5c6f59]"
                    : "bg-stone-100/60 border-stone-200/30"
                  }`}
              >
                <Text style={tw`text-sm font-semibold ${method === "wallet" ? "text-white" : "text-zinc-800"}`}>
                  Wallet balance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMethod("card")}
                style={tw`flex-row items-center justify-between rounded-2xl p-4 border ${method === "card"
                    ? "bg-[#5c6f59] border-[#5c6f59]"
                    : "bg-stone-100/60 border-stone-200/30"
                  }`}
              >
                <Text style={tw`text-sm font-semibold ${method === "card" ? "text-white" : "text-zinc-800"}`}>
                  Pay at venue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton disabled={loading} onPress={confirm}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            `Confirm & Pay ₹${total}`
          )}
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
