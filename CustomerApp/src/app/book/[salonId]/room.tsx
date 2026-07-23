import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar } from "../../../components/primitives";
import { rooms, setDraft, useDraft } from "../../../lib/bookingState";

export default function ChooseRoom() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();

  return (
    <BookingStepper salonId={salonId as string} current="room" title="Choose your room">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-2`}>
          {rooms.map((r) => {
            const selected = draft.roomId === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setDraft({ roomId: r.id })}
                style={tw`w-full rounded-2xl p-4 border ${selected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
                  }`}
              >
                <Text style={tw`text-sm font-semibold ${selected ? "text-white" : "text-zinc-800"}`}>
                  {r.name}
                </Text>
                <Text style={tw`text-xs mt-0.5 ${selected ? "text-white/80" : "text-zinc-500"}`}>
                  {r.note}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton
          disabled={!draft.roomId}
          onClick={() => router.push({ pathname: "/book/[salonId]/time", params: { salonId: salonId as string } })}
        >
          Continue
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
