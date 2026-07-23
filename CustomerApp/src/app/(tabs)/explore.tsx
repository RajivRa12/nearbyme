import { useState } from "react";
import { Search, MapPin } from "lucide-react-native";
import { Link } from "expo-router";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { Rating } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";

const filters = ["All", "Massage", "Facial", "Hair", "Nails", "Wellness"];

export default function Explore() {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: storesObj, isLoading } = useQuery<any>('/api/customer/stores/');
  const salons = storesObj?.results || (Array.isArray(storesObj) ? storesObj : []);

  const filteredSalons = (salons || []).filter((s: any) => {
    const matchesFilter = selectedFilter === "All" || s.name.toLowerCase().includes(selectedFilter.toLowerCase());
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-5 px-5 pb-6 pt-2`}>
        <Text style={tw`text-2xl font-bold tracking-tight text-zinc-900`}>Explore</Text>

        {/* Search Bar */}
        <View style={tw`relative flex-row items-center`}>
          <Search size={16} color="#71717a" style={tw`absolute left-4 z-10`} strokeWidth={1.5} />
          <TextInput
            placeholder="Salons, services, therapists"
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={tw`h-12 w-full rounded-2xl bg-stone-100 pl-11 pr-4 text-sm text-zinc-900 border border-stone-200/40`}
          />
        </View>

        {/* Filter Scroll */}
        <View style={tw`-mx-5 px-5`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedFilter(f)}
                style={tw`rounded-full px-4 py-2 ${selectedFilter === f ? "bg-[#5c6f59]" : "bg-stone-100 border border-stone-200/20"
                  }`}
              >
                <Text style={tw`text-xs font-semibold ${selectedFilter === f ? "text-white" : "text-zinc-700"}`}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Map View Placeholder */}
        <View style={tw`flex h-36 items-center justify-center overflow-hidden rounded-3xl bg-stone-100 border border-stone-200/40`}>
          <View style={tw`flex-row items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm`}>
            <MapPin size={14} color="#5c6f59" strokeWidth={1.8} />
            <Text style={tw`text-xs font-semibold text-[#5c6f59]`}>
              Map view · {filteredSalons.length} nearby
            </Text>
          </View>
        </View>

        {/* Salon Cards */}
        <View style={tw`gap-4`}>
          {isLoading && <ActivityIndicator size="large" color="#5c6f59" style={tw`mt-8`} />}
          
          {!isLoading && filteredSalons.map((s: any) => (
            <Link
              key={s.id}
              href={{ pathname: "/salon/[id]", params: { id: s.id } }}
              asChild
            >
              <TouchableOpacity style={tw`flex-row gap-3 rounded-2xl bg-stone-100/60 p-3 border border-stone-200/30`}>
                <View style={tw`h-20 w-20 rounded-xl bg-zinc-200 items-center justify-center`}>
                  <Text style={tw`text-2xl font-bold text-zinc-400`}>{s.name.charAt(0)}</Text>
                </View>
                <View style={tw`flex-1 justify-between py-0.5`}>
                  <View>
                    <View style={tw`flex-row items-start justify-between`}>
                      <Text style={tw`text-sm font-semibold text-zinc-900 flex-1 mr-2`}>{s.name}</Text>
                      <Rating value={4.8} />
                    </View>
                    <Text style={tw`mt-0.5 text-xs text-zinc-500`}>
                      {s.address}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
          {!isLoading && filteredSalons.length === 0 && (
            <View style={tw`py-12 items-center`}>
              <Text style={tw`text-sm text-zinc-500`}>No salons found matching your criteria.</Text>
            </View>
          )}
        </View>
      </View>
    </MobileShell>
  );
}
