import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar } from "../../../components/primitives";
import { dates, timeSlots, setDraft } from "../../../lib/bookingState";

export default function ChooseTime() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const [dateKey, setDateKey] = useState(dates[0].key);
  const [time, setTime] = useState<string | undefined>();

  const handleContinue = () => {
    if (!time) return;
    const d = dates.find((x) => x.key === dateKey)!;
    // Format the date/time string to match our seed format, e.g. "Fri, 24 Jul · 4:00 PM"
    // Wait, seed format is: "Today · 11:30 AM" or "Fri, 24 Jul · 4:00 PM"
    // Since d.weekday is e.g. "Fri", d.day is e.g. "24" and time is e.g. "14:00".
    // We can write it simply like: "Fri 24 · 14:00"
    setDraft({ 
      when: `${d.weekday} ${d.day} · ${time}`,
      date: dateKey,
      startTime: time
    });
    router.push({ pathname: "/book/[salonId]/pay", params: { salonId: salonId as string } });
  };

  return (
    <BookingStepper salonId={salonId as string} current="time" title="Pick a date & time">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-6`}>
          {/* Horizontal Date Picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
            {dates.map((d) => {
              const selected = d.key === dateKey;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDateKey(d.key)}
                  style={tw`flex h-16 w-14 items-center justify-center rounded-2xl border ${selected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"
                    }`}
                >
                  <Text style={tw`text-[10px] font-semibold uppercase ${selected ? "text-white/80" : "text-zinc-500"}`}>
                    {d.weekday}
                  </Text>
                  <Text style={tw`text-base font-bold ${selected ? "text-white" : "text-zinc-800"}`}>
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
            <View style={tw`flex-row flex-wrap justify-between gap-y-2`}>
              {timeSlots.map((t) => {
                const selected = time === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTime(t)}
                    style={tw`w-[23%] rounded-xl py-3 items-center border ${selected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"
                      }`}
                  >
                    <Text style={tw`text-xs font-semibold ${selected ? "text-white" : "text-zinc-700"}`}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton
          disabled={!time}
          onClick={handleContinue}
        >
          Continue
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
