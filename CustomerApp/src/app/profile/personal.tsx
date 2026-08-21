import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader, ListRow } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";
import { color, shadow } from "../../lib/theme";

export default function Personal() {
  const { data: profileObj, isLoading } = useQuery<any>('/api/customer/profile/');

  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Personal information" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  const user = profileObj || {};

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Personal information" />
      <View style={tw`gap-y-5 px-5 pb-8 pt-2`}>
        <Section title="You">
          <ListRow label="Full name" value={`${user.first_name || ''} ${user.last_name || ''}`} showChevron={false} />
          <ListRow label="Email" value={user.email} showChevron={false} />
          <ListRow label="Phone" value={user.phone || 'Not provided'} showChevron={false} />
        </Section>
        <Section title="Addresses">
          <View style={tw`p-4 items-center`}>
            <Text style={tw`text-[13px] text-zinc-500`}>No addresses saved.</Text>
          </View>
        </Section>
      </View>
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={tw`gap-2`}>
      <Text style={[tw`px-1 text-[11px] font-semibold uppercase tracking-widest`, { color: color.sage }]}>
        {title}
      </Text>
      <View style={{ ...tw`overflow-hidden rounded-3xl bg-white border border-stone-100`, ...shadow.xs }}>
        {children}
      </View>
    </View>
  );
}
