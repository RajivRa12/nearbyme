import { useLocalSearchParams, router, Link } from "expo-router";
import { Heart, MapPin, ChevronLeft, Clock, MessageCircle, Star } from "lucide-react-native";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { StickyBottomBar, PrimaryButton, IconButton, Avatar, EmptyState } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";
import { color, shadow } from "../../lib/theme";
import { photoForId } from "../../lib/photos";
import { api, getOpenStatus, startConversation, toArray } from "../../lib/api";
import { goBack } from "../../lib/nav";

export default function SalonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: storeObj, isLoading: loadingStore } = useQuery<any>(`/api/customer/stores/${id}/`);
  const { data: menuObj, isLoading: loadingMenu } = useQuery<any>(`/api/customer/stores/${id}/menu/`);
  const { data: staffObj, isLoading: loadingStaff } = useQuery<any>(`/api/customer/stores/${id}/staff/`);
  const { data: reviewsObj, isLoading: loadingReviews } = useQuery<any>(`/api/customer/stores/${id}/reviews/`);
  const { data: favData, refetch: refetchFavs } = useQuery<any>("/api/customer/favorites/");
  const { data: storeFavData, refetch: refetchStoreFavs } = useQuery<any>("/api/customer/store-favourites/");

  if (loadingStore || loadingMenu) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  const salon = storeObj || null;

  if (!salon) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <Text style={tw`text-sm text-zinc-500`}>Salon not found.</Text>
          <TouchableOpacity onPress={() => goBack("/(tabs)/explore")} style={[tw`mt-4 px-4 py-2.5 rounded-xl`, { backgroundColor: color.sage }]}>
            <Text style={tw`text-white font-semibold`}>Go back</Text>
          </TouchableOpacity>
        </View>
      </MobileShell>
    );
  }

  const categories = menuObj?.data || [];
  const allServices = categories.flatMap((c: any) => c.services);
  const staff = toArray(staffObj);
  const reviews = toArray(reviewsObj);
  const avgRating = reviews.length ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length : null;
  const openStatus = getOpenStatus(salon.working_hours);
  const favorites = toArray<any>(favData);
  const favMap = new Map<string, number>(favorites.map((f: any) => [String(f.therapist_id), f.id]));
  const storeFavorites = toArray<any>(storeFavData);
  const storeFavId = storeFavorites.find((f: any) => String(f.store) === String(salon.id))?.id;

  const messageStaff = async (therapistId: string | number, name: string) => {
    const convoId = await startConversation(therapistId);
    if (convoId) router.push({ pathname: "/messages/[id]", params: { id: convoId, name } });
  };

  const toggleFavorite = async (therapistId: string | number) => {
    const favoriteId = favMap.get(String(therapistId));
    try {
      if (favoriteId) {
        await api(`/api/customer/favorites/${favoriteId}/`, { method: "DELETE" });
      } else {
        await api(`/api/customer/favorites/`, { method: "POST", body: { therapist: therapistId } });
      }
      refetchFavs();
    } catch {
      // silently ignore — non-critical action
    }
  };

  const toggleStoreFavorite = async () => {
    try {
      if (storeFavId) {
        await api(`/api/customer/store-favourites/${storeFavId}/`, { method: "DELETE" });
      } else {
        await api(`/api/customer/store-favourites/`, { method: "POST", body: { store: salon.id } });
      }
      refetchStoreFavs();
    } catch {
      // silently ignore — non-critical action
    }
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      {/* Cover Image and Back/Like Overlay */}
      <View style={[tw`relative w-full`, { aspectRatio: 4 / 3 }]}>
        <Image
          source={{ uri: photoForId(salon.id, 900) }}
          style={tw`h-full w-full`}
          contentFit="cover"
          transition={200}
        />
        {/* Navigation Buttons Overlay */}
        <View style={tw`absolute inset-x-0 top-12 flex-row items-center justify-between px-4`}>
          <IconButton tone="translucent" onPress={() => goBack("/(tabs)/explore")}>
            <ChevronLeft size={20} color={color.ink} strokeWidth={1.8} />
          </IconButton>
          <IconButton tone="translucent" onPress={toggleStoreFavorite}>
            <Heart
              size={18}
              color={storeFavId ? color.terracotta : color.ink}
              fill={storeFavId ? color.terracotta : "transparent"}
              strokeWidth={1.8}
            />
          </IconButton>
        </View>
      </View>

      {/* Salon Details Content */}
      <View style={tw`gap-y-7 px-5 pt-5 pb-32`}>
        <View style={tw`gap-1`}>
          <View style={tw`flex-row items-start justify-between gap-3`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[24px] font-bold text-zinc-900 tracking-tight`}>{salon.name}</Text>
              <View style={tw`flex-row items-center gap-1 mt-1.5`}>
                <MapPin size={12} color={color.ink3} strokeWidth={1.8} />
                <Text style={tw`text-[13px] text-zinc-500`}>{salon.address}</Text>
              </View>
            </View>
            {avgRating !== null ? (
              <View style={tw`flex-row items-center gap-1`}>
                <Star size={12} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
                <Text style={tw`text-[12px] font-semibold text-zinc-800`}>{avgRating.toFixed(1)}</Text>
                <Text style={tw`text-[12px] text-zinc-400`}>({reviews.length})</Text>
              </View>
            ) : (
              !loadingReviews && <Text style={tw`text-[12px] font-medium text-zinc-400`}>New</Text>
            )}
          </View>

          {/* Open status */}
          {openStatus.hasData && (
            <View style={tw`flex-row items-center gap-1.5 mt-3`}>
              <Clock size={12} color={openStatus.isOpen ? color.sage : color.terracotta} strokeWidth={2} />
              <Text style={[tw`text-[12px] font-semibold`, { color: openStatus.isOpen ? color.sage : color.terracotta }]}>
                {openStatus.label}
              </Text>
            </View>
          )}
        </View>

        {/* Services List */}
        <View>
          <Text style={tw`mb-3 text-[17px] font-semibold text-zinc-900`}>Services</Text>
          <View style={[tw`overflow-hidden rounded-3xl bg-white border border-stone-100`, shadow.xs]}>
            {allServices.length === 0 ? (
              <Text style={tw`p-5 text-[13px] text-zinc-500`}>No services listed yet — check back soon.</Text>
            ) : (
              allServices.map((s: any, index: number) => (
                <View
                  key={s.id}
                  style={tw`flex-row items-center justify-between px-5 py-4 ${index > 0 ? "border-t border-stone-100" : ""}`}
                >
                  <View>
                    <Text style={tw`text-[14px] font-semibold text-zinc-800`}>{s.name}</Text>
                    <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>
                      {s.duration_minutes} min
                    </Text>
                  </View>
                  <Text style={tw`text-[14px] font-semibold text-zinc-800`}>₹{s.price}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Therapists Horizontal Scroll */}
        <View>
          <Text style={tw`mb-3 text-[17px] font-semibold text-zinc-900`}>Therapists</Text>
          {loadingStaff ? (
            <ActivityIndicator size="small" color={color.sage} />
          ) : staff.length === 0 ? (
            <Text style={tw`text-[13px] text-zinc-500`}>No therapists listed yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-5`}>
              {staff.map((t: any) => {
                const isFavorite = favMap.has(String(t.id));
                return (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.7}
                    onPress={() => messageStaff(t.id, t.name)}
                    style={tw`w-24 items-center`}
                  >
                    <View>
                      <Avatar name={t.name} size={60} />
                      <View style={[tw`absolute -bottom-1 -right-1 h-6 w-6 rounded-full items-center justify-center border-2`, { backgroundColor: color.sage, borderColor: "#fff" }]}>
                        <MessageCircle size={11} color="#fff" strokeWidth={2.4} />
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(t.id)}
                        hitSlop={8}
                        style={[tw`absolute -top-1 -right-1 h-6 w-6 rounded-full items-center justify-center border-2`, { backgroundColor: "#fff", borderColor: "#fff" }]}
                      >
                        <Heart size={12} color={color.terracotta} fill={isFavorite ? color.terracotta : "transparent"} strokeWidth={1.8} />
                      </TouchableOpacity>
                    </View>
                    <Text style={tw`mt-2 text-[12px] font-semibold text-zinc-800 text-center`} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={tw`text-[11px] text-zinc-500 text-center`} numberOfLines={1}>
                      {t.specializations || "Therapist"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Reviews */}
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

      {/* Book Sticky Button */}
      <StickyBottomBar>
        <Link href={{ pathname: "/book/[salonId]/service", params: { salonId: salon.id } }} asChild>
          <PrimaryButton>Book a service</PrimaryButton>
        </Link>
      </StickyBottomBar>
    </MobileShell>
  );
}
