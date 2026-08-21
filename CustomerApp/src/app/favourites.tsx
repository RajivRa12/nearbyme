import { Heart } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { alertMessage } from "../lib/alert";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card, Avatar, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { api } from "../lib/api";
import { color } from "../lib/theme";

export default function Favourites() {
  const { data, isLoading, refetch } = useQuery<any>("/api/customer/favorites/");
  const favourites = data?.results || (Array.isArray(data) ? data : []);

  const removeFavourite = async (id: number) => {
    try {
      await api(`/api/customer/favorites/${id}/`, { method: "DELETE" });
      refetch();
    } catch (e: any) {
      alertMessage("Couldn't remove favourite", e?.message || "Please try again.");
    }
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Favourite therapists" />
      <View style={tw`gap-y-3 px-5 pb-8 pt-3`}>
        {isLoading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : favourites.length === 0 ? (
          <EmptyState
            icon={<Heart size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No favourites yet"
            subtitle="Tap the heart on a therapist's profile to save them here."
          />
        ) : (
          favourites.map((f: any) => (
            <Card key={f.id}>
              <View style={tw`flex-row items-center gap-3.5`}>
                <Avatar name={f.therapist_name} size={48} />
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{f.therapist_name}</Text>
                  <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>
                    Saved {new Date(f.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeFavourite(f.id)} hitSlop={8}>
                  <Heart size={20} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </View>
    </MobileShell>
  );
}
