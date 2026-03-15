import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Wrench,
  ClipboardList,
  DollarSign,
  Megaphone,
  Phone,
  UserCog,
  Wallet,
  Briefcase,
  Receipt,
  MapPin,
  BarChart3,
  Navigation,
  Tag,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
const cseLogo = "/cse-logo.png";

interface AppSidebarProps {
  role: "admin" | "dispatcher" | "technician" | "salesperson";
  username: string;
  userId?: string;
  onLogout: () => void;
}

const adminMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Quotes", url: "/quotes", icon: Receipt },
  { title: "Technician Map", url: "/map", icon: MapPin },
  { title: "Outreach", url: "/outreach", icon: Megaphone },
  { title: "Technicians", url: "/technicians", icon: Wrench },
  { title: "Quote Templates", url: "/quote-templates", icon: FileText },
  { title: "Pricebook", url: "/pricebook", icon: Tag },
  { title: "Marketing ROI", url: "/marketing", icon: TrendingUp },
  { title: "Payroll", url: "/payroll", icon: Wallet },
];

const dispatcherMenuItems = [
  { title: "Dispatch Center", url: "/", icon: LayoutDashboard },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Quotes", url: "/quotes", icon: Receipt },
  { title: "Technician Map", url: "/map", icon: MapPin },
  { title: "Staffing Pool", url: "/staffing", icon: UserCog },
  { title: "Calls", url: "/calls", icon: Phone },
  { title: "Messages", url: "/chat", icon: MessageSquare },
  { title: "Leads", url: "/leads", icon: Users },
];

const techMenuItems = [
  { title: "My Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Quote Tool", url: "/quote", icon: FileText },
  { title: "Messages", url: "/chat", icon: MessageSquare },
  { title: "Earnings", url: "/earnings", icon: DollarSign },
];

const salesMenuItems = [
  { title: "My Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Quotes", url: "/quotes", icon: Receipt },
  { title: "Quote Tool", url: "/quote", icon: FileText },
  { title: "Location Tracking", url: "/location", icon: Navigation },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Commissions", url: "/earnings", icon: DollarSign },
];

export default function AppSidebar({ role, username, userId, onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  const menuItems = role === "admin" 
    ? adminMenuItems 
    : role === "dispatcher" 
      ? dispatcherMenuItems 
      : role === "salesperson"
        ? salesMenuItems
        : techMenuItems;

  // Fetch unread chat count for dispatcher/technician roles
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/chat/unread-count', userId],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      const res = await fetch('/api/chat/unread-count', { headers });
      if (!res.ok) return { unreadCount: 0 };
      return res.json();
    },
    enabled: (role === 'dispatcher' || role === 'technician') && !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadData?.unreadCount || 0;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={cseLogo} 
            alt="Emergency Chicago Sewer Experts" 
            className="w-14 h-14 object-contain rounded"
            data-testid="img-cse-logo"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm tracking-wide truncate">Emergency Chicago</h2>
            <p className="text-xs text-muted-foreground">Sewer Experts CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider">
            {role === "admin" ? "Administration" : role === "dispatcher" ? "Dispatch Operations" : role === "salesperson" ? "Sales Portal" : "Technician Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.title === "Messages" && unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 min-w-5 px-1.5 text-xs font-bold"
                          data-testid="badge-unread-messages"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase text-xs tracking-wider">
              System
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/settings"}>
                    <Link href="/settings" data-testid="nav-settings">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{username}</p>
            <Badge variant="secondary" className="text-xs capitalize mt-0.5">
              {role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="shrink-0"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
