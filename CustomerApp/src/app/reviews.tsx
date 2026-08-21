import { Star, MessageSquareText } from "lucide-react-native";
import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { color } from "../lib/theme";

function Stars({ value }: { value: number }) {
  return (
    <View style={tw`flex-row gap-0.5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          color={color.terracotta}
          fill={i <= value ? color.terracotta : "transparent"}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

export default function Reviews() {
  const { data, isLoading } = useQuery<any>("/api/customer/my-reviews/");
  const reviews = data?.results || (Array.isArray(data) ? data : []);

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Your reviews" />
      <View style={tw`gap-y-3 px-5 pb-8 pt-3`}>
        {isLoading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No reviews yet"
            subtitle="After a completed visit, you can rate and review it from your booking."
          />
        ) : (
          reviews.map((r: any) => (
            <Card key={r.id}>
              <View style={tw`flex-row items-start justify-between mb-2`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{r.store_name}</Text>
                  {r.professional_name && (
                    <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>with {r.professional_name}</Text>
                  )}
                </View>
                <Stars value={r.store_rating} />
              </View>
              {!!r.comment && <Text style={tw`text-[13px] text-zinc-600 leading-relaxed mb-2`}>{r.comment}</Text>}
              <Text style={tw`text-[11px] text-zinc-400`}>
                {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </Card>
          ))
        )}
      </View>
    </MobileShell>
  );
}
