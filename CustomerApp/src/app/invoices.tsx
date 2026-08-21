import { Receipt } from "lucide-react-native";
import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card, Chip, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { formatINR } from "../lib/api";
import { color } from "../lib/theme";

const STATUS_TONE: Record<string, "sage" | "sand" | "terracotta"> = {
  PAID: "sage",
  UNPAID: "terracotta",
  PARTIALLY_PAID: "sand",
  REFUNDED: "sand",
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  REFUNDED: "Refunded",
};

export default function Invoices() {
  const { data, isLoading } = useQuery<any>("/api/customer/invoices/");
  const invoices = data?.results || (Array.isArray(data) ? data : []);

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Invoices" />
      <View style={tw`gap-y-3 px-5 pb-8 pt-3`}>
        {isLoading ? (
          <View style={tw`py-16 items-center`}>
            <ActivityIndicator color={color.sage} />
          </View>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No invoices yet"
            subtitle="Invoices from your completed visits will appear here."
          />
        ) : (
          invoices.map((inv: any) => (
            <Card key={inv.id}>
              <View style={tw`flex-row items-start justify-between`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{inv.store_name}</Text>
                  <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>#{inv.invoice_number}</Text>
                  <Text style={tw`text-[12px] text-zinc-400 mt-1`}>
                    {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <View style={tw`items-end gap-2`}>
                  <Text style={tw`text-[16px] font-bold text-zinc-900`}>{formatINR(inv.grand_total_paise / 100)}</Text>
                  <Chip tone={STATUS_TONE[inv.status] || "sand"}>{STATUS_LABEL[inv.status] || inv.status}</Chip>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </MobileShell>
  );
}
