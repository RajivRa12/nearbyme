import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../../components/MobileShell";
import { PageHeader, PrimaryButton } from "../../../components/primitives";
import { useQuery } from "../../../hooks/useFetch";

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // We can fetch the list and find the specific one, or if there's a detail endpoint use that.
  // For simplicity, fetch all and filter since we don't have a guaranteed detail endpoint path documented.
  const { data: bookingsObj, isLoading } = useQuery<any>('/api/customer/appointments/');
  const bookings = bookingsObj?.results || (Array.isArray(bookingsObj) ? bookingsObj : []);
  const booking = bookings.find((b: any) => String(b.id) === String(id));

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Booking Details" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  if (!booking) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <Text style={tw`text-sm text-zinc-500`}>Booking not found.</Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/bookings")} style={tw`mt-4 px-4 py-2 bg-[#5c6f59] rounded-xl`}>
            <Text style={tw`text-white font-semibold`}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </MobileShell>
    );
  }

  const cancelled = booking.status === "CANCELLED";
  const completed = booking.status === "COMPLETED";
  const svcName = booking.items?.[0]?.service_name || "Service";

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title={svcName} subtitle={`${booking.store_name} · ${booking.date} at ${booking.start_time}`} />

      <View style={tw`gap-y-6 px-5 pb-8`}>
        {/* Status card */}
        <View style={tw`rounded-3xl p-5 border gap-2 ${cancelled ? 'bg-[#c06048]/10 border-[#c06048]/20' : 'bg-[#5c6f59]/10 border-[#5c6f59]/20'}`}>
          <Text style={tw`text-[10px] font-semibold uppercase tracking-widest opacity-80 ${cancelled ? 'text-[#c06048]' : 'text-[#5c6f59]'}`}>
            Status
          </Text>
          <Text style={tw`text-lg font-bold ${cancelled ? 'text-[#c06048]' : 'text-[#5c6f59]'}`}>{booking.status}</Text>
        </View>

        {/* Info */}
        <View style={tw`rounded-3xl bg-stone-100/60 p-5 border border-stone-200/30 gap-y-4`}>
          <View>
            <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>Service</Text>
            <Text style={tw`mt-1 text-sm font-medium text-zinc-900`}>{svcName}</Text>
          </View>
          <View>
            <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>Price</Text>
            <Text style={tw`mt-1 text-sm font-medium text-zinc-900`}>₹{booking.total_amount}</Text>
          </View>
          <View>
            <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>Notes</Text>
            <Text style={tw`mt-1 text-sm font-medium text-zinc-900`}>{booking.notes || 'None'}</Text>
          </View>
        </View>

        {/* Actions */}
        {!cancelled && !completed && (
          <View style={tw`gap-3`}>
            <PrimaryButton onPress={() => router.push({ pathname: "/booking/[id]/reschedule", params: { id: booking.id } })}>
              Reschedule
            </PrimaryButton>
            <TouchableOpacity
              style={tw`h-12 items-center justify-center rounded-xl bg-[#c06048]/10`}
            >
              <Text style={tw`text-sm font-semibold text-[#c06048]`}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </MobileShell>
  );
}
