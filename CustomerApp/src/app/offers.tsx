import { Tag } from "lucide-react-native";
import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { Card, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { formatDiscount } from "../lib/api";
import { color } from "../lib/theme";

export default function Offers() {
  const { data: offersObj, isLoading } = useQuery<any>('/api/customer/offers/');
  const offers = offersObj?.results || (Array.isArray(offersObj) ? offersObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={true} scroll={false}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-6 pb-6 pt-1`}>
        <View style={tw`px-5`}>
          <Text style={tw`text-[28px] font-bold tracking-tight text-zinc-900`}>Offers</Text>
        </View>

        <View style={tw`px-5 gap-3`}>
          {offers.length === 0 && (
            <EmptyState
              icon={<Tag size={26} color={color.ink3} strokeWidth={1.5} />}
              title="No active offers"
              subtitle="Check back soon for new deals and discounts."
            />
          )}

          {offers.map((o: any) => (
            <Card key={o.id}>
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{o.code}</Text>
                  <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>
                    {o.store_name ? `${o.store_name} · ` : ""}
                    {o.end_date ? `Valid until ${new Date(o.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : "No expiry"}
                  </Text>
                </View>
                <View style={[tw`rounded-full px-3 py-1.5`, { backgroundColor: color.terracottaTint }]}>
                  <Text style={[tw`text-[12px] font-semibold`, { color: color.terracotta }]}>{formatDiscount(o).toUpperCase()}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </MobileShell>
  );
}
