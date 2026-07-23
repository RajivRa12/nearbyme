import { useLocation, Link } from 'react-router-dom';
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
  Store,
  LogOut,
  Sun,
  Moon,
  Bell,
  ShoppingCart,
  CalendarClock,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Item = { title: string; url: string; icon: any };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Revenue", url: "/reports/financial", icon: LineChart },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "New Sale (POS)", url: "/pos", icon: ShoppingCart },
      { title: "Calendar", url: "/calendar", icon: CalendarClock },
      { title: "Appointments", url: "/appointments", icon: Calendar },
      { title: "Waitlist", url: "/waitlist", icon: ClipboardList },
      { title: "Billing", url: "/billing", icon: Receipt },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Staff", url: "/staff", icon: UserCog },
      { title: "Attendance", url: "/staff/attendance", icon: ShieldCheck },
      { title: "Leaves", url: "/staff/leaves", icon: ClipboardList },
      { title: "Payroll", url: "/staff/payroll", icon: Receipt },
      { title: "Commissions", url: "/staff/commissions", icon: BadgePercent },
      { title: "Leaderboard", url: "/staff/leaderboard", icon: LineChart },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Products", url: "/inventory/products", icon: Package },
      { title: "Vendors", url: "/inventory/vendors", icon: Store },
      { title: "Purchase Orders", url: "/inventory/purchase-orders", icon: ClipboardList },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Campaigns", url: "/marketing/campaigns", icon: Megaphone },
      { title: "Coupons", url: "/marketing/coupons", icon: BadgePercent },
      { title: "Memberships", url: "/marketing/memberships", icon: ShieldCheck },
    ],
  },
];

function AppSidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();
  const isActive = (url: string) =>
    url === "/" ? path === "/" : path === url || path.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Store Admin</span>
            <span className="text-xs text-muted-foreground truncate max-w-[10rem]">
              {user?.email ?? "Signed in"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" size="sm" className="justify-start" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function TopBar() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const initials = (user?.email ?? "SA").slice(0, 2).toUpperCase();

  return (
    <header className="h-14 flex items-center gap-2 border-b px-3 sticky top-0 bg-background/80 backdrop-blur z-10">
      <SidebarTrigger />
      <div className="relative hidden md:block flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers, invoices, staff…" className="pl-8 h-9" />
      </div>
      <div className="flex-1 md:hidden" />
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link to="/pos">
          <ShoppingCart className="h-4 w-4 mr-1" /> New Sale
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 text-[10px] flex items-center justify-center">3</Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex-col items-start gap-0.5">
            <span className="text-sm">Low stock: Hair Serum</span>
            <span className="text-xs text-muted-foreground">3 units remaining</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex-col items-start gap-0.5">
            <span className="text-sm">Invoice #102 pending</span>
            <span className="text-xs text-muted-foreground">Isha Patel · ₹1,800</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex-col items-start gap-0.5">
            <span className="text-sm">New booking: Neha Gupta</span>
            <span className="text-xs text-muted-foreground">Hair Color · 2:00 PM</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 px-2 gap-2">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-medium">
              {initials}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm">Store Admin</div>
            <div className="text-xs text-muted-foreground truncate max-w-[14rem]">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AppShell({ children }: { title?: string; children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
