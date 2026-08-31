import { ChevronRight, LogOut, LogIn } from "lucide-react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { MobileShell } from "../../components/MobileShell";
import { Avatar } from "../../components/primitives";
import { useQuery } from "../../hooks/useFetch";
import { logout, getToken, formatINR } from "../../lib/api";
import { color, shadow } from "../../lib/theme";

type ProfileItem = { label: string; href: string; hint?: string; onPress?: () => void; isDestructive?: boolean };
type ProfileGroup = { title: string; items: ProfileItem[] };

export default function Profile() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const router = useRouter();

  // Re-check every time this tab gains focus — a guest may have just
  // finished the phone/OTP sheet from somewhere else in the app.
  useFocusEffect(useCallback(() => {
    getToken().then((t) => setIsAuthed(!!t));
  }, []));

  const { data: profileObj, isLoading: loadingProfile } = useQuery<any>('/api/customer/profile/', !!isAuthed);
  const { data: walletObj, isLoading: loadingWallet } = useQuery<any>('/api/customer/wallet/', !!isAuthed);
  const { data: memObj } = useQuery<any>('/api/customer/memberships/', !!isAuthed);

  if (isAuthed === null || (isAuthed && (loadingProfile || loadingWallet))) {
    return (
      <MobileShell showHeader={true} scroll={false}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={color.sage} />
        </View>
      </MobileShell>
    );
  }

  const profile = profileObj || { first_name: 'Guest', last_name: '', email: '' };
  const walletBalance = walletObj?.balance || '0.00';
  const points = profile.loyalty_points ?? 0;
  const memberships = memObj?.results || (Array.isArray(memObj) ? memObj : []);
  const activeMembership = memberships.find((m: any) => m.is_active);

  const handleLogout = async () => {
    await logout();
    setIsAuthed(false);
  };

  const groups: ProfileGroup[] = isAuthed ? [
    {
      title: "Activity",
      items: [
        { label: "Bookings", href: "/(tabs)/bookings" },
        { label: "Messages", href: "/messages" },
        { label: "Reviews", href: "/reviews" },
        { label: "Invoices", href: "/invoices" },
        { label: "Favourite therapists", href: "/favourites" },
        { label: "Saved salons", href: "/saved-salons" },
      ],
    },
    {
      title: "Perks",
      items: [
        { label: "Wallet", href: "/wallet", hint: formatINR(walletBalance) },
        { label: "Rewards", href: "/rewards", hint: `${points.toLocaleString("en-IN")} pts` },
        { label: "Membership", href: "/memberships", hint: activeMembership?.tier_name || "None" },
        { label: "Packages", href: "/packages" },
        { label: "Gift cards", href: "/gift-cards" },
        { label: "Refer a friend", href: "/referral" },
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
  ] : [];

  return (
    <MobileShell showHeader={true} scroll={true}>
      <View style={tw`gap-y-7 px-5 pb-6 pt-1`}>
        {/* User Card */}
        {isAuthed ? (
          <View style={tw`flex-row items-center gap-4`}>
            <Avatar name={profile.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Demo User"} size={64} />
            <View>
              <Text style={tw`text-[19px] font-bold text-zinc-900`}>
                {profile.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Demo User"}
              </Text>
              <Text style={tw`text-[13px] text-zinc-500 mt-0.5`}>
                {profile.email?.includes("@phone.nearbyme.local") 
                  ? `+91 ${profile.email.split("@")[0].replace(/^91/, "")}` 
                  : profile.email}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ ...tw`flex-row items-center justify-between rounded-3xl bg-white border border-stone-100 p-5`, ...shadow.xs }}>
            <View style={tw`flex-1 pr-3`}>
              <Text style={tw`text-[16px] font-bold text-zinc-900 mb-1`}>You're browsing as a guest</Text>
              <Text style={tw`text-[13px] text-zinc-500`}>Sign in with your phone to book, message, and save favourites.</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
              style={[tw`flex-row items-center gap-1.5 rounded-full px-4 py-2.5`, { backgroundColor: color.sage }]}
            >
              <LogIn size={14} color="#fff" strokeWidth={2} />
              <Text style={tw`text-white text-[13px] font-semibold`}>Sign in</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Group Sections */}
        {groups.map((g) => (
          <View key={g.title} style={tw`gap-3`}>
            <Text style={tw`text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-1`}>
              {g.title}
            </Text>
            <View style={{ ...tw`overflow-hidden rounded-3xl bg-white border border-stone-100`, ...shadow.xs }}>
              {g.items.map((item, index) => {
                const isLast = index === g.items.length - 1;
                const textColor = item.isDestructive ? { color: color.terracotta } : tw`text-zinc-800`;

                const content = (
                  <View
                    style={tw`flex-row items-center justify-between px-4 py-4 ${!isLast ? "border-b border-stone-100" : ""}`}
                  >
                    <Text style={[tw`text-[14px] font-medium`, textColor]}>{item.label}</Text>
                    <View style={tw`flex-row items-center gap-2`}>
                      {item.hint && <Text style={tw`text-[12px] font-semibold text-zinc-400`}>{item.hint}</Text>}
                      {!item.isDestructive && <ChevronRight size={16} color={color.ink3} strokeWidth={2} />}
                      {item.isDestructive && <LogOut size={16} color={color.terracotta} strokeWidth={2} />}
                    </View>
                  </View>
                );

                if (item.onPress) {
                  return (
                    <TouchableOpacity key={item.label} onPress={item.onPress} activeOpacity={0.6}>
                      {content}
                    </TouchableOpacity>
                  );
                }

                return (
                  <Link key={item.label} href={item.href as any} asChild>
                    <TouchableOpacity activeOpacity={0.6}>{content}</TouchableOpacity>
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
