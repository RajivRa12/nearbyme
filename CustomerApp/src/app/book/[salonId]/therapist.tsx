import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar, Rating, Avatar } from "../../../components/primitives";
import { setDraft, useDraft } from "../../../lib/bookingState";
import { useQuery } from "../../../hooks/useFetch";
import { color } from "../../../lib/theme";

export default function ChooseTherapist() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();

  const { data: profObj, isLoading } = useQuery<any>(
    `/api/customer/stores/${salonId}/phase1-professionals/?service_id=${draft.serviceId ?? ""}`,
    !!draft.serviceId
  );
  const professionals = profObj?.data || [];

  return (
    <BookingStepper salonId={salonId as string} current="therapist" title="Choose your therapist">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-2`}>
          {/* Any Available Professional Button */}
          <TouchableOpacity
            onPress={() => setDraft({ professionalId: undefined, professionalName: "Any available" })}
            style={tw`flex-row w-full items-center gap-3 rounded-2xl p-4 border ${!draft.professionalId && draft.professionalName ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
              }`}
          >
            <View style={[tw`size-12 rounded-full items-center justify-center`, { backgroundColor: color.sageTint }]}>
              <Text style={[tw`text-base font-bold`, { color: color.sage }]}>✱</Text>
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-sm font-semibold ${!draft.professionalId && draft.professionalName ? "text-white" : "text-zinc-800"}`}>
                Any available professional
              </Text>
              <Text style={tw`text-xs mt-0.5 ${!draft.professionalId && draft.professionalName ? "text-white/80" : "text-zinc-500"}`}>
                We'll match you with the best fit.
              </Text>
            </View>
          </TouchableOpacity>

          {isLoading && <ActivityIndicator size="small" color={color.sage} style={tw`mt-4`} />}

          {!isLoading && professionals.length === 0 && (
            <Text style={tw`text-xs text-zinc-500 text-center py-4`}>No professionals available for this service yet.</Text>
          )}

          {/* Individual Professional Buttons */}
          {!isLoading && professionals.map((t: any) => {
            const selected = draft.professionalId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setDraft({ professionalId: t.id, professionalName: t.display_name })}
                style={tw`flex-row w-full items-center gap-3 rounded-2xl p-4 border ${selected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
                  }`}
              >
                <Avatar name={t.display_name || "T"} size={48} />
                <View style={tw`flex-1`}>
                  <Text style={tw`text-sm font-semibold ${selected ? "text-white" : "text-zinc-800"}`}>
                    {t.display_name}
                  </Text>
                  <Text style={tw`text-xs mt-0.5 ${selected ? "text-white/80" : "text-zinc-500"}`}>
                    {t.display_role || "Staff"}
                  </Text>
                </View>
                <Rating value={4.9} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton
          disabled={!draft.professionalName}
          onClick={() => router.push({ pathname: "/book/[salonId]/room", params: { salonId } })}
        >
          {draft.professionalName ? "Continue" : "Select a professional"}
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
