import { useLocalSearchParams, router, Link } from "expo-router";
import { Heart, MapPin, ChevronLeft } from "lucide-react-native";
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { Chip, Rating, StickyBottomBar, PrimaryButton } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";

export default function SalonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: storeObj, isLoading: loadingStore } = useQuery<any>(`/api/customer/stores/${id}/`);
  const { data: menuObj, isLoading: loadingMenu } = useQuery<any>(`/api/customer/stores/${id}/menu/`);

  if (loadingStore || loadingMenu) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  const salon = storeObj || null;
  const categories = menuObj?.data || [];

  if (!salon) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <Text style={tw`text-sm text-zinc-500`}>Salon not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={tw`mt-4 px-4 py-2 bg-[#5c6f59] rounded-xl`}>
            <Text style={tw`text-white font-semibold`}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </MobileShell>
    );
  }

  // Flatten services for simple view if needed, or iterate categories
  const allServices = categories.flatMap((c: any) => c.services);
  
  // Dummy therapists and reviews since the API doesn't provide them per-store yet
  const staff = [
    { id: '1', name: 'Elena', role: 'Stylist' },
    { id: '2', name: 'Marcus', role: 'Barber' },
  ];

  return (
    <MobileShell showHeader={false} scroll={true}>
      {/* Cover Image and Back/Like Overlay */}
      <View style={[tw`relative w-full`, { aspectRatio: 4 / 3 }]}>
        <View style={tw`h-full w-full bg-zinc-200 items-center justify-center`}>
          <Text style={tw`text-6xl font-bold text-zinc-400`}>{salon.name.charAt(0)}</Text>
        </View>
        {/* Navigation Buttons Overlay */}
        <View style={tw`absolute inset-x-0 top-12 flex-row items-center justify-between px-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`flex h-10 w-10 items-center justify-center rounded-full bg-white/80`}
          >
            <ChevronLeft size={20} color="#27272a" strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`flex h-10 w-10 items-center justify-center rounded-full bg-white/80`}
          >
            <Heart size={18} color="#27272a" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Salon Details Content */}
      <View style={tw`gap-y-6 px-5 pt-5 pb-32`}>
        <View style={tw`gap-1`}>
          <View style={tw`flex-row items-start justify-between gap-3`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-2xl font-bold text-zinc-900`}>{salon.name}</Text>
              <View style={tw`flex-row items-center gap-1 mt-1`}>
                <MapPin size={12} color="#71717a" strokeWidth={1.5} />
                <Text style={tw`text-sm text-zinc-500`}>
                  {salon.address}
                </Text>
              </View>
            </View>
            <Rating value={4.8} />
          </View>
          <Text style={tw`mt-4 text-sm leading-relaxed text-zinc-600`}>A beautifully designed salon in your local neighborhood.</Text>
        </View>

        {/* Services List */}
        <View style={tw`mt-4`}>
          <Text style={tw`mb-3 text-base font-semibold text-zinc-900`}>Services</Text>
          <View style={tw`overflow-hidden rounded-2xl bg-stone-100/60 border border-stone-200/30`}>
            {allServices.length === 0 ? (
              <Text style={tw`p-4 text-zinc-500`}>No services found.</Text>
            ) : (
              allServices.map((s: any, index: number) => (
                <View
                  key={s.id}
                  style={tw`flex-row items-center justify-between p-4 ${index > 0 ? "border-t border-stone-200/40" : ""}`}
                >
                  <View>
                    <Text style={tw`text-sm font-semibold text-zinc-800`}>{s.name}</Text>
                    <Text style={tw`text-xs text-zinc-500 mt-0.5`}>
                      {s.duration_minutes} min
                    </Text>
                  </View>
                  <Text style={tw`text-sm font-semibold text-zinc-800`}>₹{s.price}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Therapists Horizontal Scroll */}
        <View style={tw`mt-4`}>
          <Text style={tw`mb-3 text-base font-semibold text-zinc-900`}>Therapists</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-4`}>
            {staff.map((t) => (
              <View key={t.id} style={tw`w-24 items-center`}>
                <View style={tw`size-16 rounded-full bg-zinc-200 items-center justify-center`}>
                  <Text style={tw`text-xl font-bold text-zinc-400`}>{t.name.charAt(0)}</Text>
                </View>
                <Text style={tw`mt-2 text-xs font-semibold text-zinc-800 text-center`} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={tw`text-[10px] text-zinc-500 text-center`} numberOfLines={1}>
                  {t.role}
                </Text>
              </View>
            ))}
          </ScrollView>
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
