import { MessageCircle, Mail, HelpCircle, Shield } from "lucide-react-native";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader } from "../../components/primitives";
import { color, shadow } from "../../lib/theme";

type SupportItem = { icon: any; label: string; hint?: string };

const items: SupportItem[] = [
  { icon: MessageCircle, label: "Chat with a concierge", hint: "Usually replies in 3 min" },
  { icon: Mail, label: "Email us", hint: "hello@ritual.app" },
  { icon: HelpCircle, label: "Help centre" },
  { icon: Shield, label: "Terms & policies" },
];

export default function Support() {
  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Support" subtitle="Real humans, all week." />
      <View style={tw`gap-y-3 px-5 pb-8`}>
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <TouchableOpacity
              key={i.label}
              activeOpacity={0.7}
              style={{ ...tw`flex-row w-full items-center gap-3.5 rounded-3xl bg-white p-4 border border-stone-100`, ...shadow.xs }}
            >
              <View style={[tw`flex h-11 w-11 items-center justify-center rounded-2xl`, { backgroundColor: color.sage }]}>
                <Icon size={18} color="white" strokeWidth={1.6} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-[14px] font-semibold text-zinc-800`}>{i.label}</Text>
                {i.hint && <Text style={tw`text-[12px] text-zinc-500 mt-0.5`}>{i.hint}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </MobileShell>
  );
}
