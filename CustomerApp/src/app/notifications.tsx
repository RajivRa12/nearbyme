import { Bell, Calendar, Gift, Star, Info } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { api } from "../lib/api";
import { color } from "../lib/theme";

const ICONS: Record<string, any> = {
  APPOINTMENT: Calendar,
  TIP: Gift,
  REVIEW: Star,
  SYSTEM: Info,
};

function iconFor(type?: string) {
  const key = Object.keys(ICONS).find((k) => type?.toUpperCase().includes(k));
  return key ? ICONS[key] : Bell;
}

export default function Notifications() {
  const { data, isLoading, refetch } = useQuery<any>("/api/customer/notifications/");
  const notifications = data?.results || (Array.isArray(data) ? data : []);
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markRead = async (id: number) => {
    try {
      await api(`/api/customer/notifications/${id}/mark_read/`, { method: "POST" });
      refetch();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api("/api/customer/notifications/mark_all_read/", { method: "POST" });
      refetch();
    } catch {}
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} hitSlop={8} style={tw`mt-4`}>
              <Text style={[tw`text-[13px] font-semibold`, { color: color.sage }]}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <View style={tw`gap-y-2 px-5 pb-8 pt-3`}>
        {isLoading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={26} color={color.ink3} strokeWidth={1.5} />}
            title="You're all caught up"
            subtitle="You don't have any notifications yet."
          />
        ) : (
          notifications.map((n: any) => {
            const Icon = iconFor(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.7}
                onPress={() => !n.is_read && markRead(n.id)}
                style={{
                  ...tw`flex-row gap-3.5 rounded-2xl p-4`,
                  backgroundColor: n.is_read ? "transparent" : color.sageTint,
                }}
              >
                <View style={tw`h-10 w-10 rounded-full items-center justify-center bg-white`}>
                  <Icon size={17} color={color.sage} strokeWidth={1.8} />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[14px] font-semibold text-zinc-900`}>{n.title}</Text>
                  <Text style={tw`text-[13px] text-zinc-500 mt-0.5 leading-relaxed`}>{n.message}</Text>
                  <Text style={tw`text-[11px] text-zinc-400 mt-1.5`}>
                    {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                {!n.is_read && <View style={[tw`h-2 w-2 rounded-full mt-1.5`, { backgroundColor: color.terracotta }]} />}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </MobileShell>
  );
}
