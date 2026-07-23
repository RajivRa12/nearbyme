import { ChevronRight, LogOut } from "lucide-react-native";
import { Link, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { useQuery } from "../../hooks/useFetch";
import { logout } from "../../lib/api";

type ProfileItem = { label: string; href: string; hint?: string; onPress?: () => void; isDestructive?: boolean };
type ProfileGroup = { title: string; items: ProfileItem[] };

export default function Profile() {
  const { data: profileObj, isLoading: loadingProfile } = useQuery<any>('/api/customer/profile/');
  const { data: walletObj, isLoading: loadingWallet } = useQuery<any>('/api/customer/wallet/');
  const router = useRouter();

  if (loadingProfile || loadingWallet) {
    return (
      <MobileShell showHeader={true} scroll={false}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#5c6f59" />
        </View>
      </MobileShell>
    );
  }

  const profile = profileObj || { first_name: 'Guest', email: 'guest@nearbyme.com' };
  const walletBalance = walletObj?.balance || '0.00';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const groups: ProfileGroup[] = [
    {
      title: "Activity",
      items: [
        { label: "Bookings", href: "/(tabs)/bookings" },
        { label: "Messages", href: "/messages" },
        { label: "Reviews", href: "/reviews" },
        { label: "Invoices", href: "/invoices" },
        { label: "Favourite therapists", href: "/favourites" },
      ],
    },
    {
      title: "Perks",
      items: [
        { label: "Wallet", href: "/wallet", hint: `₹${walletBalance}` },
        { label: "Rewards", href: "/rewards", hint: "1,420 pts" },
        { label: "Membership", href: "/memberships", hint: "Gold" },
        { label: "Packages", href: "/packages" },
        { label: "Gift cards", href: "/gift-cards" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Personal information", href: "/profile/personal" },
        { label: "Saved payment methods", href: "/profile/payments" },
        { label: "Preferences & privacy", href: "/profile/preferences" },
        { label: "Support", href: "/profile/support" },
      ],
    },
    {
      title: "App",
      items: [
        { label: "Log out", href: "#", onPress: handleLogout, isDestructive: true },
      ],
    }
  ];

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-6 px-5 pb-6 pt-2`}>
        {/* User Card */}
        <View style={tw`flex-row items-center gap-4`}>
          <View style={tw`flex h-16 w-16 items-center justify-center rounded-full bg-[#5c6f59]`}>
            <Text style={tw`text-lg font-bold text-white uppercase`}>
              {profile.first_name.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={tw`text-lg font-bold text-zinc-900`}>{profile.first_name} {profile.last_name}</Text>
            <Text style={tw`text-xs text-zinc-500`}>{profile.email}</Text>
          </View>
        </View>

        {/* Group Sections */}
        {groups.map((g) => (
          <View key={g.title} style={tw`gap-3`}>
            <Text style={tw`text-sm font-semibold uppercase tracking-wider text-zinc-400`}>
              {g.title}
            </Text>
            <View style={tw`overflow-hidden rounded-2xl bg-stone-100 border border-stone-200/40`}>
              {g.items.map((item, index) => {
                const isLast = index === g.items.length - 1;
                const textColor = item.isDestructive ? 'text-red-500' : 'text-zinc-800';
                
                const content = (
                  <View
                    style={tw`flex-row items-center justify-between p-4 ${!isLast ? "border-b border-stone-200/40" : ""
                      }`}
                  >
                    <Text style={tw`text-sm font-medium ${textColor}`}>{item.label}</Text>
                    <View style={tw`flex-row items-center gap-2`}>
                      {item.hint && <Text style={tw`text-xs font-semibold text-zinc-400`}>{item.hint}</Text>}
                      {!item.isDestructive && <ChevronRight size={16} color="#a1a1aa" />}
                      {item.isDestructive && <LogOut size={16} color="#ef4444" />}
                    </View>
                  </View>
                );

                if (item.onPress) {
                  return (
                    <TouchableOpacity key={item.label} onPress={item.onPress}>
                      {content}
                    </TouchableOpacity>
                  );
                }

                return (
                  <Link key={item.label} href={item.href as any} asChild>
                    <TouchableOpacity>{content}</TouchableOpacity>
                  </Link>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </MobileShell>
  );
}
