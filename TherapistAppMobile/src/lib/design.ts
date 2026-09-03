import { Platform } from 'react-native';

// Shared brand system — mirrors CustomerApp's palette so both apps read as
// one product family. Warm neutrals + sage primary + terracotta accent,
// modelled on Apple HIG semantics (system grouped backgrounds, label tiers).
export const C = {
  // Backgrounds
  bg:       '#FAF9F6',   // warm sand — app background
  bgCard:   '#FFFFFF',
  bgSoft:   '#F2F0EA',   // warm stone — grouped/inset surfaces
  bgDark:   '#1C1B19',
  bgDark2:  '#292524',

  // Lines & borders
  line:     '#E8E4DA',
  lineDark: 'rgba(255,255,255,0.15)',

  // Text
  ink:      '#1C1B19',   // primary label
  ink2:     '#57534E',   // secondary label
  ink3:     '#A39E97',   // tertiary label / placeholder

  // On dark backgrounds
  inkD:     '#FFFFFF',
  inkD2:    '#D6D3CD',
  inkD3:    '#8C8780',

  // Sage — primary brand accent (shared with CustomerApp)
  blue:     '#5C6F59',   // primary
  blueMid:  '#46563F',   // pressed / emphasis
  blueLt:   '#EEF1EA',   // tint background
  bluePale: '#F6F7F4',   // faint tint background

  // Terracotta — secondary accent (ratings, highlights, tips)
  accent:   '#C06048',
  accentLt: '#F7EAE5',

  // Status (muted, editorial — not saturated system colors)
  ok:       '#3F7D58',
  okLt:     '#E6F1E9',
  warn:     '#B8763A',
  warnLt:   '#FBF1E4',
  err:      '#B54A3C',
  errLt:    '#FBEAE6',

  // Gold (tips, awards)
  gold:     '#A97C2F',
  goldLt:   '#F7ECD3',
};

// Radius scale — generous, consistent rounding (HIG-style continuous corners)
export const R = {
  xs:   10,
  sm:   14,
  md:   18,
  lg:   22,
  xl:   28,
  pill: 999,
};

export const T = {
  // Numbers
  heroNum:  { fontSize: 48, fontWeight: '700' as const, letterSpacing: -1.5, lineHeight: 52, color: C.ink },
  bigNum:   { fontSize: 34, fontWeight: '700' as const, letterSpacing: -1,   lineHeight: 40, color: C.ink },
  midNum:   { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5,lineHeight: 30, color: C.ink },

  // Headings
  h1:       { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.6, lineHeight: 34, color: C.ink },
  h2:       { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 26, color: C.ink },
  h3:       { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 22, color: C.ink },

  // Body
  body:     { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.1, lineHeight: 23, color: C.ink2 },
  bodySB:   { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.1, lineHeight: 22, color: C.ink },

  // Small
  caption:  { fontSize: 13, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 18, color: C.ink2 },
  capSB:    { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 18, color: C.ink2 },

  // Label (grouped-list section header)
  label:    { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, lineHeight: 14, color: C.ink3, textTransform: 'uppercase' as const },
  labelDk:  { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, lineHeight: 14, color: C.inkD3, textTransform: 'uppercase' as const },
};

export const E = {
  border: { borderWidth: 1, borderColor: C.line },

  // Subtle native shadows — soft and shallow, never glossy
  xs: Platform.select({
    ios:     { shadowColor: '#1C1B19', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2 },
    android: { elevation: 1 },
  }),
  sm: Platform.select({
    ios:     { shadowColor: '#1C1B19', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios:     { shadowColor: '#1C1B19', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16 },
    android: { elevation: 4 },
  }),

  focus: { borderColor: C.blue, borderWidth: 1.5 },
};

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const AVATAR_TONES = [
  { bg: '#EAEEE7', fg: '#3F4D3B' },
  { bg: '#F5EAE6', fg: '#8B4636' },
  { bg: '#F7F3EA', fg: '#7A6425' },
  { bg: '#F2F0EA', fg: '#57534E' },
];
export function avatarTone(name: string) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

export function status(s: string): { dot: string; label: string; bg: string; fg: string } {
  return ({
    CONFIRMED:   { dot: C.ok,   label: 'Confirmed',  bg: C.okLt,   fg: C.ok   },
    BOOKED:      { dot: C.blue, label: 'Booked',     bg: C.blueLt, fg: C.blueMid },
    COMPLETED:   { dot: C.ink3, label: 'Completed',  bg: C.bgSoft, fg: C.ink2 },
    CANCELLED:   { dot: C.err,  label: 'Cancelled',  bg: C.errLt,  fg: C.err  },
    IN_PROGRESS: { dot: C.warn, label: 'In progress',bg: C.warnLt, fg: C.warn },
    // Real AppointmentSlot statuses (lowercase, from apps/therapist_app)
    scheduled:   { dot: C.blue, label: 'Scheduled',  bg: C.blueLt, fg: C.blueMid },
    started:     { dot: C.warn, label: 'In progress',bg: C.warnLt, fg: C.warn },
    done:        { dot: C.ink3, label: 'Completed',  bg: C.bgSoft, fg: C.ink2 },
    cancelled:   { dot: C.err,  label: 'Cancelled',  bg: C.errLt,  fg: C.err  },
  } as any)[s] || { dot: C.ink3, label: s, bg: C.bgSoft, fg: C.ink3 };
}
