import { Check } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";

export default function Memberships() {
  const { data: memObj, isLoading } = useQuery<any>('/api/customer/memberships/');
  const memberships = memObj?.results || (Array.isArray(memObj) ? memObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Memberships" subtitle="One monthly ritual, always." back={true} />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Memberships" subtitle="One monthly ritual, always." back={true} />
      <View style={tw`gap-y-4 px-5 pb-8`}>
        {memberships.length === 0 && (
          <View style={tw`py-12 items-center`}>
            <Text style={tw`text-sm text-zinc-500`}>No active memberships found.</Text>
          </View>
        )}
        {memberships.map((m: any) => {
          const isCurrent = m.is_active;
          return (
            <View
              key={m.id}
              style={tw`rounded-3xl p-6 border mt-2 ${isCurrent ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100/60 border-stone-200/30"
                }`}
            >
              <View style={tw`flex-row justify-between items-start`}>
                <View>
                  <Text
                    style={tw`text-[10px] font-semibold uppercase tracking-widest ${isCurrent ? "text-white/80" : "text-[#5c6f59]"
                      }`}
                  >
                    {m.store_name}
                  </Text>
                  <Text style={tw`mt-1 text-2xl font-bold ${isCurrent ? "text-white" : "text-zinc-900"}`}>
                    {m.tier_name}
                  </Text>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-sm font-bold ${isCurrent ? "text-white" : "text-zinc-900"}`}>
                    {m.end_date ? `Ends ${m.end_date}` : 'Ongoing'}
                  </Text>
                </View>
              </View>

              {/* Select Button */}
              <TouchableOpacity
                style={tw`mt-6 h-11 w-full rounded-xl items-center justify-center ${isCurrent ? "bg-white" : "bg-[#5c6f59]"
                  }`}
              >
                <Text style={tw`text-sm font-semibold ${isCurrent ? "text-[#5c6f59]" : "text-white"}`}>
                  {isCurrent ? "Current plan" : `Select plan`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </MobileShell>
  );
}
