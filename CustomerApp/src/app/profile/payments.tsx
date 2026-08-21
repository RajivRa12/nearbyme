import { CreditCard } from "lucide-react-native";
import { View } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader, EmptyState } from "../../components/primitives";
import { color } from "../../lib/theme";

export default function Payments() {
  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Saved payment methods" />
      <View style={tw`px-5 pb-8 pt-2`}>
        <EmptyState
          icon={<CreditCard size={26} color={color.ink3} strokeWidth={1.5} />}
          title="No payment methods saved"
          subtitle="Add a card at checkout to save it here for next time."
        />
      </View>
    </MobileShell>
  );
}
