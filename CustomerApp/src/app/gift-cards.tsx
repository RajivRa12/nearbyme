import { useState } from "react";
import { Gift, X } from "lucide-react-native";
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable, TextInput, ScrollView } from "react-native";
import { alertMessage } from "../lib/alert";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, EmptyState, PrimaryButton } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { api, toArray, formatINR } from "../lib/api";
import { color, shadow } from "../lib/theme";

const AMOUNTS = [500, 1000, 2000, 5000];

function PurchaseModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const { data: storesObj } = useQuery<any>("/api/customer/stores/", visible);
  const stores = toArray<any>(storesObj);
  const [storeId, setStoreId] = useState<string | number | null>(null);
  const [amount, setAmount] = useState(1000);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setStoreId(null);
    setAmount(1000);
    setRecipientEmail("");
    onClose();
  };

  const purchase = async () => {
    if (!storeId) {
      alertMessage("Pick a salon", "Choose which salon this gift card is for.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/customer/giftcards/", {
        method: "POST",
        body: { store: storeId, initial_value: amount, recipient_email: recipientEmail || undefined },
      });
      close();
      onDone();
    } catch (e: any) {
      alertMessage("Couldn't purchase gift card", e?.message || "Please try again.");
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
          <Text style={tw`text-[18px] font-bold text-zinc-900`}>Buy a gift card</Text>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <X size={20} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={tw`px-5 pb-8 gap-y-5`}>
          <View>
            <Text style={tw`text-[12px] font-semibold text-zinc-500 mb-2`}>Amount</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setAmount(a)}
                  style={tw`px-4 py-2.5 rounded-xl border ${amount === a ? "bg-[#5c6f59] border-[#5c6f59]" : "bg-stone-50 border-stone-200"}`}
                >
                  <Text style={tw`text-[13px] font-semibold ${amount === a ? "text-white" : "text-zinc-700"}`}>₹{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={tw`text-[12px] font-semibold text-zinc-500 mb-2`}>Salon</Text>
            <View style={tw`gap-2`}>
              {stores.slice(0, 8).map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setStoreId(s.id)}
                  style={tw`px-4 py-3 rounded-xl border ${String(storeId) === String(s.id) ? "border-[#5c6f59] bg-[#5c6f59]/5" : "border-stone-200 bg-white"}`}
                >
                  <Text style={tw`text-[13px] font-semibold text-zinc-800`}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={tw`text-[12px] font-semibold text-zinc-500 mb-2`}>Recipient email (optional)</Text>
            <TextInput
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="friend@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={tw`h-12 px-4 rounded-xl border border-stone-200 text-[14px] text-zinc-800`}
            />
          </View>
          <PrimaryButton disabled={saving} onClick={purchase}>
            {saving ? "Purchasing…" : `Purchase for ₹${amount}`}
          </PrimaryButton>
        </ScrollView>
      </View>
    </Modal>
  );
}

function RedeemModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setCode("");
    onClose();
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setSaving(true);
    try {
      const res: any = await api("/api/customer/giftcards/redeem/", { method: "POST", body: { code: code.trim() } });
      close();
      onDone();
      alertMessage("Gift card redeemed", `₹${res?.data?.amount_credited ?? ""} added to your wallet.`);
    } catch (e: any) {
      alertMessage("Couldn't redeem code", e?.message || "Please check the code and try again.");
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
          <Text style={tw`text-[18px] font-bold text-zinc-900`}>Redeem a code</Text>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <X size={20} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={tw`px-5 pb-8 gap-y-4`}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="GIFT-XXXXXXXX"
            autoCapitalize="characters"
            style={tw`h-12 px-4 rounded-xl border border-stone-200 text-[14px] text-zinc-800 font-mono`}
          />
          <PrimaryButton disabled={saving || !code.trim()} onClick={redeem}>
            {saving ? "Redeeming…" : "Redeem"}
          </PrimaryButton>
        </View>
      </View>
    </Modal>
  );
}

export default function GiftCards() {
  const { data: cardsObj, isLoading, refetch } = useQuery<any>('/api/customer/giftcards/');
  const giftCards = toArray<any>(cardsObj);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Gift cards" subtitle="A very good gift." />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Gift cards" subtitle="A very good gift." />
      <View style={tw`gap-y-4 px-5 pb-8 pt-2`}>
        {giftCards.length === 0 && (
          <EmptyState
            icon={<Gift size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No gift cards yet"
            subtitle="Purchase or redeem a gift card to see it here."
          />
        )}
        {giftCards.map((g: any) => (
          <View key={g.id} style={{ ...tw`relative overflow-hidden rounded-[28px] p-6`, backgroundColor: g.is_active ? color.sage : color.ink3, ...shadow.md }}>
            <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-white opacity-75`}>
              {g.is_active ? "Gift card" : "Redeemed"}
            </Text>
            <Text style={tw`mt-1.5 text-[36px] font-bold text-white`}>{formatINR(g.current_balance)}</Text>
            <Text style={tw`mt-1 text-[12px] text-white opacity-75 font-mono`}>{g.code}</Text>
            {!!g.recipient_email && (
              <Text style={tw`mt-0.5 text-[12px] text-white opacity-75`}>For {g.recipient_email}</Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={() => setPurchaseOpen(true)}
          style={{ ...tw`h-12 w-full items-center justify-center rounded-2xl`, backgroundColor: color.sage }}
        >
          <Text style={tw`text-[14px] font-semibold text-white`}>Buy a gift card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRedeemOpen(true)}
          style={{ ...tw`h-12 w-full items-center justify-center rounded-2xl bg-white border border-stone-100`, ...shadow.xs }}
        >
          <Text style={tw`text-[14px] font-semibold text-zinc-700`}>Redeem a code</Text>
        </TouchableOpacity>
      </View>

      <PurchaseModal visible={purchaseOpen} onClose={() => setPurchaseOpen(false)} onDone={refetch} />
      <RedeemModal visible={redeemOpen} onClose={() => setRedeemOpen(false)} onDone={refetch} />
    </MobileShell>
  );
}
