import { useEffect, useRef, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Avatar } from "../../components/primitives";
import { api, toArray } from "../../lib/api";
import { color } from "../../lib/theme";
import { goBack } from "../../lib/nav";

export default function MessageDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api<any>(`/api/customer/conversations/${id}/messages/`);
      setMessages(toArray(res));
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim() || !id) return;
    const content = text.trim();
    setText("");
    try {
      await api(`/api/customer/conversations/${id}/messages/`, { method: "POST", body: { content } });
      load();
    } catch {}
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: color.bg }]}>
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={tw`flex-row items-center gap-3 px-5 pt-2 pb-3 border-b border-stone-100`}>
          <TouchableOpacity
            onPress={() => goBack("/messages")}
            hitSlop={6}
            style={[tw`h-9 w-9 -ml-2 items-center justify-center rounded-full`, { backgroundColor: color.bgSoft }]}
          >
            <ChevronLeft size={20} color={color.ink} strokeWidth={1.8} />
          </TouchableOpacity>
          <Avatar name={name || "Therapist"} size={38} />
          <Text style={tw`text-[16px] font-semibold text-zinc-900`}>{name || "Conversation"}</Text>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : (
          <ScrollView ref={scrollRef} style={tw`flex-1`} contentContainerStyle={tw`px-5 py-4 gap-2.5`}>
            {messages.length === 0 && (
              <Text style={tw`text-center text-[13px] text-zinc-400 mt-8`}>Say hello 👋</Text>
            )}
            {messages.map((m) => (
              <View key={m.id} style={tw`${m.is_mine ? "items-end" : "items-start"}`}>
                <View
                  style={{
                    ...tw`max-w-[80%] rounded-2xl px-4 py-2.5`,
                    backgroundColor: m.is_mine ? color.sage : color.bgSoft,
                    borderBottomRightRadius: m.is_mine ? 4 : 16,
                    borderBottomLeftRadius: m.is_mine ? 16 : 4,
                  }}
                >
                  <Text style={tw`text-[14px] leading-relaxed ${m.is_mine ? "text-white" : "text-zinc-800"}`}>{m.content}</Text>
                </View>
                <Text style={tw`text-[10px] text-zinc-400 mt-1`}>
                  {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={tw`flex-row items-center gap-2.5 px-5 py-3 border-t border-stone-100`}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={color.ink3}
            style={tw`flex-1 h-11 rounded-full bg-stone-100 px-4 text-[14px] text-zinc-900`}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim()}
            style={{
              ...tw`h-11 w-11 rounded-full items-center justify-center`,
              backgroundColor: text.trim() ? color.sage : color.bgSoft,
            }}
          >
            <Send size={17} color={text.trim() ? "#fff" : color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
