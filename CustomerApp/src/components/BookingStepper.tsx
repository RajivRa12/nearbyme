import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { type ReactNode } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

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
    <SafeAreaView style={tw`flex-1 bg-[#faf9f6]`}>
      {/* Header */}
      <View style={tw`bg-[#faf9f6] px-5 pt-4 pb-3 border-b border-stone-200/20`}>
        <View style={tw`flex-row items-center gap-2`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`flex h-9 w-9 -translate-x-2 items-center justify-center rounded-full bg-stone-100`}
            accessibilityLabel="Back"
          >
            <ChevronLeft size={20} color="#27272a" strokeWidth={1.6} />
          </TouchableOpacity>
          <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
            Step {idx + 1} of {steps.length}
          </Text>
        </View>
        <Text style={tw`mt-2 text-2xl font-bold tracking-tight text-zinc-900`}>{title}</Text>
        
        {/* Step bars */}
        <View style={tw`mt-3 flex-row gap-1`}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={tw`h-1 flex-1 rounded-full ${i <= idx ? "bg-[#5c6f59]" : "bg-stone-200"}`}
            />
          ))}
        </View>
      </View>

      {/* Main body */}
      <View style={tw`flex-1`}>{children}</View>
    </SafeAreaView>
  );
}
