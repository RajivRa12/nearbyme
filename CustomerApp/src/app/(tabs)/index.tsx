import { Search, Scissors, Droplet, Activity, Heart, Sparkles, PenTool, Brush, Home as HomeIcon, BookOpen } from "lucide-react-native";
import { Link } from "expo-router";
import { View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "@/components/MobileShell";
import { SectionHeader } from "@/components/primitives";
import { useQuery } from "@/hooks/useFetch";

export default function Home() {
  const { data: storesObj, isLoading: loadingStores } = useQuery<any>('/api/customer/stores/');
  const { data: trendingObj, isLoading: loadingTrending } = useQuery<any>('/api/customer/trending-services/');
  const { data: offersObj, isLoading: loadingOffers } = useQuery<any>('/api/customer/offers/');
  const { data: profileObj, isLoading: loadingProfile } = useQuery<any>('/api/customer/profile/');
  const { data: aptsObj, isLoading: loadingApts } = useQuery<any>('/api/customer/appointments/');

  const stores = storesObj?.results || (Array.isArray(storesObj) ? storesObj : []);
  const trending = trendingObj?.results || (Array.isArray(trendingObj) ? trendingObj : []);
  const offers = offersObj?.results || (Array.isArray(offersObj) ? offersObj : []);
  const apts = aptsObj?.results || (Array.isArray(aptsObj) ? aptsObj : []);

  const upcomingApt = apts.find((a: any) => a.status === 'UPCOMING' || a.status === 'PENDING');
  
  const flashDeals = offers.slice(0, 5); // Just take the first few

  const categories = [
    { id: 'salon', name: 'Salon', icon: Scissors },
    { id: 'spa', name: 'Spa', icon: Droplet },
    { id: 'clinic', name: 'Clinic', icon: Activity },
    { id: 'massage', name: 'Massage', icon: Heart },
    { id: 'barber', name: 'Barber', icon: Scissors },
    { id: 'nails', name: 'Nail studio', icon: Sparkles },
    { id: 'tattoo', name: 'Tattoo', icon: PenTool },
    { id: 'makeup', name: 'Makeup artist', icon: Brush },
    { id: 'home', name: 'Home services', icon: HomeIcon },
    { id: 'wellness', name: 'Wellness centre', icon: Heart },
    { id: 'academy', name: 'Beauty academy', icon: BookOpen },
  ];

  if (loadingStores || loadingTrending || loadingProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#5c6f59" />
      </View>
    );
  }

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-6 pb-6 pt-2`}>
        {/* User Greeting & Search */}
        <View style={tw`px-5 gap-3`}>
          <Text style={tw`text-2xl font-bold tracking-tight text-zinc-900`}>
            Morning, {profileObj?.first_name || 'Guest'}.
          </Text>
          <Link href="/explore" asChild>
            <TouchableOpacity
              style={tw`relative flex-row h-12 w-full items-center rounded-2xl bg-stone-100 pl-11 pr-4 text-sm border border-stone-200/40`}
            >
              <Search size={16} color="#71717a" style={tw`absolute left-4`} strokeWidth={1.5} />
              <Text style={tw`text-sm text-zinc-500`}>Find a service or salon</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Next Appointment Card */}
        {upcomingApt && (
          <View style={tw`px-5 mt-4`}>
            <Link href={{ pathname: "/booking/[id]", params: { id: upcomingApt.id } }} asChild>
              <TouchableOpacity
                style={tw`flex-col gap-4 rounded-3xl bg-[#5c6f59] p-5 shadow-sm`}
              >
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-white opacity-80`}>
                    Next appointment
                  </Text>
                  <View style={tw`rounded-full bg-white/15 px-2.5 py-0.5`}>
                    <Text style={tw`text-[10px] font-semibold text-white`}>{upcomingApt.date}</Text>
                  </View>
                </View>
                <View>
                  <Text style={tw`text-lg font-bold text-white`}>{upcomingApt.items?.[0]?.service?.name || 'Service'}</Text>
                  <Text style={tw`text-sm text-white/90`}>{upcomingApt.store?.name} · {upcomingApt.start_time}</Text>
                </View>
                <View style={tw`rounded-xl bg-white py-2.5 items-center`}>
                  <Text style={tw`text-sm font-semibold text-[#5c6f59]`}>View details</Text>
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Flash Deals Horizontal Scroll */}
        {flashDeals.length > 0 && (
          <View style={tw`mt-4 gap-3`}>
            <View style={tw`flex-row items-center justify-between px-5`}>
              <Text style={tw`text-base font-semibold text-zinc-900`}>Flash deals</Text>
              <Text style={tw`text-xs font-semibold text-[#c06048]`}>04:12:55 remaining</Text>
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
                    style={tw`flex-row items-center gap-2 rounded-full bg-stone-100 px-4 py-2 border border-stone-200/40`}
                  >
                    <Text style={tw`text-[#c06048] font-bold`}>•</Text>
                    <Text style={tw`text-xs font-semibold text-zinc-800`}>
                      {item.code} {item.discount_percent}% OFF
                    </Text>
                  </TouchableOpacity>
                </Link>
              )}
            />
          </View>
        )}

        {/* Categories Scroll */}
        <View style={tw`mt-4 gap-4`}>
          <SectionHeader title="Explore by category" action="See all" actionHref="/explore" />
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw`px-5 gap-3`}
            renderItem={({ item }) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  style={tw`items-center justify-center gap-2 rounded-3xl bg-stone-100 border border-stone-200/40 w-[90px] h-[100px]`}
                >
                  <View style={tw`bg-white p-2.5 rounded-full shadow-sm`}>
                    <Icon size={22} color="#5c6f59" strokeWidth={1.5} />
                  </View>
                  <Text style={tw`text-[11px] font-medium text-zinc-800 text-center leading-tight px-1`}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Stores Grid (Replaced Trending Services) */}
        <View style={tw`px-5 mt-4 gap-4`}>
          <Text style={tw`text-base font-semibold text-zinc-900`}>Popular Places Near You</Text>
          <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
            {stores.map((s: any) => (
              <Link
                key={s.id}
                href={{ pathname: "/salon/[id]", params: { id: s.id } }}
                asChild
              >
                <TouchableOpacity style={tw`w-[47%] gap-2`}>
                  <View style={tw`w-full h-32 rounded-2xl bg-zinc-200 items-center justify-center`}>
                    <Text style={tw`text-2xl font-bold text-zinc-400`}>{s.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={tw`text-sm font-semibold text-zinc-900 leading-tight`}>
                      {s.name}
                    </Text>
                    <Text style={tw`text-xs text-zinc-500`}>
                      {s.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        {/* Rewards Banner */}
        <View style={tw`px-5 mt-4 pb-4`}>
          <Link href="/rewards" asChild>
            <TouchableOpacity
              style={tw`rounded-3xl bg-[#faf9f6] p-5 border border-stone-200/60 shadow-sm`}
            >
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`gap-1`}>
                  <Text style={tw`text-xs font-semibold uppercase tracking-wider text-[#5c6f59]`}>
                    Nearbyme Rewards
                  </Text>
                  <Text style={tw`text-lg font-bold text-zinc-800`}>1,420 points</Text>
                  <Text style={tw`text-xs text-zinc-500`}>580 points to next reward</Text>
                </View>
                <View style={tw`rounded-full bg-[#5c6f59]/10 px-3 py-1.5`}>
                  <Text style={tw`text-xs font-semibold text-[#5c6f59]`}>View rewards</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </MobileShell>
  );
}
