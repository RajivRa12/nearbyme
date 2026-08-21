import { useLocalSearchParams, router } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable, ScrollView, TextInput, Linking } from "react-native";
import { useEffect, useState } from "react";
import { Check, Star, X, Home, HandCoins, Navigation } from "lucide-react-native";
import tw from "twrnc";
import { MobileShell } from "../../../components/MobileShell";
import { PageHeader, Card, PrimaryButton } from "../../../components/primitives";
import { useQuery } from "../../../hooks/useFetch";
import { api, formatINR, formatSlotDate, formatSlotTime } from "../../../lib/api";
import { alertMessage } from "../../../lib/alert";
import { dates } from "../../../lib/bookingState";
import { color, shadow } from "../../../lib/theme";

const TRACKING_POLL_MS = 10000;

function agoLabel(iso?: string | null): string {
  if (!iso) return "";
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  return `${mins}m ago`;
}

function OnTheWayBanner({ booking }: { booking: any }) {
  if (!booking.is_home_service || !booking.on_the_way_at || booking.status !== "confirmed") return null;
  return (
    <View style={[tw`flex-row items-center gap-3 rounded-2xl px-4 py-3`, { backgroundColor: color.sageTint }]}>
      <Navigation size={16} color={color.sage} strokeWidth={2} />
      <View style={tw`flex-1`}>
        <Text style={[tw`text-[13px] font-semibold`, { color: color.sage }]}>Your therapist is on the way</Text>
        {!!booking.location_updated_at && (
          <Text style={tw`text-[11px] text-zinc-500 mt-0.5`}>Updated {agoLabel(booking.location_updated_at)}</Text>
        )}
      </View>
    </View>
  );
}

const TRACK_STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "in_service", label: "In service" },
  { key: "completed", label: "Completed" },
] as const;

