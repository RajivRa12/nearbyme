import { Heart, MapPin } from "lucide-react-native";
import { router } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { alertMessage } from "../lib/alert";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { api } from "../lib/api";
import { color } from "../lib/theme";

export default function SavedSalons() {
  const { data, isLoading, refetch } = useQuery<any>("/api/customer/store-favourites/");
  const saved = data?.results || (Array.isArray(data) ? data : []);

  const removeSaved = async (id: number) => {
    try {
      await api(`/api/customer/store-favourites/${id}/`, { method: "DELETE" });
      refetch();
    } catch (e: any) {
      alertMessage("Couldn't remove", e?.message || "Please try again.");
    }
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Saved salons" />
      <View style={tw`gap-y-3 px-5 pb-8 pt-3`}>
        {isLoading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : saved.length === 0 ? (
          <EmptyState
            icon={<Heart size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No saved salons yet"
            subtitle="Tap the heart on a salon's page to save it here."
          />
        ) : (
          saved.map((f: any) => (
            <TouchableOpacity key={f.id} activeOpacity={0.85} onPress={() => router.push({ pathname: "/salon/[id]", params: { id: f.store } })}>
              <Card>
                <View style={tw`flex-row items-center gap-3.5`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{f.store_name}</Text>
                    {!!f.store_address && (
                      <View style={tw`flex-row items-center gap-1 mt-1`}>
                        <MapPin size={11} color={color.ink3} strokeWidth={1.8} />
                        <Text style={tw`text-[12px] text-zinc-500`}>{f.store_address}</Text>
                      </View>
                    )}
                    {!!f.professional_account_name && (
                      <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>Preferred: {f.professional_account_name}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeSaved(f.id)} hitSlop={8}>
                    <Heart size={20} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    </MobileShell>
  );
}
