import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";

export default function GiftCards() {
  const { data: cardsObj, isLoading } = useQuery<any>('/api/customer/giftcards/');
  const giftCards = cardsObj?.results || (Array.isArray(cardsObj) ? cardsObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Gift cards" subtitle="A very good gift." />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Gift cards" subtitle="A very good gift." />
      <View style={tw`gap-y-4 px-5 pb-8`}>
        {giftCards.length === 0 && (
          <View style={tw`py-12 items-center`}>
            <Text style={tw`text-sm text-zinc-500`}>You don't have any gift cards.</Text>
          </View>
        )}
        {giftCards.map((g: any) => (
          <View
            key={g.id}
            style={tw`relative overflow-hidden rounded-3xl bg-[#5c6f59] p-6 shadow-sm mt-2`}
          >
            <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-white opacity-80`}>
              Gift card
            </Text>
            <Text style={tw`mt-1 text-4xl font-bold text-white`}>₹{g.balance || g.amount}</Text>
            <TouchableOpacity style={tw`mt-5 self-start rounded-xl bg-white px-4 py-2`}>
              <Text style={tw`text-xs font-semibold text-[#5c6f59]`}>Send this gift</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={tw`h-12 w-full items-center justify-center rounded-2xl bg-stone-100 border border-stone-200/30 mt-4`}>
          <Text style={tw`text-sm font-semibold text-zinc-700`}>Redeem a code</Text>
        </TouchableOpacity>
      </View>
    </MobileShell>
  );
}
