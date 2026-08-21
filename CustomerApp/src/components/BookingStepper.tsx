import { ChevronLeft } from "lucide-react-native";
import { type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { color } from "@/lib/theme";
import { goBack } from "@/lib/nav";

const steps = ["service", "therapist", "room", "time", "pay"] as const;

export function BookingStepper({
  salonId,
  current,
  children,
  title,
}: {
  salonId: string;
  current: typeof steps[number];
  children: ReactNode;
  title: string;
}) {
  const idx = steps.indexOf(current);
  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: color.bg }]}>
      {/* Header */}
      <View style={[tw`px-5 pt-3 pb-4 border-b`, { backgroundColor: color.bg, borderColor: color.line }]}>
        <View style={tw`flex-row items-center gap-2`}>
          <TouchableOpacity
            onPress={() => goBack(`/salon/${salonId}`)}
            style={[tw`flex h-9 w-9 -translate-x-2 items-center justify-center rounded-full`, { backgroundColor: color.bgSoft }]}
            accessibilityLabel="Back"
            hitSlop={6}
          >
            <ChevronLeft size={20} color={color.ink} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={[tw`text-[10px] font-semibold uppercase tracking-widest`, { color: color.sage }]}>
            Step {idx + 1} of {steps.length}
          </Text>
        </View>
        <Text style={tw`mt-2 text-[24px] font-bold tracking-tight text-zinc-900`}>{title}</Text>

        {/* Step bars */}
        <View style={tw`mt-3.5 flex-row gap-1.5`}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[tw`h-1 flex-1 rounded-full`, { backgroundColor: i <= idx ? color.sage : color.line }]}
            />
          ))}
        </View>
      </View>

      {/* Main body */}
      <View style={tw`flex-1`}>{children}</View>
    </SafeAreaView>
  );
}
