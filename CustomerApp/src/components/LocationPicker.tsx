import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, MapPin, LocateFixed } from "lucide-react-native";
import { ActivityIndicator, Modal, View, Text, TouchableOpacity, ScrollView, Pressable } from "react-native";
import tw from "twrnc";
import { LOCATIONS, useLocation, setLocation, detectCurrentLocation } from "@/lib/locationState";
import { alertMessage } from "@/lib/alert";
import { color, shadow } from "@/lib/theme";

export function LocationPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const current = useLocation();
  const [country, setCountry] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const close = () => {
    setCountry(null);
    onClose();
  };

  const useCurrentLocation = async () => {
    setDetecting(true);
    const result = await detectCurrentLocation();
    setDetecting(false);
    if (result.status === "granted") {
      close();
    } else if (result.status === "denied") {
      alertMessage("Location permission needed", "Enable location access in your device settings, or pick a city below.");
    } else {
      alertMessage("Couldn't detect your location", result.message || "Please pick a city below instead.");
    }
  };

  const activeCountry = LOCATIONS.find((c) => c.country === country);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={tw`flex-1 bg-black/45`} onPress={close} />
      <View style={{ ...tw`rounded-t-[28px] bg-white max-h-[75%]`, ...shadow.md }}>
        <View style={tw`w-9 h-1.5 rounded-full bg-stone-200 self-center mt-3`} />

        {/* Header */}
        <View style={tw`flex-row items-center justify-between px-5 pt-4 pb-3`}>
          <View style={tw`flex-row items-center gap-2`}>
            {activeCountry && (
              <TouchableOpacity onPress={() => setCountry(null)} hitSlop={8}>
                <ChevronLeft size={20} color={color.ink} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <Text style={tw`text-[18px] font-bold text-zinc-900`}>
              {activeCountry ? activeCountry.country : "Choose your location"}
            </Text>
          </View>
          <TouchableOpacity onPress={close} hitSlop={8}>
            <X size={20} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
          {!activeCountry && (
            <TouchableOpacity
              onPress={useCurrentLocation}
              disabled={detecting}
              activeOpacity={0.6}
              style={tw`flex-row items-center gap-2.5 py-4 border-b border-stone-100`}
            >
              {detecting ? (
                <ActivityIndicator size="small" color={color.sage} />
              ) : (
                <LocateFixed size={16} color={color.sage} strokeWidth={2} />
              )}
              <Text style={[tw`text-[15px] font-semibold`, { color: color.sage }]}>
                {detecting ? "Detecting your location…" : "Use my current location"}
              </Text>
            </TouchableOpacity>
          )}

          {!activeCountry &&
            LOCATIONS.map((c) => (
              <TouchableOpacity
                key={c.country}
                onPress={() => setCountry(c.country)}
                activeOpacity={0.6}
                style={tw`flex-row items-center justify-between py-4 border-b border-stone-100`}
              >
                <Text style={tw`text-[15px] font-medium text-zinc-800`}>{c.country}</Text>
                <ChevronRight size={16} color={color.ink3} strokeWidth={2} />
              </TouchableOpacity>
            ))}

          {activeCountry &&
            activeCountry.states.map((s) => (
              <View key={s.state} style={tw`mb-4`}>
                <Text style={[tw`text-[11px] font-semibold uppercase tracking-widest mb-1.5`, { color: color.sage }]}>
                  {s.state}
                </Text>
                {s.cities.map((city) => {
                  const active = current.city === city.name;
                  return (
                    <TouchableOpacity
                      key={city.name}
                      onPress={() => {
                        setLocation({ country: activeCountry.country, state: s.state, city: city.name, lat: city.lat, lng: city.lng });
                        close();
                      }}
                      activeOpacity={0.6}
                      style={tw`flex-row items-center justify-between py-3`}
                    >
                      <View style={tw`flex-row items-center gap-2.5`}>
                        <MapPin size={14} color={active ? color.sage : color.ink3} strokeWidth={2} />
                        <Text style={tw`text-[14px] ${active ? "font-semibold" : "font-medium"} text-zinc-800`}>{city.name}</Text>
                      </View>
                      {active && <Check size={16} color={color.sage} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
