function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function distanceOrInfinity(loc: string | null | undefined, center: { lat: number; lng: number }): number {
  if (!loc) return Infinity;
  const [latStr, lngStr] = loc.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return Infinity;
  return haversineKm({ lat, lng }, center);
}

/** Sort stores nearest-first to the given point (e.g. the user's picked location). */
export function sortByDistance<T extends { location?: string | null }>(
  stores: T[],
  center: { lat: number; lng: number }
): T[] {
  return [...stores].sort((a, b) => distanceOrInfinity(a.location, center) - distanceOrInfinity(b.location, center));
}
