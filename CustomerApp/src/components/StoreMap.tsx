import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { toMapPoints, buildMapHtml, type MapStore } from "@/lib/mapHtml";

export function StoreMap({
  stores,
  height = 220,
  onSelectStore,
  center,
}: {
  stores: MapStore[];
  height?: number;
  onSelectStore?: (id: string) => void;
  /** Force the initial map view to this point (e.g. the user's picked city) instead of the store average. */
  center?: { lat: number; lng: number };
}) {
  const points = useMemo(() => toMapPoints(stores), [stores]);
  const html = useMemo(() => buildMapHtml(points, center), [points, center]);

  return (
    <View style={{ height, borderRadius: 24, overflow: "hidden" }}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data?.id && onSelectStore) onSelectStore(data.id);
          } catch {}
        }}
      />
    </View>
  );
}
