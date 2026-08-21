import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { color, shadow } from "../lib/theme";
import { WalletCards } from "lucide-react-native";

export default function Wallet() {
  const { data: walletObj, isLoading } = useQuery<any>('/api/customer/wallet/');

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Wallet" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  const wallet = walletObj || { balance: 0.00, transactions: [] };
  const transactions = wallet.transactions || [];

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Wallet" />
      <View style={tw`gap-y-6 px-5 pb-8 pt-2`}>
        {/* Balance Card */}
        <View style={{ ...tw`rounded-[28px] p-6`, backgroundColor: color.sage, ...shadow.md }}>
          <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-white opacity-75`}>
            Balance
          </Text>
          <Text style={tw`mt-2 text-[36px] font-bold text-white`}>
            ₹{Number(wallet.balance).toFixed(2)}
          </Text>
          <View style={tw`mt-5 flex-row gap-2.5`}>
            <TouchableOpacity style={{ ...tw`flex-1 h-11 items-center justify-center rounded-2xl bg-white`, ...shadow.xs }}>
              <Text style={[tw`text-[14px] font-semibold`, { color: color.sage }]}>Top up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tw`flex-1 h-11 items-center justify-center rounded-2xl bg-white/10 border border-white/15`}>
              <Text style={tw`text-[14px] font-semibold text-white`}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions List */}
        <View style={tw`gap-2`}>
          <Text style={[tw`px-1 text-[11px] font-semibold uppercase tracking-widest`, { color: color.sage }]}>
            Transactions
          </Text>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<WalletCards size={26} color={color.ink3} strokeWidth={1.5} />}
              title="No transactions yet"
            />
          ) : (
            <View style={{ ...tw`overflow-hidden rounded-3xl bg-white border border-stone-100`, ...shadow.xs }}>
              {transactions.map((t: any, idx: number) => (
                <View
                  key={t.id}
                  style={tw`flex-row items-center justify-between px-4 py-4 ${idx > 0 ? "border-t border-stone-100" : ""}`}
                >
                  <View style={tw`flex-1 pr-3`}>
                    <Text style={tw`text-[14px] font-semibold text-zinc-800`} numberOfLines={1}>{t.description || t.transaction_type}</Text>
                    <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>{new Date(t.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text
                    style={[tw`text-[14px] font-bold`, { color: Number(t.amount) < 0 ? color.ink : color.sage }]}
                  >
                    {Number(t.amount) < 0 ? "-" : "+"}₹{Math.abs(Number(t.amount)).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </MobileShell>
  );
}
