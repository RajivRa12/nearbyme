import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, Pressable, Platform } from "react-native";
import tw from "twrnc";
import { Clock } from "lucide-react-native";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar } from "../../../components/primitives";
import { PhoneOtpForm } from "../../../components/PhoneOtpForm";
import { useDraft, setDraft } from "../../../lib/bookingState";
import { api, getToken, ApiError } from "../../../lib/api";
import { alertMessage } from "../../../lib/alert";
import { openRazorpayCheckout } from "../../../lib/razorpay";
import { goBack } from "../../../lib/nav";
import { color } from "../../../lib/theme";

const HOME_SURCHARGE = 15;

function useCountdown(expiresAt?: string) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) { setSecondsLeft(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secondsLeft;
}

export default function Pay() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();
  const [method, setMethod] = useState<"wallet" | "card" | "online" | "deposit">("card");
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const secondsLeft = useCountdown(draft.holdExpiresAt);
  const holdExpired = draft.holdId != null && secondsLeft === 0;

  const isHome = draft.mode === "home";
  const surcharge = isHome ? HOME_SURCHARGE : 0;
  
  // Since we only store serviceId/Name/Price on draft, we reconstruct the display
  const svcName = draft.serviceName || "Service";
  const svcPrice = draft.servicePrice || 0;
  const total = Number(svcPrice) + surcharge;
  const depositPercentage = draft.depositPercentage ?? 20;
  const depositAmount = Math.round((Number(svcPrice) * depositPercentage) / 100);
  const balanceDue = total - depositAmount;
  const payingNow = method === "deposit" ? depositAmount : total;

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
    if (!draft.startTime || !draft.endTime) {
      alertMessage("Missing details", "Please go back and pick a time.");
      return;
    }
    if (isHome && !draft.serviceAddress?.trim()) {
      alertMessage("Address required", "Please enter where you'd like the therapist to visit.");
      return;
    }
    if (holdExpired) {
      alertMessage("Your hold expired", "That reservation window closed. Please pick another time.");
      goBack(`/book/${salonId}/time`);
      return;
    }
    // Phone + OTP is the account (rule 26) — a guest reaches this exact
    // point before ever seeing a signup form. Verify inline, then continue
    // straight into the same booking call, no extra tap required.
    const token = await getToken();
    if (!token) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    try {
      let paymentFields: Record<string, string> = {};
      if (method === "online" || method === "deposit") {
        let order: any;
        try {
          const orderRes = await api<{ data: any }>(`/api/customer/stores/${salonId}/create-payment-order/`, {
            method: "POST",
            body: {
              store_service_id: draft.serviceId,
              payment_type: method === "deposit" ? "deposit" : "full",
              ...(draft.holdId ? { hold_id: draft.holdId } : {}),
            },
          });
          order = orderRes.data;
        } catch (e: any) {
          setLoading(false);
          if (e instanceof ApiError && e.status === 503) {
            alertMessage("Online payment unavailable", "This store hasn't turned on online payments yet. Please choose Pay at venue or Wallet balance.");
          } else {
            alertMessage("Couldn't start payment", e?.message || "Please try again.");
          }
          return;
        }
        const paid = await openRazorpayCheckout({
          keyId: order.key_id, amount: order.amount, currency: order.currency,
          orderId: order.order_id, name: "Nearbyme", description: svcName,
        });
        if (!paid) {
          setLoading(false);
          return;
        }
        paymentFields = {
          razorpay_order_id: paid.razorpay_order_id,
          razorpay_payment_id: paid.razorpay_payment_id,
          razorpay_signature: paid.razorpay_signature,
        };
      }
      const payload = {
        store_service_id: draft.serviceId,
        slot_start: draft.startTime,
        slot_end: draft.endTime,
        ...(draft.professionalId ? { professional_id: draft.professionalId } : {}),
        ...(draft.holdId ? { hold_id: draft.holdId } : {}),
        ...(isHome ? { is_home_service: true, service_address: draft.serviceAddress?.trim() } : {}),
        ...paymentFields,
      };
      const res = await api<{ data: any }>(`/api/customer/stores/${salonId}/phase1-book/`, {
        method: 'POST',
        body: payload,
      });
      setLoading(false);
      if (res.data?.conflict) {
        alertMessage("Slot no longer available", "That time was just booked by someone else. Please pick another slot.");
        goBack(`/book/${salonId}/time`);
        return;
      }
      router.replace({ pathname: "/booking/[id]", params: { id: res.data.id } });
    } catch (err: any) {
      setLoading(false);
      alertMessage("Booking Failed", err.message || "Could not confirm appointment.");
    }
  };

  return (
    <BookingStepper salonId={salonId as string} current="pay" title="Summary">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-5`}>
          {/* Hold countdown */}
          {draft.holdId && secondsLeft !== null && (
            <View
              style={tw`flex-row items-center gap-2 rounded-2xl px-4 py-3 ${holdExpired ? "bg-red-50" : "bg-stone-100/60"
                }`}
            >
              <Clock size={14} color={holdExpired ? "#b91c1c" : color.sage} strokeWidth={2} />
              <Text style={tw`text-xs font-medium ${holdExpired ? "text-red-700" : "text-zinc-600"}`}>
                {holdExpired
                  ? "Your hold expired — please pick another time."
                  : `Slot held for ${String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`}
              </Text>
            </View>
          )}

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
              {draft.roomName && (
                <Text style={tw`text-sm text-zinc-600 mt-1`}>Room preference: {draft.roomName}</Text>
              )}
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
            {method === "deposit" && (
              <View style={tw`flex-row justify-between items-center pt-2 mt-2 border-t border-stone-200/40`}>
                <Text style={tw`text-xs text-zinc-500`}>Pay now ({depositPercentage}% deposit) · ₹{balanceDue} due at venue</Text>
                <Text style={tw`text-sm font-bold text-[#5c6f59]`}>₹{depositAmount}</Text>
              </View>
            )}
          </View>

          {/* Home service address */}
          {isHome && (
            <View>
              <Text style={tw`mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
                Visit address
              </Text>
              <TextInput
                value={draft.serviceAddress ?? ""}
                onChangeText={(text) => setDraft({ serviceAddress: text })}
                placeholder="Flat / house no., street, area, city"
                multiline
                numberOfLines={3}
                style={[tw`rounded-2xl p-4 border border-stone-200/30 bg-stone-100/60 text-sm text-zinc-800`, { minHeight: 80, textAlignVertical: "top" }]}
                placeholderTextColor={color.ink3}
              />
            </View>
          )}

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
              {Platform.OS === "web" && (
                <TouchableOpacity
                  onPress={() => setMethod("online")}
                  style={tw`flex-row items-center justify-between rounded-2xl p-4 border ${method === "online"
                      ? "bg-[#5c6f59] border-[#5c6f59]"
                      : "bg-stone-100/60 border-stone-200/30"
                    }`}
                >
                  <Text style={tw`text-sm font-semibold ${method === "online" ? "text-white" : "text-zinc-800"}`}>
                    Pay online
                  </Text>
                </TouchableOpacity>
              )}
              {Platform.OS === "web" && (
                <TouchableOpacity
                  onPress={() => setMethod("deposit")}
                  style={tw`flex-row items-center justify-between rounded-2xl p-4 border ${method === "deposit"
                      ? "bg-[#5c6f59] border-[#5c6f59]"
                      : "bg-stone-100/60 border-stone-200/30"
                    }`}
                >
                  <Text style={tw`text-sm font-semibold ${method === "deposit" ? "text-white" : "text-zinc-800"}`}>
                    Pay {depositPercentage}% deposit online
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        {holdExpired ? (
          <PrimaryButton onClick={() => goBack(`/book/${salonId}/time`)}>
            Pick another time
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={loading} onClick={confirm}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              `Confirm & Pay ₹${payingNow}`
            )}
          </PrimaryButton>
        )}
      </StickyBottomBar>

      <Modal visible={showAuth} transparent animationType="slide" onRequestClose={() => setShowAuth(false)}>
        <Pressable style={tw`flex-1 bg-black/50`} onPress={() => setShowAuth(false)} />
        <View style={tw`bg-white rounded-t-3xl p-6 pb-10`}>
          <View style={tw`items-center mb-4`}>
            <View style={tw`w-9 h-1 rounded-full bg-zinc-200`} />
          </View>
          <Text style={tw`text-xl font-bold text-zinc-900 mb-1`}>Verify your number</Text>
          <Text style={tw`text-sm text-zinc-500 mb-6`}>One quick step before we confirm your booking.</Text>
          <PhoneOtpForm
            onVerified={() => {
              setShowAuth(false);
              confirm();
            }}
          />
        </View>
      </Modal>
    </BookingStepper>
  );
}
