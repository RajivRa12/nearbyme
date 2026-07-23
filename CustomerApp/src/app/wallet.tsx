import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";

export default function Wallet() {
  const { data: walletObj, isLoading } = useQuery<any>('/api/customer/wallet/');

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Wallet" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  const wallet = walletObj || { balance: 0.00, transactions: [] };
  const transactions = wallet.transactions || [];

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Wallet" />
      <View style={tw`gap-y-6 px-5 pb-8`}>
        {/* Balance Card */}
        <View style={tw`rounded-3xl bg-[#5c6f59] p-6 shadow-sm`}>
          <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-white opacity-80`}>
            Balance
          </Text>
          <Text style={tw`mt-2 text-4xl font-bold text-white`}>
            ₹{Number(wallet.balance).toFixed(2)}
          </Text>
          <View style={tw`mt-5 flex-row gap-2`}>
            <TouchableOpacity style={tw`flex-1 h-10 items-center justify-center rounded-xl bg-white shadow-sm`}>
              <Text style={tw`text-sm font-semibold text-[#5c6f59]`}>Top up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tw`flex-1 h-10 items-center justify-center rounded-xl bg-white/10 border border-white/10`}>
              <Text style={tw`text-sm font-semibold text-white`}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions List */}
        <View style={tw`mt-4`}>
          <Text style={tw`mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
            Transactions
          </Text>
          <View style={tw`overflow-hidden rounded-2xl bg-stone-100/60 border border-stone-200/30`}>
            {transactions.length === 0 && (
              <View style={tw`py-8 items-center`}>
                <Text style={tw`text-sm text-zinc-500`}>No recent transactions.</Text>
              </View>
            )}
            {transactions.map((t: any, idx: number) => (
              <View
                key={t.id}
                style={tw`flex-row items-center justify-between px-4 py-4 ${idx > 0 ? "border-t border-stone-200/40" : ""}`}
              >
                <View>
                  <Text style={tw`text-sm font-semibold text-zinc-800 uppercase`}>{t.transaction_type}</Text>
                  <Text style={tw`text-xs text-zinc-500 mt-0.5`}>{new Date(t.created_at).toLocaleDateString()}</Text>
                </View>
                <Text
                  style={tw`text-sm font-bold ${Number(t.amount) < 0 ? "text-zinc-850" : "text-[#5c6f59]"}`}
                >
                  {Number(t.amount) < 0 ? "-" : "+"}₹{Math.abs(Number(t.amount)).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </MobileShell>
  );
}
