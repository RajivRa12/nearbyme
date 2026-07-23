import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader } from "../components/primitives";
import { useQuery } from "../hooks/useFetch";

export default function Packages() {
  const { data: pkgObj, isLoading } = useQuery<any>('/api/customer/packages/');
  const packages = pkgObj?.results || (Array.isArray(pkgObj) ? pkgObj : []);

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Packages" subtitle="Prepaid bundles, ready when you are." />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Packages" subtitle="Prepaid bundles, ready when you are." />
      <View style={tw`gap-y-3 px-5 pb-8`}>
        {packages.length === 0 && (
          <View style={tw`py-12 items-center`}>
            <Text style={tw`text-sm text-zinc-500`}>No active packages found.</Text>
          </View>
        )}
        {packages.map((p: any) => {
          const remaining = p.sessions_remaining || 0;
          const total = p.package?.total_sessions || 1;
          const pct = (remaining / total) * 100;
          return (
            <View key={p.id} style={tw`rounded-2xl bg-stone-100/60 p-4 border border-stone-200/30 mt-2`}>
              <View style={tw`flex-row justify-between items-baseline`}>
                <Text style={tw`text-sm font-semibold text-zinc-850`}>{p.package?.name || 'Package'}</Text>
                <Text style={tw`text-xs text-zinc-500`}>Expires {p.expiry_date || 'N/A'}</Text>
              </View>
              <View style={tw`mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200`}>
                <View style={[tw`h-full bg-[#5c6f59]`, { width: `${pct}%` }]} />
              </View>
              <Text style={tw`mt-2 text-xs text-zinc-650 font-medium`}>
                {remaining} of {total} remaining
              </Text>
            </View>
          );
        })}
      </View>
    </MobileShell>
  );
}
