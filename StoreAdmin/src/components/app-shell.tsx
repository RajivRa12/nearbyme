import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@/hooks/useFetch';
import { api } from '@/lib/api';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Users,
  UserCog,
  Package,
  Megaphone,
  LineChart,
  ClipboardList,
  BadgePercent,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Bell,
  ShoppingCart,
  CalendarClock,
  Search,
  ChevronDown,
  Scissors,
  CalendarPlus,
  Wallet,
  Armchair,
  Percent,
  UserCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Target,
  Truck,
  HandCoins,
  Gift,
  MessageSquare,
  Hourglass,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Item = { title: string; url: string; icon: any };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Operations",
    items: [
      { title: "New Booking", url: "/bookings/new", icon: CalendarPlus },
      { title: "POS", url: "/pos", icon: ShoppingCart },
      { title: "Calendar", url: "/calendar", icon: CalendarClock },
      { title: "Appointments", url: "/appointments", icon: Calendar },
      { title: "Queue", url: "/queue", icon: Hourglass },
      { title: "Waitlist", url: "/waitlist", icon: ClipboardList },
      { title: "Billing", url: "/billing", icon: Receipt },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Staff", url: "/staff", icon: UserCog },
      { title: "Professionals", url: "/staff/professionals", icon: Scissors },
      { title: "Resources", url: "/staff/resources", icon: Armchair },
      { title: "Commission Rules", url: "/staff/commission-rules", icon: Percent },
      { title: "Attendance", url: "/staff/attendance", icon: ShieldCheck },
      { title: "Leaves", url: "/staff/leaves", icon: ClipboardList },
      { title: "Payroll", url: "/staff/payroll", icon: Receipt },
      { title: "Targets", url: "/staff/targets", icon: Target },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Products", url: "/inventory/products", icon: Package },
      { title: "Purchase Orders", url: "/inventory/purchase-orders", icon: ClipboardList },
      { title: "Vendors", url: "/inventory/vendors", icon: Truck },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Expenses", url: "/finance/expenses", icon: HandCoins },
      { title: "Gift Cards", url: "/finance/gift-cards", icon: Gift },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Campaigns", url: "/marketing/campaigns", icon: Megaphone },
      { title: "Coupons", url: "/marketing/coupons", icon: BadgePercent },
      { title: "Memberships", url: "/marketing/memberships", icon: ShieldCheck },
      { title: "Membership Plans", url: "/marketing/membership-plans", icon: Wallet },
      { title: "Packages", url: "/marketing/package-plans", icon: Package },
    ],
  },
  {
    label: "Engagement",
    items: [
      { title: "Feed", url: "/feed", icon: Megaphone },
      { title: "Conversations", url: "/conversations", icon: MessageSquare },
    ],
  },
];

type NotificationItem = { id: string; type: string; title: string; subtitle: string; link: string };
type SearchResult = { id: string; type: string; title: string; subtitle: string; link: string };

function notificationIcon(type: string) {
  if (type === "low_stock") return AlertTriangle;
  if (type === "unpaid_invoice") return Receipt;
  if (type === "leave_pending") return ClipboardList;
  if (type === "new_booking") return CalendarPlus;
  return Bell;
}
function searchResultIcon(type: string) {
  if (type === "customer") return Users;
  if (type === "invoice") return Receipt;
  if (type === "professional") return Scissors;
  return Search;
}

function TopNav() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const initials = (
    fullName
      ? `${String(user?.first_name ?? "")[0] ?? ""}${String(user?.last_name ?? "")[0] ?? ""}`
      : (user?.email ?? "SA").slice(0, 2)
  ).toUpperCase();
  const isActive = (url: string) => url === "/" ? path === "/" : path === url || path.startsWith(url + "/");

  const notificationsQ = useQuery({
    queryKey: ["/api/erp/notifications/"],
    queryFn: () => api<{ data: { count: number; items: NotificationItem[] } }>("/api/erp/notifications/"),
  });
  const notifications = notificationsQ.data?.data?.items ?? [];
  const notificationCount = notificationsQ.data?.data?.count ?? 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await api<{ data: { results: SearchResult[] } }>(`/api/erp/search/?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data.results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  function goToResult(link: string) {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    navigate(link);
  }

  return (
    <header className="h-16 flex items-center justify-between border-b/50 px-4 md:px-8 sticky top-0 bg-background/70 backdrop-blur-xl z-50 shadow-[0_1px_3px_0_rgb(0,0,0,0.02)]">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight hidden lg:block text-primary">Nearbyme</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Button asChild variant={isActive("/") ? "secondary" : "ghost"} size="sm" className="text-sm font-medium">
            <Link to="/"><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</Link>
          </Button>
          
          {groups.map(g => (
            <DropdownMenu key={g.label}>
              <DropdownMenuTrigger asChild>
                <Button variant={g.items.some(i => isActive(i.url)) ? "secondary" : "ghost"} size="sm" className="text-sm font-medium">
                  {g.label} <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {g.items.map(item => (
                  <DropdownMenuItem key={item.url} asChild>
                    <Link to={item.url} className={`w-full cursor-pointer ${isActive(item.url) ? "bg-muted" : ""}`}>
                      <item.icon className="h-4 w-4 mr-2 text-muted-foreground" /> {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
          
          <Button asChild variant={isActive("/reports/financial") ? "secondary" : "ghost"} size="sm" className="text-sm font-medium">
            <Link to="/reports/financial"><LineChart className="h-4 w-4 mr-2" /> Reports</Link>
          </Button>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden xl:block w-64 mr-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search customers, invoices, staff…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => {
              searchBlurTimeout.current = setTimeout(() => setSearchOpen(false), 150);
            }}
            className="pl-8 h-9 bg-muted/30 border-muted/50 focus-visible:bg-background transition-colors rounded-full"
          />
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full mt-1 w-full rounded-lg border bg-popover shadow-md z-50 overflow-hidden">
              {searchLoading ? (
                <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching…
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No results for "{searchQuery}"</div>
              ) : (
                <div className="max-h-80 overflow-y-auto py-1">
                  {searchResults.map((r) => {
                    const Icon = searchResultIcon(r.type);
                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToResult(r.link)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>


        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="rounded-full">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 text-[10px] flex items-center justify-center rounded-full bg-destructive border-background border-2">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {notificationsQ.isLoading ? (
                <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  You're all caught up.
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = notificationIcon(n.type);
                  return (
                    <DropdownMenuItem key={n.id} asChild>
                      <Link to={n.link} className="flex items-start gap-2.5 cursor-pointer">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{n.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{n.subtitle}</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2 gap-1 rounded-full bg-muted/30 hover:bg-muted/50">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-medium shadow-sm">
                {initials}
              </div>
              <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{fullName || "Store Admin"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="w-full cursor-pointer">
                <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" /> Profile & Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppShell({ children }: { title?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-slate-50/50 dark:bg-background selection:bg-primary/20 flex flex-col font-sans">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none fixed" />
      <TopNav />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full relative z-0 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
        {children}
      </main>
    </div>
  );
}
