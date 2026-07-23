import { useState } from "react";
import { Link } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { Chip } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";

export default function Bookings() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data: aptsObj, isLoading } = useQuery<any>('/api/customer/appointments/');

  if (isLoading) {
    return (
      <MobileShell showHeader={true} scroll={false}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  const bookings = aptsObj?.results || (Array.isArray(aptsObj) ? aptsObj : []);

  const upcoming = bookings.filter((b: any) => b.status === "UPCOMING" || b.status === "PENDING");
  const past = bookings.filter((b: any) => b.status === "COMPLETED" || b.status === "CANCELLED");
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-5 px-5 pb-6 pt-2`}>
        <Text style={tw`text-2xl font-bold tracking-tight text-zinc-900`}>Bookings</Text>

        {/* Toggle tabs */}
        <View style={tw`flex-row rounded-full bg-stone-200/50 p-1`}>
          {(["upcoming", "past"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={tw`flex-1 rounded-full py-2 items-center ${tab === t ? "bg-[#5c6f59]" : ""}`}
            >
              <Text style={tw`text-xs font-semibold capitalize ${tab === t ? "text-white" : "text-zinc-600"}`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bookings list */}
        <View style={tw`gap-3`}>
          {list.length === 0 && (
            <View style={tw`rounded-2xl bg-stone-100 p-6 items-center`}>
              <Text style={tw`text-sm font-semibold text-zinc-500`}>Nothing here yet.</Text>
            </View>
          )}
          {list.map((b: any) => {
            const tone: "sand" | "sage" | "terracotta" =
              b.status === "CANCELLED" ? "terracotta" : b.status === "COMPLETED" ? "sand" : "sage";
            const serviceName = b.items?.[0]?.service?.name || "Service";
            const storeName = b.store?.name || "Unknown Store";

            return (
              <Link
                key={b.id}
                href={{ pathname: "/booking/[id]", params: { id: b.id } }}
                asChild
              >
                <TouchableOpacity style={tw`flex-col rounded-2xl bg-stone-100/60 p-4 border border-stone-200/30`}>
                  <View style={tw`flex-row items-start justify-between`}>
                    <View style={tw`flex-1 pr-2`}>
                      <Text style={tw`text-sm font-semibold text-zinc-900`}>{serviceName}</Text>
                      <Text style={tw`text-xs text-zinc-500 mt-0.5`}>
                        {storeName}
                      </Text>
                      <Text style={tw`mt-1 text-xs text-zinc-400 font-medium`}>{b.date} at {b.start_time}</Text>
                    </View>
                    <Chip tone={tone}>{b.status}</Chip>
                  </View>
                </TouchableOpacity>
              </Link>
            );
          })}
        </View>
      </View>
    </MobileShell>
  );
}
