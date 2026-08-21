import { useState } from "react";
import { CalendarX } from "lucide-react-native";
import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { Chip, SegmentedControl, EmptyState, Card } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";
import { toArray, formatINR, formatSlotDate, formatSlotTime } from "../../lib/api";
import { color } from "../../lib/theme";

const UPCOMING_STATUSES = ["draft", "confirmed", "in_service"];
const PAST_STATUSES = ["completed", "cancelled", "no_show"];

export default function Bookings() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data, isLoading } = useQuery<any>('/api/customer/bookings/');

  if (isLoading) {
    return (
      <MobileShell showHeader={true} scroll={false}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  const bookings = toArray(data);
  const upcoming = bookings.filter((b: any) => UPCOMING_STATUSES.includes(b.status));
  const past = bookings.filter((b: any) => PAST_STATUSES.includes(b.status));
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-5 px-5 pb-6 pt-1`}>
        <Text style={tw`text-[28px] font-bold tracking-tight text-zinc-900`}>Bookings</Text>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
          ]}
        />

        <View style={tw`gap-3`}>
          {list.length === 0 && (
            <EmptyState
              icon={<CalendarX size={28} color={color.ink3} strokeWidth={1.5} />}
              title="Nothing here yet"
              subtitle={tab === "upcoming" ? "Book a service to see it appear here." : "Your completed visits will show up here."}
            />
          )}
          {list.map((b: any) => {
            const tone: "sand" | "sage" | "terracotta" =
              b.status === "cancelled" || b.status === "no_show" ? "terracotta" : b.status === "completed" ? "sand" : "sage";
            const firstSlot = b.slots?.[0];
            const serviceName = firstSlot?.store_service_name || "Service";
            const totalPaise = (b.slots || []).reduce((sum: number, s: any) => sum + (s.price_paise || 0), 0);
            const start = new Date(b.booking_start);

            return (
              <Card key={b.id} href={`/booking/${b.id}`} padded>
                <View style={tw`flex-row items-start justify-between`}>
                  <View style={tw`flex-1 pr-2`}>
                    <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{serviceName}</Text>
                    <Text style={tw`text-[13px] text-zinc-500 mt-0.5`}>{b.outlet_name}</Text>
                    <Text style={tw`mt-1.5 text-[12px] text-zinc-400 font-medium`}>
                      {formatSlotDate(start)} at {formatSlotTime(start)}
                      {totalPaise > 0 ? ` · ${formatINR(totalPaise / 100)}` : ""}
                    </Text>
                  </View>
                  <Chip tone={tone}>{b.status.replace("_", " ").toUpperCase()}</Chip>
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    </MobileShell>
  );
}
