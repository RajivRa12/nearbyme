import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../../components/MobileShell";
import { PageHeader } from "../../../components/primitives";

export default function Reschedule() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Reschedule Booking" />
      <View style={tw`gap-y-5 px-5 pb-8`}>
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-sm text-zinc-500`}>Rescheduling is temporarily disabled.</Text>
          <TouchableOpacity onPress={() => router.back()} style={tw`mt-4 px-4 py-2 bg-[#5c6f59] rounded-xl`}>
            <Text style={tw`text-white font-semibold`}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </MobileShell>
  );
}
