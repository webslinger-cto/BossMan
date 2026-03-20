import { useState, useLayoutEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Eye, User, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";
import AppSidebar from "@/components/AppSidebar";
import LoginPage from "@/components/LoginPage";
import PasswordSetupPage from "@/components/PasswordSetupPage";

import AdminDashboard from "@/pages/AdminDashboard";
import LeadsPage from "@/pages/LeadsPage";
import TechniciansPage from "@/pages/TechniciansPage";
import PayrollPage from "@/pages/PayrollPage";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import QuotePage from "@/pages/QuotePage";
import DispatcherDashboard from "@/pages/DispatcherDashboard";
import StaffingPool from "@/pages/StaffingPool";
import SettingsPage from "@/pages/SettingsPage";
import QuoteTemplatesPage from "@/pages/QuoteTemplatesPage";
import JobsPage from "@/pages/JobsPage";
import QuotesPage from "@/pages/QuotesPage";
import OperationsMenuPage from "@/pages/OperationsMenuPage";
import TechnicianMapPage from "@/pages/TechnicianMapPage";
import PricebookPage from "@/pages/PricebookPage";
import EarningsPage from "@/pages/EarningsPage";
import DispatchChatPage from "@/pages/DispatchChatPage";
import TechnicianChatPage from "@/pages/TechnicianChatPage";
import NotFound from "@/pages/not-found";
import PublicQuotePage from "@/pages/PublicQuotePage";
import SmsOptInPage from "@/pages/SmsOptInPage";

interface AuthState {
  isAuthenticated: boolean;
  role: "admin" | "dispatcher" | "technician" | null;
  username: string;
  userId: string;
  technicianId: string | null;
  fullName: string;
  requiresPasswordSetup: boolean;
  isSuperAdmin: boolean;
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/technicians" component={TechniciansPage} />
      <Route path="/map" component={TechnicianMapPage} />
      <Route path="/quote-templates" component={QuoteTemplatesPage} />
      <Route path="/pricebook" component={PricebookPage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/operations">{() => <OperationsMenuPage role="admin" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function DispatcherRouter({ userId, fullName }: { userId: string; fullName: string }) {
  return (
    <Switch>
      <Route path="/">{() => <DispatcherDashboard userId={userId} />}</Route>
      <Route path="/jobs" component={JobsPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/map" component={TechnicianMapPage} />
      <Route path="/staffing" component={StaffingPool} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/chat">{() => <DispatchChatPage userId={userId} fullName={fullName} />}</Route>
      <Route path="/operations">{() => <OperationsMenuPage role="dispatcher" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function TechnicianRouter({ technicianId, userId, fullName }: { technicianId: string; userId: string; fullName: string }) {
  return (
    <Switch>
      <Route path="/">
        {() => <TechnicianDashboard technicianId={technicianId} userId={userId} fullName={fullName} />}
      </Route>
      <Route path="/quote" component={QuotePage} />
      <Route path="/chat">
        {() => <TechnicianChatPage technicianId={technicianId} userId={userId} fullName={fullName} />}
      </Route>
      <Route path="/earnings">
        {() => <EarningsPage technicianId={technicianId} fullName={fullName} />}
      </Route>
      <Route path="/operations">{() => <OperationsMenuPage role="technician" username={fullName} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

interface LoginResponse {
  id: string;
  username: string;
  role: "admin" | "dispatcher" | "technician";
  fullName: string | null;
  technicianId: string | null;
  requiresPasswordSetup?: boolean;
  isSuperAdmin?: boolean;
}

interface TechnicianInfo {
  id: string;
  name: string;
  userId: string | null;
}

interface GodModeRoleSwitcherProps {
  currentRole: string;
  currentTechnicianId: string | null;
  onRoleChange: (role: "admin" | "dispatcher" | "technician") => void;
  onTechnicianChange: (id: string, name: string) => void;
}

function GodModeRoleSwitcher({ 
  currentRole, 
  currentTechnicianId, 
  onRoleChange, 
  onTechnicianChange,
}: GodModeRoleSwitcherProps) {
  const { data: technicians = [] } = useQuery<TechnicianInfo[]>({
    queryKey: ["/api/technicians"],
  });

  const handleValueChange = (value: string) => {
    if (value === "admin" || value === "dispatcher") {
      onRoleChange(value);
    } else if (value.startsWith("tech:")) {
      const techId = value.replace("tech:", "");
      const tech = technicians.find(t => t.id === techId);
      if (tech) {
        onTechnicianChange(tech.id, tech.name);
      }
    }
  };

  const getCurrentValue = () => {
    if (currentRole === "admin" || currentRole === "dispatcher") {
      return currentRole;
    }
    if (currentRole === "technician" && currentTechnicianId) {
      return `tech:${currentTechnicianId}`;
    }
    return "admin";
  };

  const getCurrentLabel = () => {
    if (currentRole === "admin") return "Admin";
    if (currentRole === "dispatcher") return "Dispatcher";
    if (currentRole === "technician" && currentTechnicianId) {
      const tech = technicians.find(t => t.id === currentTechnicianId);
      return tech ? tech.name : "Technician";
    }
    return "Admin";
  };

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 gap-1">
        <Crown className="w-3 h-3" />
        God Mode
      </Badge>
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <Select value={getCurrentValue()} onValueChange={handleValueChange}>
          <SelectTrigger className="w-[180px] h-8" data-testid="select-view-as-role">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              <span className="truncate">{getCurrentLabel()}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Roles</SelectLabel>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="dispatcher">Dispatcher</SelectItem>
            </SelectGroup>
            {technicians.length > 0 && (
              <SelectGroup>
                <SelectLabel>Technicians</SelectLabel>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={`tech:${tech.id}`}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface NotificationsBellProps {
  userId: string;
}

function NotificationsBell({ userId }: NotificationsBellProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });
  
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    } else if (notification.jobId) {
      setLocation(`/jobs?jobId=${notification.jobId}`);
    }
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications-bell">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center" data-testid="badge-unread-count">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 20).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-3 hover-elevate transition-colors ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                    <div className={!notification.isRead ? "" : "ml-4"}>
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function App() {
  const [location, setLocation] = useLocation();
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    username: "",
    userId: "",
    technicianId: null,
    fullName: "",
    requiresPasswordSetup: false,
    isSuperAdmin: false,
  });
  
  // Super admin role switching
  const [viewAsRole, setViewAsRole] = useState<"admin" | "dispatcher" | "technician" | null>(null);
  const [viewAsTechnicianId, setViewAsTechnicianId] = useState<string | null>(null);
  const [viewAsTechnicianName, setViewAsTechnicianName] = useState<string>("Technician");
  
  // The effective role is either the "view as" role (for super admins) or the actual role
  const effectiveRole = auth.isSuperAdmin && viewAsRole ? viewAsRole : auth.role;
  
  // Effective IDs for technician view
  const effectiveTechnicianId = auth.isSuperAdmin && viewAsRole === "technician" ? viewAsTechnicianId : auth.technicianId;
  const effectiveFullName = auth.isSuperAdmin && viewAsRole === "technician" ? viewAsTechnicianName : auth.fullName;

  // Always use dark mode for premium marble background
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogin = (loginData: LoginResponse) => {
    setAuth({
      isAuthenticated: true,
      role: loginData.role,
      username: loginData.username,
      userId: loginData.id,
      technicianId: loginData.technicianId,
      fullName: loginData.fullName || loginData.username,
      requiresPasswordSetup: loginData.requiresPasswordSetup || false,
      isSuperAdmin: loginData.isSuperAdmin || false,
    });
    if (!loginData.requiresPasswordSetup) {
      setLocation("/");
    }
  };

  const handlePasswordSetupComplete = () => {
    setAuth(prev => ({ ...prev, requiresPasswordSetup: false }));
    setLocation("/");
  };

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      role: null,
      username: "",
      userId: "",
      technicianId: null,
      fullName: "",
      requiresPasswordSetup: false,
      isSuperAdmin: false,
    });
  };

  // Public quote page (no auth required)
  if (location.startsWith('/quote/')) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/quote/:token" component={PublicQuotePage} />
            <Route path="/sms-opt-in" component={SmsOptInPage} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginPage onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show password setup screen for first-time users
  if (auth.requiresPasswordSetup) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PasswordSetupPage
            userId={auth.userId}
            username={auth.username}
            onComplete={handlePasswordSetupComplete}
          />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full marble-bg">
            <AppSidebar
              role={effectiveRole!}
              username={auth.username}
              userId={auth.userId}
              onLogout={handleLogout}
            />
            <div className="flex flex-col flex-1 min-w-0 bg-background/90 backdrop-blur-sm">
              <header className="flex items-center gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex-1" />
                
                {auth.isSuperAdmin && (
                  <GodModeRoleSwitcher
                    currentRole={viewAsRole || auth.role || "admin"}
                    currentTechnicianId={viewAsTechnicianId}
                    onRoleChange={(role) => {
                      setViewAsRole(role);
                      setLocation("/");
                    }}
                    onTechnicianChange={(id, name) => {
                      setViewAsTechnicianId(id);
                      setViewAsTechnicianName(name);
                      setViewAsRole("technician");
                      setLocation("/");
                    }}
                  />
                )}
                
                {(effectiveRole === "admin" || effectiveRole === "dispatcher") && (
                  <NotificationsBell userId={auth.userId} />
                )}
              </header>
              <main className="flex-1 overflow-auto p-6">
                {effectiveRole === "admin" ? (
                  <AdminRouter />
                ) : effectiveRole === "dispatcher" ? (
                  <DispatcherRouter userId={auth.userId} fullName={effectiveFullName} />
                ) : (
                  <TechnicianRouter 
                    technicianId={effectiveTechnicianId || ""} 
                    userId={auth.userId}
                    fullName={effectiveFullName}
                  />
                )}
              </main>
              <footer className="px-4 py-2 text-center border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <span className="text-xs text-muted-foreground" data-testid="text-powered-by">
                  Powered by BossMan
                </span>
              </footer>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