function BookingTimeline({ status }: { status: string }) {
  if (status === "cancelled" || status === "no_show") {
    return (
      <View style={[tw`flex-row items-center gap-2 rounded-2xl px-4 py-3`, { backgroundColor: color.terracottaTint }]}>
        <Text style={[tw`text-[13px] font-semibold`, { color: color.terracotta }]}>
          {status === "no_show" ? "Marked as no-show" : "This booking was cancelled"}
        </Text>
      </View>
    );
  }

  const idxRaw = TRACK_STEPS.findIndex((s) => s.key === status);
  const idx = idxRaw === -1 ? 0 : idxRaw;

  return (
    <View style={tw`flex-row items-start`}>
      {TRACK_STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <View key={step.key} style={tw`flex-1 items-center`}>
            <View style={tw`flex-row items-center w-full`}>
              <View style={[tw`h-1 flex-1 rounded-full`, { backgroundColor: i === 0 ? "transparent" : done || active ? color.sage : color.line }]} />
              <View style={[tw`h-7 w-7 rounded-full items-center justify-center`, { backgroundColor: done || active ? color.sage : color.bgSoft }]}>
                {done ? <Check size={13} color="#fff" strokeWidth={3} /> : <View style={[tw`h-2 w-2 rounded-full`, { backgroundColor: active ? "#fff" : color.ink3 }]} />}
              </View>
              <View style={[tw`h-1 flex-1 rounded-full`, { backgroundColor: i === TRACK_STEPS.length - 1 ? "transparent" : done ? color.sage : color.line }]} />
            </View>
            <Text style={tw`text-[10px] font-semibold mt-2 text-center ${done || active ? "text-zinc-800" : "text-zinc-400"}`}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewModal({ visible, onClose, bookingId, onDone }: { visible: boolean; onClose: () => void; bookingId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setRating(5);
    setComment("");
    onClose();
  };

  const submit = async () => {
    setSaving(true);
    try {
      await api(`/api/customer/bookings/${bookingId}/review/`, {
        method: "POST",
        body: { store_rating: rating, comment: comment || undefined },
      });
      close();
      onDone();
    } catch (e: any) {
      alertMessage("Couldn't submit review", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={tw`flex-1 bg-black/45`} onPress={close} />
      <View style={{ ...tw`rounded-t-[28px] bg-white`, ...shadow.md }}>
        <View style={tw`w-9 h-1.5 rounded-full bg-stone-200 self-center mt-3`} />
        <View style={tw`flex-row items-center justify-between px-5 pt-4 pb-3`}>
          <Text style={tw`text-[18px] font-bold text-zinc-900`}>Leave a review</Text>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <X size={20} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={tw`px-5 pb-8 gap-y-4`}>
          <View style={tw`flex-row justify-center gap-2`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setRating(i)} hitSlop={6}>
                <Star size={32} color={color.terracotta} fill={i <= rating ? color.terracotta : "transparent"} strokeWidth={1.5} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="How was your visit? (optional)"
            multiline
            numberOfLines={4}
            style={tw`h-24 px-4 py-3 rounded-xl border border-stone-200 text-[14px] text-zinc-800`}
          />
          <PrimaryButton disabled={saving} onClick={submit}>
            {saving ? "Submitting…" : "Submit review"}
          </PrimaryButton>
        </View>
      </View>
    </Modal>
  );
}

const TIP_AMOUNTS = [50, 100, 200];

function TipModal({
  visible, onClose, bookingId, professionalId, professionalName,
}: {
  visible: boolean; onClose: () => void; bookingId: string; professionalId: string | null; professionalName?: string | null;
}) {
  const [amount, setAmount] = useState(100);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setAmount(100);
    onClose();
  };

  const submit = async () => {
    if (!professionalId) {
      alertMessage("Can't tip right now", "No professional is linked to this booking.");
      return;
    }
    setSaving(true);
    try {
      const res: any = await api(`/api/customer/bookings/${bookingId}/tip/`, {
        method: "POST",
        body: { amount, professional_id: professionalId },
      });
      const deepLink = res?.data?.upi_deeplink;
      close();
      if (deepLink) {
        const canOpen = await Linking.canOpenURL(deepLink).catch(() => false);
        if (canOpen) {
          Linking.openURL(deepLink);
        } else {
          alertMessage("Open your UPI app", `Pay ₹${amount} to ${res?.data?.payee_name ?? "your therapist"} (${res?.data?.vpa}) to complete the tip.`);
        }
      }
    } catch (e: any) {
      alertMessage("Couldn't send tip", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={tw`flex-1 bg-black/45`} onPress={close} />
      <View style={{ ...tw`rounded-t-[28px] bg-white`, ...shadow.md }}>
        <View style={tw`w-9 h-1.5 rounded-full bg-stone-200 self-center mt-3`} />
        <View style={tw`flex-row items-center justify-between px-5 pt-4 pb-3`}>
          <Text style={tw`text-[18px] font-bold text-zinc-900`}>Tip {professionalName || "your therapist"}</Text>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <X size={20} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={tw`px-5 pb-8 gap-y-4`}>
          <View style={tw`flex-row gap-2`}>
            {TIP_AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => setAmount(a)}
                style={tw`flex-1 py-3 items-center rounded-xl border ${amount === a ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-50 border-stone-200"}`}
              >
                <Text style={tw`text-[14px] font-semibold ${amount === a ? "text-white" : "text-zinc-700"}`}>₹{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={String(amount)}
            onChangeText={(t) => setAmount(Number(t.replace(/[^0-9]/g, "")) || 0)}
            keyboardType="number-pad"
            placeholder="Custom amount"
            style={tw`h-12 px-4 rounded-xl border border-stone-200 text-[14px] text-zinc-800`}
          />
          <PrimaryButton disabled={saving || amount <= 0} onClick={submit}>
            {saving ? "Sending…" : `Tip ₹${amount} via UPI`}
          </PrimaryButton>
        </View>
      </View>
    </Modal>
  );
}

function RescheduleModal({
  visible, onClose, bookingId, storeId, serviceId, onDone,
}: {
  visible: boolean; onClose: () => void; bookingId: string; storeId: string | number | null; serviceId: string | null; onDone: () => void;
}) {
  const [dateKey, setDateKey] = useState(dates[0].key);
  const [selected, setSelected] = useState<{ start: string; end: string } | undefined>();
  const [saving, setSaving] = useState(false);

  const url = storeId && serviceId
    ? `/api/customer/stores/${storeId}/phase1-availability/?service_id=${serviceId}&date=${dateKey}`
    : "";
  const { data: availObj, isLoading } = useQuery<any>(url, visible && !!storeId && !!serviceId);
  const slots: { start: string; end: string }[] = availObj?.data?.slots ?? [];

  const close = () => {
    setSelected(undefined);
    onClose();
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api(`/api/customer/bookings/${bookingId}/reschedule/`, {
        method: "POST",
        body: { slot_start: selected.start },
      });
      close();
      onDone();
    } catch (e: any) {
      alertMessage("Couldn't reschedule", e?.message || "That time may no longer be available.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={tw`flex-1 bg-black/45`} onPress={close} />
      <View style={{ ...tw`rounded-t-[28px] bg-white max-h-[80%]`, ...shadow.md }}>
        <View style={tw`w-9 h-1.5 rounded-full bg-stone-200 self-center mt-3`} />
        <View style={tw`flex-row items-center justify-between px-5 pt-4 pb-3`}>
          <Text style={tw`text-[18px] font-bold text-zinc-900`}>Reschedule</Text>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <X size={20} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={tw`px-5 pb-8 gap-y-5`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
            {dates.map((d) => {
              const isSelected = d.key === dateKey;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => { setDateKey(d.key); setSelected(undefined); }}
                  style={tw`h-16 w-14 items-center justify-center rounded-2xl border ${isSelected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"}`}
                >
                  <Text style={tw`text-[10px] font-semibold uppercase ${isSelected ? "text-white/80" : "text-zinc-500"}`}>{d.weekday}</Text>
                  <Text style={tw`text-base font-bold ${isSelected ? "text-white" : "text-zinc-800"}`}>{d.day}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isLoading && <ActivityIndicator size="small" color={color.sage} />}
          {!isLoading && slots.length === 0 && (
            <Text style={tw`text-xs text-zinc-500`}>No availability on this date. Try another day.</Text>
          )}
          <View style={tw`flex-row flex-wrap justify-between gap-y-2`}>
            {slots.map((s) => {
              const isSelected = selected?.start === s.start;
              return (
                <TouchableOpacity
                  key={s.start}
                  onPress={() => setSelected(s)}
                  style={tw`w-[23%] rounded-xl py-3 items-center border ${isSelected ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-100 border-stone-200/20"}`}
                >
                  <Text style={tw`text-xs font-semibold ${isSelected ? "text-white" : "text-zinc-700"}`}>{formatSlotTime(s.start)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton disabled={!selected || saving} onClick={submit}>
            {saving ? "Rescheduling…" : "Confirm new time"}
          </PrimaryButton>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading, isError, refetch } = useQuery<any>(`/api/customer/bookings/${id}/`, !!id);
  const [cancelling, setCancelling] = useState(false);

  // Only worth polling while a home-service booking could still change —
  // confirmed-but-not-yet-started, tracking a therapist's live status.
  const isTrackable = booking?.is_home_service && booking?.status === "confirmed";
  useEffect(() => {
    if (!isTrackable) return;
    const interval = setInterval(refetch, TRACKING_POLL_MS);
    return () => clearInterval(interval);
  }, [isTrackable, refetch]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Booking details" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  if (isError || !booking) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <View style={tw`flex-1 items-center justify-center p-8`}>
          <Text style={tw`text-sm text-zinc-500`}>Booking not found.</Text>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/bookings")}
            style={[tw`mt-4 px-4 py-2.5 rounded-xl`, { backgroundColor: color.sage }]}
          >
            <Text style={tw`text-white font-semibold`}>Go back</Text>
          </TouchableOpacity>
        </View>
      </MobileShell>
    );
  }

  const cancelled = booking.status === "cancelled" || booking.status === "no_show";
  const done = booking.status === "completed";
  const confirmed = booking.status === "confirmed";
  const firstSlot = booking.slots?.[0];
  const svcName = firstSlot?.store_service_name || "Service";
  const totalPaise = (booking.slots || []).reduce((sum: number, s: any) => sum + (s.price_paise || 0), 0);
  const start = new Date(booking.booking_start);

  const handleCancel = () => {
    alertMessage("Cancel booking?", "This can't be undone.", [
      { text: "Keep booking", style: "cancel" },
      {
        text: "Cancel booking",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await api(`/api/customer/bookings/${id}/cancel/`, { method: "POST" });
            refetch();
          } catch (e: any) {
            alertMessage("Couldn't cancel", e?.message || "Please try again.");
          }
          setCancelling(false);
        },
      },
    ]);
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader
        title={svcName}
        subtitle={`${booking.outlet_name} · ${formatSlotDate(start)} at ${formatSlotTime(start)}`}
      />

      <View style={tw`gap-y-5 px-5 pb-8 pt-2`}>
        {/* Status card */}
        <View style={{ ...tw`rounded-3xl p-5 gap-1`, backgroundColor: cancelled ? color.terracottaTint : color.sageTint }}>
          <Text style={[tw`text-[10px] font-semibold uppercase tracking-widest opacity-80`, { color: cancelled ? color.terracotta : color.sage }]}>
            Status
          </Text>
          <Text style={[tw`text-[19px] font-bold`, { color: cancelled ? color.terracotta : color.sage }]}>
            {booking.status.replace("_", " ")}
          </Text>
        </View>

        {/* Track */}
        <Card>
          <BookingTimeline status={booking.status} />
        </Card>

        <OnTheWayBanner booking={booking} />

        {/* Home service address */}
        {booking.is_home_service && (
          <Card style={tw`flex-row items-start gap-3`}>
            <View style={[tw`h-9 w-9 rounded-full items-center justify-center`, { backgroundColor: color.sageTint }]}>
              <Home size={16} color={color.sage} strokeWidth={1.8} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[13px] font-semibold text-zinc-900`}>Home visit</Text>
              <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>{booking.service_address}</Text>
            </View>
          </Card>
        )}

        {/* Services */}
        <Card style={tw`gap-y-4`}>
          <View>
            <Text style={[tw`text-[10px] font-semibold uppercase tracking-widest`, { color: color.sage }]}>Services</Text>
            <View style={tw`mt-2 gap-2`}>
              {(booking.slots || []).map((s: any) => (
                <View key={s.id} style={tw`flex-row items-center justify-between`}>
                  <View>
                    <Text style={tw`text-[14px] font-medium text-zinc-900`}>{s.store_service_name}</Text>
                    {!!s.professional_name && <Text style={tw`text-[12px] text-zinc-500`}>with {s.professional_name}</Text>}
                  </View>
                  <Text style={tw`text-[14px] font-medium text-zinc-900`}>{formatINR(s.price_paise / 100)}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={tw`pt-3 border-t border-stone-100 flex-row justify-between`}>
            <Text style={tw`text-[14px] font-bold text-zinc-900`}>Total</Text>
            <Text style={[tw`text-[14px] font-bold`, { color: color.sage }]}>{formatINR(totalPaise / 100)}</Text>
          </View>
          {booking.payment?.payment_type === "deposit" && (
            <View style={tw`gap-y-1`}>
              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-[12px] text-zinc-500`}>Paid online (deposit)</Text>
                <Text style={tw`text-[12px] text-zinc-700`}>{formatINR(booking.payment.amount_paise / 100)}</Text>
              </View>
              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-[12px] font-semibold text-zinc-700`}>Due at venue</Text>
                <Text style={tw`text-[12px] font-semibold text-zinc-900`}>{formatINR(booking.payment.balance_due_paise / 100)}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Tip your therapist */}
        {done && !!firstSlot?.professional && (
          <TouchableOpacity
            onPress={() => setTipOpen(true)}
            style={{ ...tw`h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-white border border-stone-100`, ...shadow.xs }}
          >
            <HandCoins size={16} color={color.sage} strokeWidth={1.8} />
            <Text style={[tw`text-[14px] font-semibold`, { color: color.sage }]}>Tip {firstSlot.professional_name || "your therapist"}</Text>
          </TouchableOpacity>
        )}

        {/* Leave a review */}
        {done && !booking.has_review && (
          <TouchableOpacity
            onPress={() => setReviewOpen(true)}
            style={{ ...tw`h-12 items-center justify-center rounded-2xl`, backgroundColor: color.sage }}
          >
            <Text style={tw`text-[14px] font-semibold text-white`}>Leave a review</Text>
          </TouchableOpacity>
        )}
        {done && booking.has_review && (
          <View style={tw`items-center py-1`}>
            <Text style={tw`text-[13px] text-zinc-500`}>You've already reviewed this visit. Thanks!</Text>
          </View>
        )}

        {/* Actions */}
        {confirmed && (
          <TouchableOpacity
            onPress={() => setRescheduleOpen(true)}
            style={{ ...tw`h-12 items-center justify-center rounded-2xl bg-white border border-stone-100`, ...shadow.xs }}
          >
            <Text style={tw`text-[14px] font-semibold text-zinc-700`}>Reschedule</Text>
          </TouchableOpacity>
        )}
        {!cancelled && !done && (
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancelling}
            style={[tw`h-12 items-center justify-center rounded-2xl`, { backgroundColor: color.terracottaTint }]}
          >
            {cancelling ? <ActivityIndicator color={color.terracotta} /> : <Text style={[tw`text-[14px] font-semibold`, { color: color.terracotta }]}>Cancel booking</Text>}
          </TouchableOpacity>
        )}
      </View>

      <ReviewModal visible={reviewOpen} onClose={() => setReviewOpen(false)} bookingId={id as string} onDone={refetch} />
      <TipModal
        visible={tipOpen}
        onClose={() => setTipOpen(false)}
        bookingId={id as string}
        professionalId={firstSlot?.professional ?? null}
        professionalName={firstSlot?.professional_name}
      />
      <RescheduleModal
        visible={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        bookingId={id as string}
        storeId={booking.store_id}
        serviceId={firstSlot?.store_service ?? null}
        onDone={refetch}
      />
    </MobileShell>
  );
}
