import { type ReactNode } from "react";
import { Link, router } from "expo-router";
import { ChevronLeft, Star } from "lucide-react-native";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import tw from "twrnc";

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
      <Text style={tw`text-base font-semibold tracking-tight text-zinc-900`}>{title}</Text>
      {action && actionHref && (
        <Link href={actionHref as any} asChild>
          <TouchableOpacity>
            <Text style={tw`text-xs font-semibold text-[#5c6f59]`}>{action}</Text>
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
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={tw`flex-row items-start justify-between gap-3 px-5 pt-4 pb-2`}>
      <View style={tw`flex-row items-start gap-2 flex-1`}>
        {back && (
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel="Back"
            style={tw`mt-1 flex h-9 w-9 -translate-x-2 items-center justify-center rounded-full bg-stone-100`}
          >
            <ChevronLeft size={20} color="#27272a" strokeWidth={1.6} />
          </TouchableOpacity>
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-semibold tracking-tight text-zinc-900 leading-tight`}>{title}</Text>
          {subtitle && <Text style={tw`mt-1 text-sm text-zinc-500`}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

export function Rating({ value }: { value: number }) {
  return (
    <View style={tw`flex-row items-center gap-1`}>
      <Star size={12} color="#c06048" fill="#c06048" strokeWidth={0} />
      <Text style={tw`text-xs font-semibold text-zinc-800`}>{value.toFixed(1)}</Text>
    </View>
  );
}

export function Chip({ children, tone = "sand" }: { children: ReactNode; tone?: "sand" | "sage" | "terracotta" }) {
  const tones = {
    sand: "bg-stone-200/60 text-zinc-700",
    sage: "bg-[#5c6f59] text-white",
    terracotta: "bg-[#c06048]/10 text-[#c06048]",
  } as const;

  const textTones = {
    sand: "text-zinc-700",
    sage: "text-white",
    terracotta: "text-[#c06048]",
  };

  return (
    <View style={tw`rounded-full px-3 py-1 ${tones[tone]}`}>
      <Text style={tw`text-[11px] font-semibold ${textTones[tone]}`}>{children}</Text>
    </View>
  );
}

export function StickyBottomBar({ children }: { children: ReactNode }) {
  return (
    <View style={tw`absolute bottom-0 left-0 right-0 border-t border-black/5 bg-[#faf9f6]/95 px-5 pb-${Platform.OS === 'ios' ? '8' : '4'} pt-3`}>
      <View style={tw`flex-row items-center gap-3`}>
        {children}
      </View>
    </View>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onClick}
      disabled={disabled}
      style={tw`flex-1 h-12 items-center justify-center rounded-2xl bg-[#5c6f59] ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <Text style={tw`text-sm font-semibold text-white`}>{children}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onClick}
      disabled={disabled}
      style={tw`flex-1 h-12 items-center justify-center rounded-2xl border border-[#5c6f59] bg-transparent ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <Text style={tw`text-sm font-semibold text-[#5c6f59]`}>{children}</Text>
    </TouchableOpacity>
  );
}

export function ListRow({
  label,
  value,
  href,
  onClick,
}: {
  label: string;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <View style={tw`flex-row items-center justify-between w-full px-5 py-4 border-b border-stone-200/40`}>
      <Text style={tw`text-sm font-medium text-zinc-800`}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={tw`text-sm text-zinc-500`}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );

  if (href) {
    return (
      <Link href={href as any} asChild>
        <TouchableOpacity>{inner}</TouchableOpacity>
      </Link>
    );
  }
  return (
    <TouchableOpacity onPress={onClick} disabled={!onClick}>
      {inner}
    </TouchableOpacity>
  );
}

