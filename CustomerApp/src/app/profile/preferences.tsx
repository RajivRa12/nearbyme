import { useState } from "react";
import { View, Text, Switch } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader } from "../../components/primitives";
import { color, shadow } from "../../lib/theme";

const notifOptions = [
  { key: "reminders", label: "Appointment reminders" },
  { key: "deals", label: "Flash deals & offers" },
  { key: "membership", label: "Membership updates" },
  { key: "rewards", label: "Rewards & points" },
  { key: "campaigns", label: "Seasonal campaigns" },
] as const;

export default function Preferences() {
  const [state, setState] = useState<Record<string, boolean>>({
    reminders: true,
    deals: true,
    membership: true,
    rewards: true,
    campaigns: false,
  });

  const [recommendations, setRecommendations] = useState(true);
  const [shareUsage, setShareUsage] = useState(false);

  const toggleSwitch = (key: string, val: boolean) => {
    setState((s) => ({ ...s, [key]: val }));
  };

  return (
    <MobileShell showHeader={false} scroll={true}>
      <PageHeader title="Preferences" />

      <View style={tw`gap-y-5 px-5 pb-8`}>
        {/* Notifications Section */}
        <Section title="Notifications">
          {notifOptions.map((o, idx) => (
            <View
              key={o.key}
              style={tw`flex-row items-center justify-between px-4 py-3.5 ${idx > 0 ? "border-t border-stone-200/40" : ""
                }`}
            >
              <Text style={tw`text-sm font-semibold text-zinc-800`}>{o.label}</Text>
              <Switch
                trackColor={{ false: color.line, true: color.sage }}
                thumbColor="white"
                ios_backgroundColor="#e4e4e7"
                value={state[o.key]}
                onValueChange={(val) => toggleSwitch(o.key, val)}
              />
            </View>
          ))}
        </Section>

        {/* Privacy Section */}
        <Section title="Privacy">
          <View style={tw`flex-row items-center justify-between px-4 py-3.5`}>
            <Text style={tw`text-sm font-semibold text-zinc-800`}>Personalised recommendations</Text>
            <Switch
              trackColor={{ false: "#e4e4e7", true: "#5c6f59" }}
              thumbColor="white"
              ios_backgroundColor="#e4e4e7"
              value={recommendations}
              onValueChange={setRecommendations}
            />
          </View>
          <View style={tw`flex-row items-center justify-between px-4 py-3.5 border-t border-stone-200/40`}>
            <Text style={tw`text-sm font-semibold text-zinc-800`}>Share anonymous usage</Text>
            <Switch
              trackColor={{ false: "#e4e4e7", true: "#5c6f59" }}
              thumbColor="white"
              ios_backgroundColor="#e4e4e7"
              value={shareUsage}
              onValueChange={setShareUsage}
            />
          </View>
        </Section>

        {/* Language Section */}
        <Section title="Language">
          <View style={tw`px-4 py-4`}>
            <Text style={tw`text-sm font-semibold text-zinc-800`}>English (United Kingdom)</Text>
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
