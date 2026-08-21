import { Search, MapPin, Star, MessageCircle, Sparkles } from "lucide-react-native";
import { Link, router } from "expo-router";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useMemo } from "react";
import tw from "twrnc";
import { MobileShell } from "@/components/MobileShell";
import { PhotoScrim, Avatar } from "@/components/primitives";
import { useQuery } from "@/hooks/useFetch";
import { color, shadow } from "@/lib/theme";
import { photoForId } from "@/lib/photos";
import { formatDiscount, startConversation, toArray, formatSlotDate, formatSlotTime } from "@/lib/api";
import { useLocation } from "@/lib/locationState";
import { CATEGORIES } from "@/lib/categories";
import { sortByDistance } from "@/lib/geo";

async function messageTherapist(therapistId: string | number, name: string) {
  const convoId = await startConversation(therapistId);
  if (convoId) router.push({ pathname: "/messages/[id]", params: { id: convoId, name } });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export default function Home() {
  const { data: storesObj, isLoading: loadingStores } = useQuery<any>('/api/customer/stores/');
  const { data: offersObj } = useQuery<any>('/api/customer/offers/');
  const { data: profileObj, isLoading: loadingProfile } = useQuery<any>('/api/customer/profile/');
  const { data: bookingsObj } = useQuery<any>('/api/customer/bookings/');
  const { data: trendingObj } = useQuery<any>('/api/customer/trending-services/');
  const { data: recTherapistsObj } = useQuery<any>('/api/customer/recommended-therapists/');

  const picked = useLocation();
  const stores: any[] = storesObj?.results || (Array.isArray(storesObj) ? storesObj : []);
  const offers = offersObj?.results || (Array.isArray(offersObj) ? offersObj : []);
  const bookings = toArray<any>(bookingsObj);
  const trendingServices = trendingObj?.results || (Array.isArray(trendingObj) ? trendingObj : []);
  const recommendedTherapists = recTherapistsObj?.results || (Array.isArray(recTherapistsObj) ? recTherapistsObj : []);
  const points = profileObj?.loyalty_points ?? 0;

  const now = Date.now();
  const upcomingBooking = bookings
    .filter((b: any) => (b.status === 'confirmed' || b.status === 'draft') && new Date(b.booking_start).getTime() > now)
    .sort((a: any, b: any) => new Date(a.booking_start).getTime() - new Date(b.booking_start).getTime())[0];
  const flashDeals = offers.slice(0, 5);

  const sortedStores = useMemo(() => {
    const byDistance = sortByDistance(stores, { lat: picked.lat, lng: picked.lng });
    // Premium listings are a paid ranking boost — bump them to the top,
    // keeping distance order within each group (Array#sort is stable), so
    // "Featured this week" genuinely reflects a premium listing when one
    // exists nearby rather than always just being the nearest store.
    return [...byDistance].sort((a: any, b: any) => Number(!!b.is_premium_listing) - Number(!!a.is_premium_listing));
  }, [stores, picked.lat, picked.lng]);
  const featured = sortedStores[0];
  const rest = sortedStores.slice(1);

  if (loadingStores || loadingProfile) {
    return (
      <View style={[tw`flex-1 justify-center items-center`, { backgroundColor: color.bg }]}>
        <ActivityIndicator size="large" color={color.sage} />
      </View>
    );
  }

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-7 pb-6 pt-1`}>
        {/* Greeting & Search */}
        <View style={tw`px-5 gap-4`}>
          <Text style={tw`text-[28px] font-bold tracking-tight text-zinc-900 leading-tight`}>
            {getGreeting()}, {profileObj?.first_name || 'Guest'}
          </Text>
          <Link href="/explore" asChild>
            <TouchableOpacity
              style={{
                ...tw`relative flex-row h-12 w-full items-center rounded-2xl bg-white pl-11 pr-4 border border-stone-100`,
                ...shadow.xs,
              }}
            >
              <Search size={16} color={color.ink3} style={tw`absolute left-4`} strokeWidth={2} />
              <Text style={tw`text-[14px] text-zinc-400`}>Find a service or salon</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Next Appointment Card */}
        {upcomingBooking && (
          <View style={tw`px-5`}>
            <Link href={{ pathname: "/booking/[id]", params: { id: upcomingBooking.id } }} asChild>
              <TouchableOpacity
                activeOpacity={0.9}
                style={{ ...tw`flex-col gap-4 rounded-[28px] p-5`, backgroundColor: color.sage, ...shadow.md }}
              >
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-white opacity-75`}>
                    Next appointment
                  </Text>
                  <View style={tw`rounded-full bg-white/15 px-2.5 py-1`}>
                    <Text style={tw`text-[10px] font-semibold text-white`}>
                      {formatSlotDate(upcomingBooking.booking_start)}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={tw`text-[19px] font-bold text-white leading-tight`}>{upcomingBooking.slots?.[0]?.store_service_name || 'Service'}</Text>
                  <Text style={tw`text-[13px] text-white/85 mt-1`}>
                    {upcomingBooking.outlet_name} · {formatSlotTime(upcomingBooking.booking_start)}
                  </Text>
                </View>
                <View style={tw`rounded-2xl bg-white py-3 items-center`}>
                  <Text style={[tw`text-[14px] font-semibold`, { color: color.sage }]}>View details</Text>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Featured salon — editorial hero */}
        {featured && (
          <View style={tw`px-5`}>
            <Link href={{ pathname: "/salon/[id]", params: { id: featured.id } }} asChild>
              <TouchableOpacity activeOpacity={0.92} style={{ ...tw`rounded-[28px] overflow-hidden`, ...shadow.md }}>
                <View style={[tw`w-full`, { aspectRatio: 4 / 3 }]}>
                  <Image
                    source={{ uri: photoForId(featured.id, 900) }}
                    style={tw`w-full h-full`}
                    contentFit="cover"
                    transition={200}
                  />
                  <PhotoScrim />
                  <View style={tw`absolute top-4 left-4`}>
                    <View style={tw`rounded-full bg-white/90 px-3 py-1.5`}>
                      <Text style={tw`text-[10px] font-bold uppercase tracking-widest text-zinc-800`}>Featured this week</Text>
                    </View>
                  </View>
                  <View style={tw`absolute inset-x-0 bottom-0 p-5 gap-1.5`}>
                    <View style={tw`flex-row items-center justify-between`}>
                      <Text style={tw`flex-1 text-[22px] font-bold text-white leading-tight pr-3`} numberOfLines={1}>
                        {featured.name}
                      </Text>
                      <View style={tw`flex-row items-center gap-1`}>
                        <Star size={13} color="#fff" fill="#fff" strokeWidth={0} />
                        <Text style={tw`text-[13px] font-semibold text-white`}>4.8</Text>
                      </View>
                    </View>
                    <View style={tw`flex-row items-center gap-1`}>
                      <MapPin size={11} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                      <Text style={tw`text-[12px] text-white/85`} numberOfLines={1}>{featured.address}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Flash Deals Horizontal Scroll */}
        {flashDeals.length > 0 && (
          <View style={tw`gap-3.5`}>
            <View style={tw`flex-row items-center justify-between px-5`}>
              <Text style={tw`text-[17px] font-semibold text-zinc-900`}>Flash deals</Text>
              <Text style={tw`text-[12px] text-zinc-400`}>{flashDeals.length} available</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={flashDeals}
              keyExtractor={(item: any) => item.id.toString()}
              contentContainerStyle={tw`px-5 gap-3`}
              renderItem={({ item }) => (
                <Link href="/offers" asChild>
                  <TouchableOpacity
                    style={{ ...tw`flex-row items-center gap-2 rounded-full bg-white px-4 py-2.5 border border-stone-100`, ...shadow.xs }}
                  >
                    <View style={[tw`h-1.5 w-1.5 rounded-full`, { backgroundColor: color.terracotta }]} />
                    <Text style={tw`text-[12px] font-semibold text-zinc-800`}>
                      {item.code} · {formatDiscount(item)}
                    </Text>
                  </TouchableOpacity>
                </Link>
              )}
            />
          </View>
        )}

        {/* Trending services */}
        {trendingServices.length > 0 && (
          <View style={tw`gap-3.5`}>
            <Text style={tw`text-[17px] font-semibold text-zinc-900 px-5`}>Trending services</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={trendingServices}
              keyExtractor={(item: any) => item.id.toString()}
              contentContainerStyle={tw`px-5 gap-3`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!item.store_id}
                  onPress={() => item.store_id && router.push({ pathname: "/salon/[id]", params: { id: item.store_id } })}
                  style={{ ...tw`w-44 rounded-3xl bg-white p-4 border border-stone-100`, ...shadow.xs }}
                >
                  {item.is_premium_listing && (
                    <View style={[tw`self-start rounded-full px-2 py-0.5 mb-2`, { backgroundColor: color.goldTint }]}>
                      <Text style={[tw`text-[9px] font-bold uppercase tracking-wide`, { color: color.gold }]}>Popular</Text>
                    </View>
                  )}
                  <Text style={tw`text-[14px] font-semibold text-zinc-900`} numberOfLines={2}>{item.name}</Text>
                  <Text style={tw`text-[12px] text-zinc-500 mt-1`} numberOfLines={1}>{item.store_name || item.category_name || "Service"}</Text>
                  <View style={tw`flex-row items-center justify-between mt-3`}>
                    <Text style={tw`text-[13px] font-bold text-zinc-900`}>₹{item.price}</Text>
                    <Text style={tw`text-[11px] text-zinc-400`}>{item.duration_minutes} min</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Recommended therapists */}
        {recommendedTherapists.length > 0 && (
          <View style={tw`gap-3.5`}>
            <Text style={tw`text-[17px] font-semibold text-zinc-900 px-5`}>Recommended therapists</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recommendedTherapists}
              keyExtractor={(item: any) => item.id.toString()}
              contentContainerStyle={tw`px-5 gap-4`}
              renderItem={({ item }) => {
                const fullName = `${item.first_name} ${item.last_name || ""}`.trim();
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => messageTherapist(item.id, fullName)}
                    style={tw`w-20 items-center gap-2`}
                  >
                    <View>
                      <Avatar name={fullName} size={60} />
                      <View style={[tw`absolute -bottom-1 -right-1 h-6 w-6 rounded-full items-center justify-center border-2`, { backgroundColor: color.sage, borderColor: color.bg }]}>
                        <MessageCircle size={11} color="#fff" strokeWidth={2.4} />
                      </View>
                    </View>
                    <Text style={tw`text-[12px] font-semibold text-zinc-800 text-center`} numberOfLines={1}>
                      {item.first_name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Category filter pills */}
        <View style={tw`gap-3.5`}>
          <Text style={tw`text-[17px] font-semibold text-zinc-900 px-5`}>Browse by category</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw`px-5 gap-2`}
            renderItem={({ item }) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push({ pathname: "/(tabs)/explore", params: { category: item.id } })}
                  style={tw`flex-row items-center gap-2 rounded-full bg-white border border-stone-100 pl-3 pr-4 h-10`}
                >
                  <Icon size={15} color={color.sage} strokeWidth={2} />
                  <Text style={tw`text-[13px] font-medium text-zinc-700`}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Editorial list of remaining places */}
        {rest.length > 0 && (
          <View style={tw`px-5 gap-4`}>
            <Text style={tw`text-[17px] font-semibold text-zinc-900`}>More near {picked.city}</Text>
            <View style={tw`gap-4`}>
              {rest.map((s: any) => (
                <Link key={s.id} href={{ pathname: "/salon/[id]", params: { id: s.id } }} asChild>
                  <TouchableOpacity activeOpacity={0.8} style={tw`flex-row gap-3.5`}>
                    <Image
                      source={{ uri: photoForId(s.id, 260) }}
                      style={{ ...tw`rounded-2xl`, width: 92, height: 92 }}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={tw`flex-1 justify-center gap-1`}>
                      <View style={tw`flex-row items-center justify-between gap-2`}>
                        <Text style={tw`flex-1 text-[15px] font-semibold text-zinc-900`} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <View style={tw`flex-row items-center gap-1`}>
                          <Star size={11} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
                          <Text style={tw`text-[12px] font-semibold text-zinc-800`}>4.8</Text>
                        </View>
                      </View>
                      <View style={tw`flex-row items-center gap-1`}>
                        <MapPin size={10} color={color.ink3} strokeWidth={2} />
                        <Text style={tw`text-[12px] text-zinc-500 flex-1`} numberOfLines={1}>{s.address}</Text>
                      </View>
                      {!!s.is_premium_listing && (
                        <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                          <Sparkles size={10} color={color.terracotta} strokeWidth={2} />
                          <Text style={[tw`text-[11px] font-semibold`, { color: color.terracotta }]}>Featured</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          </View>
        )}

        {/* Rewards Banner */}
        <View style={tw`px-5`}>
          <Link href="/rewards" asChild>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ ...tw`rounded-3xl bg-white p-5 border border-stone-100`, ...shadow.xs }}
            >
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`gap-1`}>
                  <Text style={[tw`text-[11px] font-semibold uppercase tracking-wider`, { color: color.sage }]}>
                    Nearbyme rewards
                  </Text>
                  <Text style={tw`text-[19px] font-bold text-zinc-900`}>{points.toLocaleString("en-IN")} points</Text>
                  <Text style={tw`text-[12px] text-zinc-500`}>
                    {Math.max(0, Math.ceil((points + 1) / 500) * 500 - points)} points to next reward
                  </Text>
                </View>
                <View style={[tw`rounded-full px-3.5 py-2`, { backgroundColor: color.sageTint }]}>
                  <Text style={[tw`text-[12px] font-semibold`, { color: color.sage }]}>View rewards</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </MobileShell>
  );
}
