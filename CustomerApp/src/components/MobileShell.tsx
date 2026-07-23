import { type ReactNode } from "react";
import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

export function MobileShell({
  children,
  location = "Mayfair, London",
  showHeader = true,
  scroll = true,
}: {
  children: ReactNode;
  location?: string;
  showHeader?: boolean;
  scroll?: boolean;
}) {
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
    <SafeAreaView style={tw`flex-1 bg-[#faf9f6]`}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={tw`flex-1`}
      >
        {showHeader && (
          <View style={tw`flex-row items-center justify-between px-5 py-4 bg-[#faf9f6]`}>
            <Link href="/explore" asChild>
              <TouchableOpacity style={tw`flex-col`}>
                <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
                  Current location
                </Text>
                <Text style={tw`text-sm font-semibold text-zinc-900`}>{location}</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/notifications" asChild>
              <TouchableOpacity
                accessibilityLabel="Notifications"
                style={tw`flex h-10 w-10 items-center justify-center rounded-full bg-stone-200/50`}
              >
                <Bell size={18} color="#3f3f46" strokeWidth={1.5} />
              </TouchableOpacity>
            </Link>
          </View>
        )}
        {content}
      </KeyboardAvoidingView>
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
