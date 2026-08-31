import { type ReactNode } from "react";
import { Link } from "expo-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react-native";
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { color, shadow, avatarTone } from "@/lib/theme";
import { goBack } from "@/lib/nav";

export function SectionHeader({
  title,
  action,
  actionHref,
}: {
  title: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <View style={tw`flex-row items-center justify-between px-5`}>
      <Text style={tw`text-[17px] font-semibold tracking-tight text-zinc-900`}>{title}</Text>
      {action && actionHref && (
        <Link href={actionHref as any} asChild>
          <TouchableOpacity hitSlop={8}>
            <Text style={[tw`text-[13px] font-semibold`, { color: color.sage }]}>{action}</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  back = true,
  right,
  large = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  /** HIG large-title style: bigger, bolder, more top breathing room */
  large?: boolean;
}) {
  return (
    <View style={tw`flex-row items-start justify-between gap-3 px-5 pt-3 pb-2`}>
      <View style={tw`flex-row items-start gap-1 flex-1`}>
        {back && (
          <TouchableOpacity
            onPress={() => goBack()}
            accessibilityLabel="Back"
            hitSlop={6}
            style={tw`mt-1 flex h-9 w-9 -translate-x-2 items-center justify-center rounded-full bg-stone-100`}
          >
            <ChevronLeft size={20} color={color.ink} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
        <View style={tw`flex-1`}>
          <Text
            style={tw`${large ? "text-[32px]" : "text-[22px]"} font-bold tracking-tight text-zinc-900 leading-tight`}
          >
            {title}
          </Text>
          {subtitle && <Text style={tw`mt-1 text-[14px] text-zinc-500`}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

export function Rating({ value }: { value: number }) {
  return (
    <View style={tw`flex-row items-center gap-1`}>
      <Star size={12} color={color.terracotta} fill={color.terracotta} strokeWidth={0} />
      <Text style={tw`text-[12px] font-semibold text-zinc-800`}>{value.toFixed(1)}</Text>
    </View>
  );
}

export function Chip({ children, tone = "sand" }: { children: ReactNode; tone?: "sand" | "sage" | "terracotta" }) {
  const styles = {
    sand: { bg: tw`bg-stone-200/60`, text: tw`text-zinc-700` },
    sage: { bg: { backgroundColor: color.sage }, text: tw`text-white` },
    terracotta: { bg: { backgroundColor: color.terracottaTint }, text: { color: color.terracotta } },
  } as const;

  return (
    <View style={[tw`rounded-full px-3 py-1`, styles[tone].bg]}>
      <Text style={[tw`text-[11px] font-semibold`, styles[tone].text]}>{children}</Text>
    </View>
  );
}

/** Elevated content surface — the base building block for cards throughout the app. */
export function Card({
  children,
  onPress,
  href,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  href?: string;
  style?: any;
  padded?: boolean;
}) {
  const inner = (
    <View
      style={[
        tw`rounded-3xl bg-white border border-stone-100 ${padded ? "p-4" : ""}`,
        shadow.xs,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (href) {
    return (
      <Link href={href as any} asChild>
        <TouchableOpacity activeOpacity={0.8}>{inner}</TouchableOpacity>
      </Link>
    );
  }
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const tone = avatarTone(name || "?");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: "700", color: tone.fg }}>
        {(name || "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function IconButton({
  children,
  onPress,
  tone = "light",
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: "light" | "translucent";
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={6}
      activeOpacity={0.75}
      style={tw`flex h-10 w-10 items-center justify-center rounded-full ${
        tone === "translucent" ? "bg-white/85" : "bg-stone-100"
      }`}
    >
      {children}
    </TouchableOpacity>
  );
}

/** Two-way (or N-way) pill toggle — segmented control per HIG. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={tw`flex-row rounded-full bg-stone-100 p-1`}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            style={[
              tw`flex-1 rounded-full py-2 items-center`,
              active && { backgroundColor: "#fff", ...shadow.xs },
            ]}
          >
            <Text style={tw`text-[13px] font-semibold ${active ? "text-zinc-900" : "text-zinc-500"}`}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Dependency-free bottom scrim for text-over-photo compositions — a smooth
 * fade (not a hard-edged block) built from stacked translucent bands.
 */
const SCRIM_BANDS = [0, 0.03, 0.08, 0.16, 0.27, 0.4, 0.54, 0.68];

export function PhotoScrim({ height = "62%" }: { height?: string | number }) {
  return (
    <View style={[tw`absolute inset-x-0 bottom-0`, { height }]} pointerEvents="none">
      {SCRIM_BANDS.map((op, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(12,10,8,${op})` }} />
      ))}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={tw`items-center justify-center gap-2 rounded-3xl bg-stone-50 px-6 py-12`}>
      {icon}
      <Text style={tw`text-[15px] font-semibold text-zinc-700 mt-1`}>{title}</Text>
      {subtitle && <Text style={tw`text-[13px] text-zinc-500 text-center leading-relaxed`}>{subtitle}</Text>}
    </View>
  );
}

export function StickyBottomBar({ children }: { children: ReactNode }) {
  return (
    <View
      style={tw`absolute bottom-0 left-0 right-0 border-t border-black/[0.06] bg-[#faf9f6]/97 px-5 pb-${
        Platform.OS === "ios" ? "8" : "4"
      } pt-3`}
    >
      <View style={tw`flex-row items-center gap-3`}>{children}</View>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  onClick,
  disabled,
  loading,
  className = "",
  ...props
}: {
  children: ReactNode;
  onPress?: (e: any) => void;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return (
    <TouchableOpacity
      {...props}
      onPress={onPress || onClick}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={{
        ...tw`flex-1 items-center justify-center rounded-2xl ${disabled ? "opacity-40" : ""} ${className}`,
        backgroundColor: color.sage,
        height: 52,
      }}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-[15px] font-semibold text-white`}>{children}</Text>}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  children,
  onPress,
  onClick,
  disabled,
  className = "",
  ...props
}: {
  children: ReactNode;
  onPress?: (e: any) => void;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return (
    <TouchableOpacity
      {...props}
      onPress={onPress || onClick}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        ...tw`flex-1 items-center justify-center rounded-2xl border bg-transparent ${disabled ? "opacity-40" : ""} ${className}`,
        borderColor: color.sage,
        height: 52,
      }}
    >
      <Text style={[tw`text-[15px] font-semibold`, { color: color.sage }]}>{children}</Text>
    </TouchableOpacity>
  );
}

export function ListRow({
  label,
  value,
  href,
  onClick,
  showChevron,
}: {
  label: string;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  showChevron?: boolean;
}) {
  const chevron = showChevron ?? !!(href || onClick);
  const inner = (
    <View style={tw`flex-row items-center justify-between w-full px-5 py-4 border-b border-stone-200/50`}>
      <Text style={tw`text-[15px] font-medium text-zinc-800`}>{label}</Text>
      <View style={tw`flex-row items-center gap-1.5`}>
        {typeof value === "string" || typeof value === "number" ? (
          <Text style={tw`text-[14px] text-zinc-500`}>{value}</Text>
        ) : (
          value
        )}
        {chevron && <ChevronRight size={16} color={color.ink3} strokeWidth={2} />}
      </View>
    </View>
  );

  if (href) {
    return (
      <Link href={href as any} asChild>
        <TouchableOpacity activeOpacity={0.6}>{inner}</TouchableOpacity>
      </Link>
    );
  }
  return (
    <TouchableOpacity onPress={onClick} disabled={!onClick} activeOpacity={0.6}>
      {inner}
    </TouchableOpacity>
  );
}
