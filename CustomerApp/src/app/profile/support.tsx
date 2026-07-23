import { MessageCircle, Mail, HelpCircle, Shield } from "lucide-react-native";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader } from "../../components/primitives";

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
              style={tw`flex-row w-full items-center gap-3 rounded-2xl bg-stone-100/60 p-4 border border-stone-200/30 mt-2`}
            >
              <View style={tw`flex h-10 w-10 items-center justify-center rounded-xl bg-[#5c6f59]`}>
                <Icon size={18} color="white" strokeWidth={1.5} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-sm font-semibold text-zinc-800`}>{i.label}</Text>
                {i.hint && <Text style={tw`text-xs text-zinc-500 mt-0.5`}>{i.hint}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </MobileShell>
  );
}
