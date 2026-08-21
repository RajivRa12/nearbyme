import { Crown } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { color, shadow } from "../lib/theme";

export default function Memberships() {
  const { data: memObj, isLoading } = useQuery<any>('/api/customer/memberships/');
  const memberships = memObj?.results || (Array.isArray(memObj) ? memObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Memberships" subtitle="One monthly ritual, always." back={true} />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Memberships" subtitle="One monthly ritual, always." back={true} />
      <View style={tw`gap-y-4 px-5 pb-8 pt-2`}>
        {memberships.length === 0 && (
          <EmptyState
            icon={<Crown size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No active memberships"
            subtitle="Join a membership plan at your favourite salon to see it here."
          />
        )}
        {memberships.map((m: any) => {
          const isCurrent = m.is_active;
          return (
            <View
              key={m.id}
              style={{
                ...tw`rounded-[28px] p-6`,
                backgroundColor: isCurrent ? color.sage : color.bgCard,
                borderWidth: isCurrent ? 0 : 1,
                borderColor: color.line,
                ...(isCurrent ? shadow.md : shadow.xs),
              }}
            >
              <View style={tw`flex-row justify-between items-start`}>
                <View>
                  <Text
                    style={[
                      tw`text-[10px] font-semibold uppercase tracking-widest`,
                      { color: isCurrent ? "rgba(255,255,255,0.8)" : color.sage },
                    ]}
                  >
                    {m.store_name}
                  </Text>
                  <Text style={tw`mt-1 text-[24px] font-bold ${isCurrent ? "text-white" : "text-zinc-900"}`}>
                    {m.tier_name}
                  </Text>
                </View>
                <Text style={tw`text-[13px] font-bold ${isCurrent ? "text-white" : "text-zinc-900"}`}>
                  {m.end_date ? `Ends ${m.end_date}` : 'Ongoing'}
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  ...tw`mt-6 h-11 w-full rounded-2xl items-center justify-center`,
                  backgroundColor: isCurrent ? "#fff" : color.sage,
                }}
              >
                <Text style={[tw`text-[14px] font-semibold`, { color: isCurrent ? color.sage : "#fff" }]}>
                  {isCurrent ? "Current plan" : "Select plan"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </MobileShell>
  );
}
