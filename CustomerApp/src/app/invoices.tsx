import { View, Text } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../components/MobileShell";
import { PageHeader } from "../components/primitives";

export default function Invoices() {
  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Invoices" />
      <View style={tw`gap-y-5 px-5 pb-8`}>
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-sm text-zinc-500`}>No invoices found.</Text>
        </View>
      </View>
    </MobileShell>
  );
}
