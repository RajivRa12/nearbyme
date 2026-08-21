import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar } from "../../../components/primitives";
import { dates, setDraft, useDraft } from "../../../lib/bookingState";
import { useQuery } from "../../../hooks/useFetch";
import { color } from "../../../lib/theme";
import { api, formatSlotDate, formatSlotTime } from "../../../lib/api";
import { alertMessage } from "../../../lib/alert";

export default function ChooseTime() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();
  const [dateKey, setDateKey] = useState(dates[0].key);
  const [selected, setSelected] = useState<{ start: string; end: string } | undefined>();
  const [holding, setHolding] = useState(false);

  const url = `/api/customer/stores/${salonId}/phase1-availability/?service_id=${draft.serviceId ?? ""}&date=${dateKey}${draft.professionalId ? `&professional_id=${draft.professionalId}` : ""}`;
  const { data: availObj, isLoading, refetch } = useQuery<any>(url, !!draft.serviceId);
  const slots: { start: string; end: string }[] = availObj?.data?.slots ?? [];

  // Reserve the slot the moment the guest commits to it — TTL ~8 min — so it
  // can't be taken while they finish OTP + payment. Build guide section 6.
  const handleContinue = async () => {
    if (!selected || holding) return;
    setHolding(true);
    try {
      const res = await api<{ data: any }>(`/api/customer/stores/${salonId}/hold-slot/`, {
        method: "POST",
        body: {
          store_service_id: draft.serviceId,
          professional_id: draft.professionalId,
          slot_start: selected.start,
          slot_end: selected.end,
          session_token: draft.sessionToken,
        },
      });
      const when = formatSlotDate(selected.start, { weekday: "short", day: "numeric", month: "short" }) +
        " · " + formatSlotTime(selected.start);
      setDraft({
        when, date: dateKey, startTime: selected.start, endTime: selected.end,
        holdId: res.data.id, holdExpiresAt: res.data.expires_at,
        ...(res.data.professional_id ? { professionalId: res.data.professional_id, professionalName: res.data.professional_name } : {}),
      });
      router.push({ pathname: "/book/[salonId]/pay", params: { salonId: salonId as string } });
    } catch (e: any) {
      alertMessage("That slot just went", "Someone else just booked it. Please pick another time.");
      setSelected(undefined);
      refetch();
    } finally {
      setHolding(false);
    }
  };

  return (
    <BookingStepper salonId={salonId as string} current="time" title="Pick a date & time">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-6`}>
          {/* Horizontal Date Picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
            {dates.map((d) => {
              const isSelected = d.key === dateKey;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => { setDateKey(d.key); setSelected(undefined); }}
                  style={tw`flex h-16 w-14 items-center justify-center rounded-2xl border ${isSelected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"
                    }`}
                >
                  <Text style={tw`text-[10px] font-semibold uppercase ${isSelected ? "text-white/80" : "text-zinc-500"}`}>
                    {d.weekday}
                  </Text>
                  <Text style={tw`text-base font-bold ${isSelected ? "text-white" : "text-zinc-800"}`}>
                    {d.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Picker */}
          <View>
            <Text style={tw`mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
              Available times
            </Text>
            {isLoading && <ActivityIndicator size="small" color={color.sage} />}
            {!isLoading && slots.length === 0 && (
              <Text style={tw`text-xs text-zinc-500`}>No availability on this date. Try another day.</Text>
            )}
            <View style={tw`flex-row flex-wrap justify-between gap-y-2`}>
              {slots.map((s) => {
                const isSelected = selected?.start === s.start;
                const label = formatSlotTime(s.start);
                return (
                  <TouchableOpacity
                    key={s.start}
                    onPress={() => setSelected(s)}
                    style={tw`w-[23%] rounded-xl py-3 items-center border ${isSelected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"
                      }`}
                  >
                    <Text style={tw`text-xs font-semibold ${isSelected ? "text-white" : "text-zinc-700"}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton disabled={!selected || holding} onClick={handleContinue}>
          {holding ? <ActivityIndicator color="white" /> : "Continue"}
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
