import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar, Rating } from "../../../components/primitives";
import { setDraft, useDraft } from "../../../lib/bookingState";
import { useQuery } from "../../../hooks/useFetch";

export default function ChooseTherapist() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();
  
  const { data: recObj, isLoading } = useQuery<any>('/api/customer/recommended-therapists/');
  const therapists = recObj?.results || (Array.isArray(recObj) ? recObj : []);
  const staff = therapists.filter((t: any) => t.store === Number(salonId));

  return (
    <BookingStepper salonId={salonId as string} current="therapist" title="Choose your therapist">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-2`}>
          {/* Any Available Therapist Button */}
          <TouchableOpacity
            onPress={() => setDraft({ therapistId: "any" })}
            style={tw`flex-row w-full items-center gap-3 rounded-2xl p-4 border ${draft.therapistId === "any" ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
              }`}
          >
            <View style={tw`size-12 rounded-full bg-stone-200 items-center justify-center`}>
              <Text style={tw`text-base font-bold text-zinc-700`}>✱</Text>
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-sm font-semibold ${draft.therapistId === "any" ? "text-white" : "text-zinc-800"}`}>
                Any available therapist
              </Text>
              <Text style={tw`text-xs mt-0.5 ${draft.therapistId === "any" ? "text-white/80" : "text-zinc-500"}`}>
                We'll match you with the best fit.
              </Text>
            </View>
          </TouchableOpacity>

          {isLoading && <ActivityIndicator size="small" color="#5c6f59" style={tw`mt-4`} />}

          {/* Individual Therapist Buttons */}
          {!isLoading && staff.map((t: any) => {
            const selected = draft.therapistId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setDraft({ therapistId: t.id })}
                style={tw`flex-row w-full items-center gap-3 rounded-2xl p-4 border ${selected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
                  }`}
              >
                <View style={tw`size-12 rounded-full bg-stone-200 items-center justify-center`}>
                  <Text style={tw`text-xl font-bold text-zinc-400`}>{t.first_name?.charAt(0) || 'T'}</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-sm font-semibold ${selected ? "text-white" : "text-zinc-800"}`}>
                    {t.first_name} {t.last_name}
                  </Text>
                  <Text style={tw`text-xs mt-0.5 ${selected ? "text-white/80" : "text-zinc-500"}`}>
                    Staff
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
          disabled={!draft.therapistId}
          onPress={() => router.push({ pathname: "/book/[salonId]/date", params: { salonId } })}
        >
          {draft.therapistId ? "Continue" : "Select a therapist"}
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
