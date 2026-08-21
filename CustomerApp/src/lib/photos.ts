// Curated, verified-working stock photography for salon/spa/barber content.
// Used as placeholder imagery until real venue photos are uploaded.
const SALON_PHOTOS = [
  "https://images.unsplash.com/photo-1560066984-138dadb4c035", // salon interior
  "https://images.unsplash.com/photo-1633681926035-ec1ac984418a", // luxury salon interior
  "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1", // spa lounge
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70", // barber shop interior
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e", // hair styling
  "https://images.unsplash.com/photo-1562322140-8baeececf3df", // blow dry
  "https://images.unsplash.com/photo-1580618672591-eb180b1a973f", // blow dry styling
  "https://images.unsplash.com/photo-1560750588-73207b1ef5b8", // hair wash
  "https://images.unsplash.com/photo-1610992015732-2449b76344bc", // manicure
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1", // barber shave
  "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8", // foot spa
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35", // hot stone massage
] as const;

function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return Math.abs(h);
}

/** Deterministic photo assignment so the same store always shows the same photo. */
export function photoForId(id: string | number, width = 800): string {
  const base = SALON_PHOTOS[hash(String(id)) % SALON_PHOTOS.length];
  return `${base}?w=${width}&auto=format&fit=crop&q=80`;
}
