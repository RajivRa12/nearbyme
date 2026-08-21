import { useEffect, useMemo } from "react";
import { View } from "react-native";
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

  useEffect(() => {
    if (!onSelectStore) return;
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.id) onSelectStore(data.id);
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSelectStore]);

  return (
    <View style={{ height, borderRadius: 24, overflow: "hidden" }}>
      {/* @ts-ignore - plain DOM element, web-only file */}
      <iframe srcDoc={html} style={{ border: 0, width: "100%", height: "100%" }} title="Store map" />
    </View>
  );
}
