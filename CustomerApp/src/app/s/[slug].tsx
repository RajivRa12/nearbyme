import { useLocalSearchParams, Link } from "expo-router";
import { MapPin, Clock, Star, ShieldCheck } from "lucide-react-native";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { StickyBottomBar, PrimaryButton, EmptyState } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";
import { color, shadow } from "../../lib/theme";
import { photoForId } from "../../lib/photos";
import { getOpenStatus, toArray } from "../../lib/api";

// A store's own public booking page — reached via a direct link the store
// shares (Instagram, WhatsApp, Google Business), never from inside the app's
// own discovery flow. Deliberately has no tab bar, no search, no "explore
// more stores" — nothing that could pull a visitor toward a competitor.
// See customer-app-build-guide.pdf section 2.
export default function Microsite() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: profile, isLoading: loadingProfile } = useQuery<any>(`/api/customer/microsite/${slug}/`);
  const storeId = profile?.store_id;
  const { data: menuObj, isLoading: loadingMenu } = useQuery<any>(`/api/customer/stores/${storeId}/menu/`, !!storeId);
  const { data: reviewsObj, isLoading: loadingReviews } = useQuery<any>(`/api/customer/stores/${storeId}/reviews/`, !!storeId);

  if (loadingProfile) {
    return (
      <SafeAreaView style={[tw`flex-1 items-center justify-center`, { backgroundColor: color.bg }]}>
        <ActivityIndicator size="large" color={color.sage} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[tw`flex-1 items-center justify-center p-8`, { backgroundColor: color.bg }]}>
        <Text style={tw`text-sm text-zinc-500`}>This page isn't available.</Text>
      </SafeAreaView>
    );
  }

  const categories = menuObj?.data || [];
  const allServices = categories.flatMap((c: any) => c.services);
  const reviews = toArray(reviewsObj);
  const avgRating = reviews.length ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length : null;
  const openStatus = getOpenStatus(profile.working_hours);
  const coverUri = profile.cover_image_url || photoForId(profile.store_id, 900);

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: color.bg }]} edges={["bottom"]}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-32`} showsVerticalScrollIndicator={false}>
        <View style={[tw`relative w-full`, { aspectRatio: 4 / 3 }]}>
          <Image source={{ uri: coverUri }} style={tw`h-full w-full`} contentFit="cover" transition={200} />
        </View>

        <View style={tw`gap-y-7 px-5 pt-5`}>
          <View style={tw`gap-1`}>
            <Text style={tw`text-[24px] font-bold text-zinc-900 tracking-tight`}>{profile.store_name}</Text>
            {!!profile.headline && (
              <Text style={[tw`text-[14px] font-medium mt-0.5`, { color: color.sage }]}>{profile.headline}</Text>
            )}
            <View style={tw`flex-row items-center gap-1 mt-2`}>
              <MapPin size={12} color={color.ink3} strokeWidth={1.8} />
              <Text style={tw`text-[13px] text-zinc-500`}>{profile.address}</Text>
            </View>
            {avgRating !== null && (
              <View style={tw`flex-row items-center gap-1 mt-1`}>
                <Star size={12} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
                <Text style={tw`text-[12px] font-semibold text-zinc-800`}>{avgRating.toFixed(1)}</Text>
                <Text style={tw`text-[12px] text-zinc-400`}>({reviews.length} reviews)</Text>
              </View>
            )}
            {openStatus.hasData && (
              <View style={tw`flex-row items-center gap-1.5 mt-2`}>
                <Clock size={12} color={openStatus.isOpen ? color.sage : color.terracotta} strokeWidth={2} />
                <Text style={[tw`text-[12px] font-semibold`, { color: openStatus.isOpen ? color.sage : color.terracotta }]}>
                  {openStatus.label}
                </Text>
              </View>
            )}
          </View>

          {!!profile.about && (
            <View>
              <Text style={tw`mb-2 text-[17px] font-semibold text-zinc-900`}>About</Text>
              <Text style={tw`text-[13px] text-zinc-600 leading-relaxed`}>{profile.about}</Text>
            </View>
          )}

          {profile.amenities?.length > 0 && (
            <View style={tw`flex-row flex-wrap gap-2`}>
              {profile.amenities.map((a: string) => (
                <View key={a} style={[tw`rounded-full px-3 py-1.5 border border-stone-100 bg-white`, shadow.xs]}>
                  <Text style={tw`text-[12px] font-medium text-zinc-700`}>{a}</Text>
                </View>
              ))}
            </View>
          )}

          <View>
            <Text style={tw`mb-3 text-[17px] font-semibold text-zinc-900`}>Services</Text>
            <View style={[tw`overflow-hidden rounded-3xl bg-white border border-stone-100`, shadow.xs]}>
              {loadingMenu ? (
                <ActivityIndicator size="small" color={color.sage} style={tw`p-5`} />
              ) : allServices.length === 0 ? (
                <Text style={tw`p-5 text-[13px] text-zinc-500`}>No services listed yet — check back soon.</Text>
              ) : (
                allServices.map((s: any, index: number) => (
                  <View
                    key={s.id}
                    style={tw`flex-row items-center justify-between px-5 py-4 ${index > 0 ? "border-t border-stone-100" : ""}`}
                  >
                    <View>
                      <Text style={tw`text-[14px] font-semibold text-zinc-800`}>{s.name}</Text>
                      <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>{s.duration_minutes} min</Text>
                    </View>
                    <Text style={tw`text-[14px] font-semibold text-zinc-800`}>₹{s.price}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {!!profile.cancellation_policy_text && (
            <View style={[tw`flex-row gap-2.5 rounded-2xl bg-white border border-stone-100 p-4`, shadow.xs]}>
              <ShieldCheck size={16} color={color.sage} strokeWidth={2} />
              <Text style={tw`flex-1 text-[12px] text-zinc-600 leading-relaxed`}>{profile.cancellation_policy_text}</Text>
            </View>
          )}

          <View>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-[17px] font-semibold text-zinc-900`}>Reviews</Text>
              {avgRating !== null && (
                <View style={tw`flex-row items-center gap-1`}>
                  <Star size={12} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
                  <Text style={tw`text-[13px] font-bold text-zinc-900`}>{avgRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            {loadingReviews ? (
              <ActivityIndicator size="small" color={color.sage} />
            ) : reviews.length === 0 ? (
              <EmptyState title="No reviews yet" subtitle="Be the first to review after your visit." />
            ) : (
              <View style={tw`gap-3`}>
                {reviews.slice(0, 4).map((r: any) => (
                  <View key={r.id} style={[tw`rounded-2xl bg-white border border-stone-100 p-4`, shadow.xs]}>
                    <View style={tw`flex-row items-center justify-between mb-1.5`}>
                      <Text style={tw`text-[13px] font-semibold text-zinc-900`}>{r.customer_name || "Anonymous"}</Text>
                      <View style={tw`flex-row gap-0.5`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={11} color={color.terracotta} fill={i <= r.rating ? color.terracotta : "transparent"} strokeWidth={1.5} />
                        ))}
                      </View>
                    </View>
                    {!!r.comment && <Text style={tw`text-[13px] text-zinc-600 leading-relaxed`}>{r.comment}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        <Link href={{ pathname: "/book/[salonId]/service", params: { salonId: storeId } }} asChild>
          <PrimaryButton>Book a service</PrimaryButton>
        </Link>
      </StickyBottomBar>
    </SafeAreaView>
  );
}
