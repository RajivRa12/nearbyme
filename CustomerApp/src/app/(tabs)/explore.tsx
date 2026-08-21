import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, SearchX, Sparkles } from "lucide-react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { Rating, EmptyState } from "../../components/primitives";
import { StoreMap } from "../../components/StoreMap";
import { useQuery } from "../../hooks/useFetch";
import { color, shadow } from "../../lib/theme";
import { photoForId } from "../../lib/photos";
import { useLocation } from "../../lib/locationState";
import { CATEGORIES, type CategoryId } from "../../lib/categories";
import { sortByDistance } from "../../lib/geo";

export default function Explore() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "ALL">((category as CategoryId) || "ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const picked = useLocation();

  // Light debounce so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "ALL") params.set("business__business_type", selectedCategory);
    if (search) params.set("search", search);
    const qs = params.toString();
    return `/api/customer/stores/${qs ? `?${qs}` : ""}`;
  }, [selectedCategory, search]);

  const { data: storesObj, isLoading } = useQuery<any>(queryUrl);
  const salons: any[] = storesObj?.results || (Array.isArray(storesObj) ? storesObj : []);
  const sortedSalons = useMemo(() => {
    const byDistance = sortByDistance(salons, { lat: picked.lat, lng: picked.lng });
    // Premium listings are a paid ranking boost — bump them to the top,
    // keeping distance order within each group (Array#sort is stable).
    return [...byDistance].sort((a: any, b: any) => Number(!!b.is_premium_listing) - Number(!!a.is_premium_listing));
  }, [salons, picked.lat, picked.lng]);

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-5 px-5 pb-6 pt-1`}>
        <Text style={tw`text-[28px] font-bold tracking-tight text-zinc-900`}>Explore</Text>

        {/* Search Bar */}
        <View style={tw`relative flex-row items-center`}>
          <Search size={16} color={color.ink3} style={tw`absolute left-4 z-10`} strokeWidth={2} />
          <TextInput
            placeholder="Salons, address..."
            placeholderTextColor={color.ink3}
            value={searchInput}
            onChangeText={setSearchInput}
            style={{
              ...tw`h-12 w-full rounded-2xl bg-white pl-11 pr-4 text-[14px] text-zinc-900 border border-stone-100`,
              ...shadow.xs,
            }}
          />
        </View>

        {/* Filter Scroll */}
        <View style={tw`-mx-5 px-5`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
            <TouchableOpacity
              onPress={() => setSelectedCategory("ALL")}
              style={{
                ...tw`rounded-full px-4 py-2`,
                backgroundColor: selectedCategory === "ALL" ? color.sage : color.bgCard,
                borderWidth: selectedCategory === "ALL" ? 0 : 1,
                borderColor: color.line,
              }}
            >
              <Text style={tw`text-[12px] font-semibold ${selectedCategory === "ALL" ? "text-white" : "text-zinc-700"}`}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((c) => {
              const active = selectedCategory === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCategory(c.id)}
                  style={{
                    ...tw`rounded-full px-4 py-2`,
                    backgroundColor: active ? color.sage : color.bgCard,
                    borderWidth: active ? 0 : 1,
                    borderColor: color.line,
                  }}
                >
                  <Text style={tw`text-[12px] font-semibold ${active ? "text-white" : "text-zinc-700"}`}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Real map with store pins */}
        <View style={{ ...tw`overflow-hidden rounded-3xl`, ...shadow.xs }}>
          <StoreMap
            stores={sortedSalons}
            height={200}
            center={{ lat: picked.lat, lng: picked.lng }}
            onSelectStore={(id) => router.push({ pathname: "/salon/[id]", params: { id } })}
          />
        </View>

        {/* Salon Cards */}
        <View style={tw`gap-3.5`}>
          <Text style={tw`text-[13px] font-medium text-zinc-500`}>
            {isLoading ? "Searching..." : `${sortedSalons.length} near ${picked.city}`}
          </Text>
          {isLoading && <ActivityIndicator size="large" color={color.sage} style={tw`mt-4`} />}

          {!isLoading && sortedSalons.map((s: any) => (
            <Link key={s.id} href={{ pathname: "/salon/[id]", params: { id: s.id } }} asChild>
              <TouchableOpacity activeOpacity={0.8} style={tw`flex-row gap-3.5`}>
                <Image
                  source={{ uri: photoForId(s.id, 260) }}
                  style={{ ...tw`rounded-2xl`, width: 88, height: 88 }}
                  contentFit="cover"
                  transition={200}
                />
                <View style={tw`flex-1 justify-center gap-1`}>
                  <View style={tw`flex-row items-start justify-between gap-2`}>
                    <Text style={tw`flex-1 text-[15px] font-semibold text-zinc-900`} numberOfLines={1}>{s.name}</Text>
                    <Rating value={4.8} />
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
          {!isLoading && sortedSalons.length === 0 && (
            <EmptyState
              icon={<SearchX size={26} color={color.ink3} strokeWidth={1.5} />}
              title="No salons found"
              subtitle="Try a different search or category."
            />
          )}
        </View>
      </View>
    </MobileShell>
  );
}
