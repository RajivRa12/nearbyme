import { View, Text } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader } from "../../components/primitives";

export default function AIBeautyUpload() {
  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="AI Stylist" />
      <View style={tw`gap-y-5 px-5 pb-8`}>
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-sm text-zinc-500`}>AI Stylist is temporarily unavailable.</Text>
        </View>
      </View>
    </MobileShell>
  );
}
