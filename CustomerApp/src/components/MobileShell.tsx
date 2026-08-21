import { type ReactNode, useState } from "react";
import { Link } from "expo-router";
import { Bell, MapPin, ChevronDown } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { color } from "@/lib/theme";
import { useLocation } from "@/lib/locationState";
import { LocationPicker } from "./LocationPicker";

export function MobileShell({
  children,
  location,
  showHeader = true,
  scroll = true,
}: {
  children: ReactNode;
  /** Override the global location display; defaults to the user's picked location. */
  location?: string;
  showHeader?: boolean;
  scroll?: boolean;
}) {
  const picked = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const displayLocation = location ?? picked.city;
  const content = scroll ? (
    <ScrollView
      style={tw`flex-1`}
      contentContainerStyle={tw`pb-28`}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={tw`flex-1 pb-24`}>{children}</View>
  );

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: color.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        {showHeader && (
          <View style={[tw`flex-row items-center justify-between px-5 pt-2 pb-3`, { backgroundColor: color.bg }]}>
            <TouchableOpacity style={tw`flex-row items-center gap-1.5`} hitSlop={6} onPress={() => setPickerOpen(true)}>
              <MapPin size={13} color={color.sage} strokeWidth={2.2} />
              <View>
                <Text style={[tw`text-[10px] font-semibold uppercase tracking-widest`, { color: color.sage }]}>
                  Current location
                </Text>
                <View style={tw`flex-row items-center gap-1`}>
                  <Text style={tw`text-[14px] font-semibold text-zinc-900`}>{displayLocation}</Text>
                  <ChevronDown size={13} color={color.ink3} strokeWidth={2.4} />
                </View>
              </View>
            </TouchableOpacity>
            <Link href="/notifications" asChild>
              <TouchableOpacity
                accessibilityLabel="Notifications"
                hitSlop={6}
                style={{ ...tw`flex h-10 w-10 items-center justify-center rounded-full`, backgroundColor: color.bgSoft }}
              >
                <Bell size={18} color={color.ink} strokeWidth={1.6} />
              </TouchableOpacity>
            </Link>
          </View>
        )}
        {content}
      </KeyboardAvoidingView>
      <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}

export function FullscreenShell({
  children,
  scroll = true 
}: { 
  children: ReactNode;
  scroll?: boolean;
}) {
  const content = scroll ? (
    <ScrollView 
      style={tw`flex-1`} 
      contentContainerStyle={tw`pb-24`}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={tw`flex-1`}>{children}</View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-[#faf9f6]`}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={tw`flex-1`}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
