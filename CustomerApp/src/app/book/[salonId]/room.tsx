import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { DoorOpen } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar } from "../../../components/primitives";
import { setDraft, useDraft } from "../../../lib/bookingState";
import { useQuery } from "../../../hooks/useFetch";
import { color } from "../../../lib/theme";

export default function ChooseRoom() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();

  const { data: roomsObj, isLoading } = useQuery<any>(`/api/customer/stores/${salonId}/rooms/`, draft.mode !== "home");
  const rooms = roomsObj?.data || [];

  // Home visits don't need a physical room — skip straight to time.
  useEffect(() => {
    if (draft.mode === "home") {
      router.replace({ pathname: "/book/[salonId]/time", params: { salonId } });
    }
  }, [draft.mode]);

  if (draft.mode === "home") return null;

  return (
    <BookingStepper salonId={salonId as string} current="room" title="Choose your room">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-2`}>
          <TouchableOpacity
            onPress={() => setDraft({ roomId: undefined, roomName: "Any available room" })}
            style={tw`flex-row w-full items-center gap-3 rounded-2xl p-4 border ${
              draft.roomName && !draft.roomId ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
            }`}
          >
            <View style={[tw`size-12 rounded-full items-center justify-center`, { backgroundColor: color.sageTint }]}>
              <DoorOpen size={18} color={color.sage} strokeWidth={1.8} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-sm font-semibold ${draft.roomName && !draft.roomId ? "text-white" : "text-zinc-800"}`}>
                Any available room
              </Text>
              <Text style={tw`text-xs mt-0.5 ${draft.roomName && !draft.roomId ? "text-white/80" : "text-zinc-500"}`}>
                We'll assign the best fit on arrival.
              </Text>
            </View>
          </TouchableOpacity>

          {isLoading && <ActivityIndicator size="small" color={color.sage} style={tw`mt-4`} />}

          {!isLoading && rooms.length === 0 && (
            <Text style={tw`text-xs text-zinc-500 text-center py-4`}>No named rooms — you'll be seated wherever's free.</Text>
          )}

          {!isLoading && rooms.map((r: any) => {
            const selected = draft.roomId === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setDraft({ roomId: r.id, roomName: r.name })}
                style={tw`flex-row w-full items-center gap-3 rounded-2xl p-4 border ${
                  selected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
                }`}
              >
                <View style={[tw`size-12 rounded-full items-center justify-center`, { backgroundColor: selected ? "rgba(255,255,255,0.2)" : color.bgSoft }]}>
                  <DoorOpen size={18} color={selected ? "#fff" : color.ink3} strokeWidth={1.8} />
                </View>
                <Text style={tw`text-sm font-semibold flex-1 ${selected ? "text-white" : "text-zinc-800"}`}>{r.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton
          disabled={!draft.roomName}
          onClick={() => router.push({ pathname: "/book/[salonId]/time", params: { salonId } })}
        >
          {draft.roomName ? "Continue" : "Select a room"}
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
