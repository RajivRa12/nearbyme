import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader, ListRow } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";

export default function Personal() {
  const { data: profileObj, isLoading } = useQuery<any>('/api/customer/profile/');
  
  if (isLoading) {
    return (
      <MobileShell showHeader={false} scroll={false}>
        <PageHeader title="Personal information" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  const user = profileObj || {};

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Personal information" />
      <View style={tw`gap-y-5 px-5 pb-8`}>
        <Section title="You">
          <ListRow label="Full name" value={`${user.first_name || ''} ${user.last_name || ''}`} />
          <ListRow label="Email" value={user.email} />
          <ListRow label="Phone" value={user.phone || 'Not provided'} />
        </Section>
        <Section title="Addresses">
          <View style={tw`p-4 items-center`}>
            <Text style={tw`text-sm text-zinc-500`}>No addresses saved.</Text>
          </View>
        </Section>
      </View>
    </MobileShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={tw`mt-4`}>
      <Text style={tw`mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
        {title}
      </Text>
      <View style={tw`overflow-hidden rounded-2xl bg-stone-100/60 border border-stone-200/30`}>
        {children}
      </View>
    </View>
  );
}
