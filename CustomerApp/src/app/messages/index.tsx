import { useEffect, useState, useCallback } from "react";
import { MessageCircle } from "lucide-react-native";
import { Link } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader, Avatar, EmptyState } from "../../components/primitives";
import { api, toArray } from "../../lib/api";
import { color } from "../../lib/theme";

export default function MessagesList() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<any>("/api/customer/conversations/");
      setConversations(toArray(res));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Messages" />
      <View style={tw`gap-y-1 px-5 pb-8 pt-3`}>
        {loading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No messages"
            subtitle="Message a recommended therapist from Home to start a conversation."
          />
        ) : (
          conversations.map((t) => (
            <Link key={t.id} href={{ pathname: "/messages/[id]", params: { id: t.id } }} asChild>
              <TouchableOpacity activeOpacity={0.7} style={tw`flex-row items-center gap-3.5 py-3.5`}>
                <Avatar name={t.therapist_name} size={48} />
                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{t.therapist_name}</Text>
                    {!!t.last_message && (
                      <Text style={tw`text-[11px] text-zinc-400`}>
                        {new Date(t.last_message.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={tw`text-[13px] ${t.unread_count ? "text-zinc-800 font-medium" : "text-zinc-500"} mt-0.5`}
                    numberOfLines={1}
                  >
                    {t.last_message ? t.last_message.content : "Say hello 👋"}
                  </Text>
                </View>
                {!!t.unread_count && (
                  <View style={[tw`h-5 min-w-5 rounded-full items-center justify-center px-1.5`, { backgroundColor: color.terracotta }]}>
                    <Text style={tw`text-[10px] font-bold text-white`}>{t.unread_count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Link>
          ))
        )}
      </View>
    </MobileShell>
  );
}
