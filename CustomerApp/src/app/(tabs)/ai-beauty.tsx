import { Camera, Sparkles, Upload } from "lucide-react-native";
import { Link } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { PageHeader } from "../../components/primitives";

export default function AIBeauty() {
  return (
    <MobileShell showHeader={true} scroll={true}>
      <PageHeader
        title="AI Beauty Assistant"
        subtitle="Personalised skin, hair, and home-care from a single selfie."
        back={false}
      />
      <View style={tw`gap-y-4 px-5 pb-6`}>
        {/* Info Banner */}
        <View style={tw`rounded-3xl bg-[#5c6f59] p-6 shadow-sm gap-2`}>
          <Sparkles size={20} color="white" strokeWidth={1.6} />
          <Text style={tw`text-lg font-semibold text-white leading-snug`}>
            Take a selfie and receive an editorial-grade analysis in seconds.
          </Text>
          <Text style={tw`text-sm text-white/90`}>
            Skin type, hair condition, service matches, and a full home-care routine.
          </Text>
        </View>

        {/* Action Grid */}
        <View style={tw`flex-row gap-3 mt-4`}>
          <Link href="/ai-beauty/upload" asChild>
            <TouchableOpacity
              style={[tw`flex-1 flex-col items-start justify-between rounded-2xl bg-stone-100 p-4 border border-stone-200/30`, { aspectRatio: 1 }]}
            >
              <Camera size={24} color="#5c6f59" strokeWidth={1.5} />
              <View>
                <Text style={tw`text-sm font-semibold text-zinc-800`}>Take a selfie</Text>
                <Text style={tw`text-xs text-zinc-500`}>Use your camera</Text>
              </View>
            </TouchableOpacity>
          </Link>
          <Link href="/ai-beauty/upload" asChild>
            <TouchableOpacity
              style={[tw`flex-1 flex-col items-start justify-between rounded-2xl bg-stone-100 p-4 border border-stone-200/30`, { aspectRatio: 1 }]}
            >
              <Upload size={24} color="#5c6f59" strokeWidth={1.5} />
              <View>
                <Text style={tw`text-sm font-semibold text-zinc-800`}>Upload a photo</Text>
                <Text style={tw`text-xs text-zinc-500`}>From your library</Text>
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Last Analysis Summary */}
        <View style={tw`rounded-2xl bg-stone-100/60 p-4 border border-stone-200/30 mt-4`}>
          <Text style={tw`text-[10px] font-semibold uppercase tracking-widest text-[#5c6f59]`}>
            Last analysis
          </Text>
          <Text style={tw`mt-2 text-sm text-zinc-700`}>
            Normal-combination · minor dehydration · brightness score 82
          </Text>
          <Link href="/ai-beauty/result" asChild>
            <TouchableOpacity style={tw`mt-3`}>
              <Text style={tw`text-xs font-semibold text-[#5c6f59] underline`}>
                View last result
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </MobileShell>
  );
}
