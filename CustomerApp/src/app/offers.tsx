import { View, Text, ActivityIndicator, FlatList, TouchableOpacity } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { useQuery } from "../hooks/useFetch";

export default function Offers() {
  const { data: offersObj, isLoading } = useQuery<any>('/api/customer/offers/');
  const offers = offersObj?.results || (Array.isArray(offersObj) ? offersObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={true} scroll={false}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-6 pb-6 pt-2`}>
        <View style={tw`px-5`}>
          <Text style={tw`text-2xl font-bold tracking-tight text-zinc-900`}>Offers</Text>
        </View>

        {/* Offers List */}
        <View style={tw`gap-3`}>
          <View style={tw`px-5 gap-2`}>
            {offers.length === 0 && (
              <View style={tw`py-12 items-center`}>
                <Text style={tw`text-sm text-zinc-500`}>No active offers right now.</Text>
              </View>
            )}
            
            {offers.map((o: any) => (
              <View
                key={o.id}
                style={tw`flex-row items-center justify-between rounded-2xl bg-stone-100 p-4 border border-stone-200/30`}
              >
                <View>
                  <Text style={tw`text-sm font-semibold text-zinc-800`}>{o.code}</Text>
                  <Text style={tw`text-xs text-zinc-500 mt-0.5`}>Valid until: {o.valid_until || 'No expiry'}</Text>
                </View>
                <View style={tw`rounded-full bg-[#c06048]/10 px-3 py-1`}>
                  <Text style={tw`text-xs font-semibold text-[#c06048]`}>{o.discount_percent}% OFF</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </MobileShell>
  );
}
