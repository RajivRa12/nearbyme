// Shared brand tokens — same values as TherapistAppMobile/src/lib/design.ts
// so the Customer and Professional apps read as one product family.
// Warm neutrals + sage primary + terracotta accent, HIG-flavoured spacing.

export const color = {
  // Backgrounds
  bg: "#FAF9F6",
  bgCard: "#FFFFFF",
  bgSoft: "#F2F0EA",

  // Lines
  line: "#E8E4DA",

  // Text
  ink: "#1C1B19",
  ink2: "#57534E",
  ink3: "#A39E97",

  // Sage — primary
  sage: "#5C6F59",
  sageDark: "#46563F",
  sageTint: "#EEF1EA",

  // Terracotta — accent
  terracotta: "#C06048",
  terracottaTint: "#F7EAE5",

  // Status
  ok: "#3F7D58",
  okTint: "#E6F1E9",
  warn: "#B8763A",
  warnTint: "#FBF1E4",
  err: "#B54A3C",
  errTint: "#FBEAE6",

  gold: "#A97C2F",
  goldTint: "#F7ECD3",
} as const;

export const radius = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Subtle native shadows — soft and shallow, never glossy.
export const shadow = {
  xs: { shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  md: { shadowColor: "#1C1B19", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
} as const;

const AVATAR_TONES = [
  { bg: "#EAEEE7", fg: "#3F4D3B" },
  { bg: "#F5EAE6", fg: "#8B4636" },
  { bg: "#F7F3EA", fg: "#7A6425" },
  { bg: "#F2F0EA", fg: "#57534E" },
] as const;

export function avatarTone(name: string) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}
