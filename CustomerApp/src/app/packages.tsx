import { Package } from "lucide-react-native";
import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader, Card, EmptyState } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";
import { formatINR } from "../lib/api";
import { color } from "../lib/theme";

export default function Packages() {
  const { data: pkgObj, isLoading } = useQuery<any>('/api/customer/packages/');
  const packages = pkgObj?.results || (Array.isArray(pkgObj) ? pkgObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Packages" subtitle="Prepaid bundles, ready when you are." />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Packages" subtitle="Prepaid bundles, ready when you are." />
      <View style={tw`gap-y-3 px-5 pb-8 pt-2`}>
        {packages.length === 0 && (
          <EmptyState
            icon={<Package size={26} color={color.ink3} strokeWidth={1.5} />}
            title="No active packages"
            subtitle="Prepaid session bundles you buy will show up here."
          />
        )}
        {packages.map((p: any) => {
          const details = p.package_details;
          const services = details?.services_list || [];
          return (
            <Card key={p.id}>
              <View style={tw`flex-row justify-between items-start`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-[15px] font-semibold text-zinc-900`}>{details?.name || "Package"}</Text>
                  {!!details?.description && (
                    <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>{details.description}</Text>
                  )}
                </View>
                <Text style={tw`text-[15px] font-bold text-zinc-900`}>{formatINR(details?.price)}</Text>
              </View>

              {services.length > 0 && (
                <View style={tw`mt-3 gap-1`}>
                  {services.map((s: any) => (
                    <View key={s.id} style={tw`flex-row items-center justify-between`}>
                      <Text style={tw`text-[13px] text-zinc-600`}>{s.name}</Text>
                      <Text style={tw`text-[12px] text-zinc-400`}>{s.duration_minutes} min</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={tw`flex-row items-center justify-between mt-3.5 pt-3 border-t border-stone-100`}>
                <Text style={tw`text-[12px] text-zinc-400`}>
                  Purchased {new Date(p.purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Text>
                <View style={[tw`rounded-full px-2.5 py-1`, { backgroundColor: p.is_active ? color.sageTint : color.bgSoft }]}>
                  <Text style={[tw`text-[10px] font-semibold uppercase`, { color: p.is_active ? color.sage : color.ink3 }]}>
                    {p.is_active ? "Active" : "Used"}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </MobileShell>
  );
}
