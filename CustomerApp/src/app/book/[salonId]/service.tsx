import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { Home, Store } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { BookingStepper } from "../../../components/BookingStepper";
import { PrimaryButton, StickyBottomBar, EmptyState } from "../../../components/primitives";
import { setDraft, useDraft } from "../../../lib/bookingState";
import { useQuery } from "../../../hooks/useFetch";
import { color } from "../../../lib/theme";

const HOME_SURCHARGE = 15;

export default function ChooseService() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useDraft();
  const mode = draft.mode ?? "salon";
  
  const { data: menuObj, isLoading } = useQuery<any>(`/api/customer/stores/${salonId}/phase1-menu/`);
  const allServices = menuObj?.data || [];

  useEffect(() => {
    setDraft({ salonId: salonId as string, mode: draft.mode ?? "salon" });
  }, [salonId]);

  return (
    <BookingStepper salonId={salonId as string} current="service" title="Choose your service">
      <ScrollView style={tw`flex-1 px-5`} contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        {/* Where Selection */}
        <View style={tw`mb-5`}>
          <Text style={tw`mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
            Where
          </Text>
          <View style={tw`flex-row gap-2`}>
            <TouchableOpacity
              onPress={() => setDraft({ mode: "salon" })}
              style={tw`flex-1 flex-row items-center justify-center gap-2 rounded-2xl h-12 border ${mode === "salon" ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"
                }`}
            >
              <Store size={16} color={mode === "salon" ? "white" : color.ink2} strokeWidth={1.6} />
              <Text style={tw`text-sm font-semibold ${mode === "salon" ? "text-white" : "text-zinc-700"}`}>
                In-salon
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDraft({ mode: "home" })}
              style={tw`flex-1 flex-col items-center justify-center rounded-2xl h-12 border ${mode === "home" ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"
                }`}
            >
              <View style={tw`flex-row items-center gap-2`}>
                <Home size={16} color={mode === "home" ? "white" : color.ink2} strokeWidth={1.6} />
                <Text style={tw`text-sm font-semibold ${mode === "home" ? "text-white" : "text-zinc-700"}`}>
                  At home
                </Text>
              </View>
              <Text style={tw`text-[9px] font-medium ${mode === "home" ? "text-white/80" : "text-zinc-500"}`}>
                +₹{HOME_SURCHARGE} travel
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services List */}
        <View style={tw`gap-2`}>
          {isLoading && <ActivityIndicator size="large" color={color.sage} />}

          {!isLoading && allServices.length === 0 && (
            <EmptyState title="No services found" subtitle="This salon hasn't listed any services yet." />
          )}

          {!isLoading && allServices.map((s: any) => {
            const isSelected = draft.serviceId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setDraft({ serviceId: s.id, serviceName: s.name, servicePrice: s.default_price_paise / 100, depositPercentage: s.deposit_percentage, durationMin: s.duration_min })}
                style={tw`flex-row items-center justify-between rounded-2xl p-4 border ${isSelected
                    ? "bg-[#5c6f59] border-[#5c6f59]"
                    : "bg-stone-100/60 border-stone-200/30"
                  }`}
              >
                <View>
                  <Text
                    style={tw`text-sm font-semibold ${isSelected ? "text-white" : "text-zinc-800"
                      }`}
                  >
                    {s.name}
                  </Text>
                  <Text
                    style={tw`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-zinc-500"
                      }`}
                  >
                    {s.duration_min} min
                  </Text>
                </View>
                <Text
                  style={tw`text-sm font-semibold ${isSelected ? "text-white" : "text-zinc-800"
                    }`}
                >
                  ₹{s.default_price_paise / 100}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <StickyBottomBar>
        <PrimaryButton
          disabled={!draft.serviceId}
          onClick={() => router.push({ pathname: "/book/[salonId]/therapist", params: { salonId } })}
        >
          {draft.serviceId ? "Continue" : "Select a service"}
        </PrimaryButton>
      </StickyBottomBar>
    </BookingStepper>
  );
}
