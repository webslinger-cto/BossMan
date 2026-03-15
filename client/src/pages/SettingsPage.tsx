import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Users,
  Shield,
  Bell,
  Save,
  Search,
  Eye,
  FileEdit,
  Download,
  Upload,
  Megaphone,
  Wallet,
  LayoutDashboard,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Clock,
  BookOpen,
  FileUp,
  FileDown,
} from "lucide-react";

type FeaturePermission = {
  id: string;
  name: string;
  description: string;
  icon: typeof Settings;
};

type EmployeeAccess = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "dispatcher" | "technician";
  permissions: Record<string, boolean>;
  payType: "hourly" | "salary";
  payRate: number;
};

const featurePermissions: FeaturePermission[] = [
  { id: "viewLeads", name: "View Leads", description: "Access to view lead information", icon: Eye },
  { id: "editLeads", name: "Edit Leads", description: "Ability to modify lead details", icon: FileEdit },
  { id: "viewDashboard", name: "View Dashboard", description: "Access to dashboard analytics", icon: LayoutDashboard },
  { id: "exportData", name: "Export Data", description: "Permission to export reports", icon: Download },
  { id: "importData", name: "Import Data", description: "Permission to import data", icon: Upload },
  { id: "manageOutreach", name: "Manage Outreach", description: "Access to outreach campaigns", icon: Megaphone },
  { id: "viewPayroll", name: "View Payroll", description: "Access to payroll information", icon: Wallet },
  { id: "viewTechnicians", name: "View Technicians", description: "Access to technician profiles", icon: Wrench },
];

// Employee access populated from actual user data
const initialEmployees: EmployeeAccess[] = [];

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Key, RefreshCw, UserPlus, Crown, EyeOff } from "lucide-react";

interface SystemUser {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  viewablePassword: string | null;
  requiresPasswordSetup: boolean;
  isSuperAdmin: boolean;
}

function UserPasswordManagement() {
  const { toast } = useToast();
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    fullName: "",
    role: "technician" as "admin" | "dispatcher" | "technician" | "salesperson",
    email: "",
    phone: "",
    initialPassword: "",
    requiresPasswordSetup: true,
    isSuperAdmin: false,
  });

  const { data: users = [], isLoading, refetch } = useQuery<SystemUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsAddUserOpen(false);
      setNewUser({
        username: "",
        fullName: "",
        role: "technician",
        email: "",
        phone: "",
        initialPassword: "",
        requiresPasswordSetup: true,
        isSuperAdmin: false,
      });
      toast({
        title: "User created",
        description: "The new user account has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, { password: newPassword });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Password reset",
        description: "The user's password has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "The user account has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (user: SystemUser) => {
    if (user.isSuperAdmin) {
      toast({
        title: "Cannot delete",
        description: "Super admin accounts cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    if (confirm(`Are you sure you want to delete ${user.fullName || user.username}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "dispatcher": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "technician": return "bg-green-500/20 text-green-300 border-green-500/30";
      case "salesperson": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default: return "bg-muted";
    }
  };

  const handleCreateUser = () => {
    if (!newUser.username) {
      toast({
        title: "Missing information",
        description: "Username is required.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading users...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                User Account Management
              </CardTitle>
              <CardDescription>
                View and manage user accounts. Passwords are viewable by IT team for support purposes.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-users">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setIsAddUserOpen(true)} data-testid="button-add-user">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No users found. Add users to get started.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Password</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/30" data-testid={`row-user-${user.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {(user.fullName || user.username).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {user.fullName || user.username}
                                {user.isSuperAdmin && (
                                  <span title="Super Admin"><Crown className="w-4 h-4 text-yellow-500" /></span>
                                )}
                              </div>
                              {user.email && (
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{user.username}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {showPasswords[user.id] 
                                ? (user.viewablePassword || "Not set") 
                                : "••••••••"
                              }
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePasswordVisibility(user.id)}
                              data-testid={`button-toggle-password-${user.id}`}
                            >
                              {showPasswords[user.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user.requiresPasswordSetup ? (
                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                              Pending Setup
                            </Badge>
                          ) : user.isActive ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!user.isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleteUserMutation.isPending}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. If "Requires password setup" is enabled, the user will set their own password on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username</Label>
                <Input
                  id="new-username"
                  placeholder="Enter username"
                  value={newUser.username}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                  data-testid="input-new-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-fullname">Full Name</Label>
                <Input
                  id="new-fullname"
                  placeholder="Full name"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, fullName: e.target.value }))}
                  data-testid="input-new-fullname"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  data-testid="input-new-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  placeholder="(555) 123-4567"
                  value={newUser.phone}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))}
                  data-testid="input-new-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser((prev) => ({ ...prev, role: v as typeof newUser.role }))}
              >
                <SelectTrigger id="new-role" data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Initial Password</Label>
              <Input
                id="new-password"
                type="text"
                placeholder="Temporary password for first login"
                value={newUser.initialPassword}
                onChange={(e) => setNewUser((prev) => ({ ...prev, initialPassword: e.target.value }))}
                data-testid="input-new-password"
              />
              <p className="text-xs text-muted-foreground">
                This is a temporary password. The user will be required to change it on first login.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div>
                <Label>Requires Password Setup</Label>
                <p className="text-xs text-muted-foreground">
                  User must set their own password on first login
                </p>
              </div>
              <Switch
                checked={newUser.requiresPasswordSetup}
                onCheckedChange={(checked) => setNewUser((prev) => ({ ...prev, requiresPasswordSetup: checked }))}
                data-testid="switch-requires-password-setup"
              />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <div>
                <Label className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  Super Admin (God Mode)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Full access to edit/change anything in the system
                </p>
              </div>
              <Switch
                checked={newUser.isSuperAdmin}
                onCheckedChange={(checked) => setNewUser((prev) => ({ ...prev, isSuperAdmin: checked }))}
                data-testid="switch-super-admin"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={createUserMutation.isPending}
              data-testid="button-create-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CompanySettingsData {
  id?: string;
  leadApiEnabled?: boolean;
  [key: string]: unknown;
}

function LeadApiIntegrationCard() {
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery<CompanySettingsData>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettingsData>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Lead API integration setting has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    updateSettingsMutation.mutate({ leadApiEnabled: checked });
  };

  const isEnabled = settings?.leadApiEnabled !== false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Lead API & Webhook Integration
        </CardTitle>
        <CardDescription>
          Control incoming leads from external sources (Thumbtack, Angi, Zapier, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30">
          <div>
            <Label htmlFor="leadApiEnabled" className="text-base font-medium">Enable Lead API</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, leads from Thumbtack, Angi, Networx, Inquirly, Zapier, and other sources will be automatically created in the CRM
            </p>
          </div>
          <Switch
            id="leadApiEnabled"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || updateSettingsMutation.isPending}
            data-testid="switch-lead-api-enabled"
          />
        </div>
        {!isEnabled && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              Lead API is currently <strong>disabled</strong>. No new leads will be created from external webhooks until you enable this setting.
            </p>
          </div>
        )}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="font-medium">Supported Lead Sources</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Thumbtack</Badge>
            <Badge variant="outline">Angi</Badge>
            <Badge variant="outline">eLocal</Badge>
            <Badge variant="outline">Networx</Badge>
            <Badge variant="outline">Inquirly</Badge>
            <Badge variant="outline">Zapier</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeAccess[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "dispatcher" | "technician">("all");
  const [hasChanges, setHasChanges] = useState(false);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditPayOpen, setIsEditPayOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAccess | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    role: "technician" as "admin" | "dispatcher" | "technician",
    payType: "hourly" as "hourly" | "salary",
    payRate: 0,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNewLeads: true,
    emailJobComplete: true,
    emailDailyReport: false,
    pushNewLeads: true,
    pushUrgentJobs: true,
  });

  const [appointmentReminderSettings, setAppointmentReminderSettings] = useState({
    enabled: true,
    smsReminders: true,
    emailReminders: true,
    reminder24Hours: true,
    reminder2Hours: true,
    reminder1Hour: false,
    reminderDayBefore: false,
    customMessage: "",
  });

  const [generalSettings, setGeneralSettings] = useState({
    autoAssignLeads: true,
    requireQuoteApproval: false,
    allowTechSelfSchedule: true,
    defaultLeadExpiry: "7",
    seoAutoApprove: false,
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const togglePermission = (employeeId: string, permissionId: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              permissions: {
                ...emp.permissions,
                [permissionId]: !emp.permissions[permissionId],
              },
            }
          : emp
      )
    );
    setHasChanges(true);
  };

  const toggleAllPermissions = (employeeId: string, enabled: boolean) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              permissions: Object.fromEntries(
                featurePermissions.map((fp) => [fp.id, enabled])
              ),
            }
          : emp
      )
    );
    setHasChanges(true);
  };

  const addStaff = () => {
    if (!newStaff.name || !newStaff.email) {
      toast({
        title: "Missing information",
        description: "Please fill in name and email.",
        variant: "destructive",
      });
      return;
    }

    const parsedPayRate = Number(newStaff.payRate);
    if (isNaN(parsedPayRate) || parsedPayRate < 0) {
      toast({
        title: "Invalid pay rate",
        description: "Please enter a valid pay rate.",
        variant: "destructive",
      });
      return;
    }

    const newEmployee: EmployeeAccess = {
      id: Date.now().toString(),
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role,
      payType: newStaff.payType,
      payRate: parsedPayRate,
      permissions: newStaff.role === "admin" 
        ? Object.fromEntries(featurePermissions.map((fp) => [fp.id, true]))
        : Object.fromEntries(featurePermissions.map((fp) => [fp.id, false])),
    };

    setEmployees((prev) => [...prev, newEmployee]);
    setNewStaff({
      name: "",
      email: "",
      role: "technician",
      payType: "hourly",
      payRate: 0,
    });
    setIsAddStaffOpen(false);
    setHasChanges(true);
    toast({
      title: "Staff member added",
      description: `${newEmployee.name} has been added as ${newEmployee.role}.`,
    });
  };

  const deleteStaff = (id: string) => {
    const employee = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    setHasChanges(true);
    toast({
      title: "Staff member removed",
      description: `${employee?.name || "Employee"} has been removed.`,
    });
  };

  const openEditPayDialog = (employee: EmployeeAccess) => {
    setSelectedEmployee(employee);
    setIsEditPayOpen(true);
  };

  const updatePaySettings = () => {
    if (!selectedEmployee) return;

    const parsedPayRate = Number(selectedEmployee.payRate);
    if (isNaN(parsedPayRate) || parsedPayRate < 0) {
      toast({
        title: "Invalid pay rate",
        description: "Please enter a valid pay rate.",
        variant: "destructive",
      });
      return;
    }

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === selectedEmployee.id
          ? {
              ...emp,
              payType: selectedEmployee.payType,
              payRate: parsedPayRate,
            }
          : emp
      )
    );
    setIsEditPayOpen(false);
    setSelectedEmployee(null);
    setHasChanges(true);
    toast({
      title: "Pay settings updated",
      description: "Pay information has been updated successfully.",
    });
  };

  const saveChanges = () => {
    toast({
      title: "Settings saved",
      description: "All changes have been saved successfully.",
    });
    setHasChanges(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getEnabledCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
  };

  const formatPayRate = (employee: EmployeeAccess) => {
    if (employee.payType === "hourly") {
      return `$${employee.payRate}/hr`;
    }
    return `$${employee.payRate.toLocaleString()}/yr`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage system preferences and employee access controls
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveChanges} data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <Tabs defaultValue="access" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 w-full max-w-4xl h-auto p-1">
          <TabsTrigger value="access" data-testid="tab-access">
            <Shield className="w-4 h-4 mr-2" />
            Access
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <FileEdit className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">
            <FileUp className="w-4 h-4 mr-2" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-export">
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">
            <BookOpen className="w-4 h-4 mr-2" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Employee Access Control
                  </CardTitle>
                  <CardDescription>
                    Control which features each employee can access. Admins always have full access.
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddStaffOpen(true)} data-testid="button-add-staff">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-employees"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                  <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="dispatcher">Dispatchers</SelectItem>
                    <SelectItem value="technician">Technicians</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="p-4 rounded-lg border bg-muted/30" data-testid={`card-employee-${employee.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {employee.role}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getEnabledCount(employee.permissions)}/{featurePermissions.length} enabled
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {formatPayRate(employee)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                          <p className="text-sm font-medium">Feature Permissions</p>
                          <div className="flex gap-2 flex-wrap">
                            {employee.role !== "admin" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAllPermissions(employee.id, true)}
                                  data-testid={`button-enable-all-${employee.id}`}
                                >
                                  Enable All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAllPermissions(employee.id, false)}
                                  data-testid={`button-disable-all-${employee.id}`}
                                >
                                  Disable All
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditPayDialog(employee)}
                              data-testid={`button-edit-pay-${employee.id}`}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit Pay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteStaff(employee.id)}
                              data-testid={`button-delete-${employee.id}`}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        {employee.role === "admin" ? (
                          <div className="p-4 rounded-md bg-muted/50 text-sm text-muted-foreground">
                            Admins have full access to all features by default.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {featurePermissions.map((feature) => (
                              <div
                                key={feature.id}
                                className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                              >
                                <Switch
                                  id={`${employee.id}-${feature.id}`}
                                  checked={employee.permissions[feature.id]}
                                  onCheckedChange={() => togglePermission(employee.id, feature.id)}
                                  data-testid={`switch-${employee.id}-${feature.id}`}
                                />
                                <Label
                                  htmlFor={`${employee.id}-${feature.id}`}
                                  className="text-xs cursor-pointer flex items-center gap-1"
                                >
                                  <feature.icon className="w-3 h-3" />
                                  {feature.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No employees found matching your criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserPasswordManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailNewLeads">New Lead Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when new leads come in</p>
                    </div>
                    <Switch
                      id="emailNewLeads"
                      checked={notificationSettings.emailNewLeads}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, emailNewLeads: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-email-new-leads"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailJobComplete">Job Completion</Label>
                      <p className="text-sm text-muted-foreground">Notify when technicians complete jobs</p>
                    </div>
                    <Switch
                      id="emailJobComplete"
                      checked={notificationSettings.emailJobComplete}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, emailJobComplete: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-email-job-complete"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="emailDailyReport">Daily Summary Report</Label>
                      <p className="text-sm text-muted-foreground">Receive a daily summary of activity</p>
                    </div>
                    <Switch
                      id="emailDailyReport"
                      checked={notificationSettings.emailDailyReport}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, emailDailyReport: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-email-daily-report"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Push Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="pushNewLeads">New Lead Alerts</Label>
                      <p className="text-sm text-muted-foreground">Instant push for incoming leads</p>
                    </div>
                    <Switch
                      id="pushNewLeads"
                      checked={notificationSettings.pushNewLeads}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, pushNewLeads: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-push-new-leads"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="pushUrgentJobs">Urgent Job Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get alerts for urgent or emergency jobs</p>
                    </div>
                    <Switch
                      id="pushUrgentJobs"
                      checked={notificationSettings.pushUrgentJobs}
                      onCheckedChange={(checked) => {
                        setNotificationSettings((prev) => ({ ...prev, pushUrgentJobs: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-push-urgent-jobs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Appointment Reminders
              </CardTitle>
              <CardDescription>
                Configure automatic reminders for upcoming appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="remindersEnabled">Enable Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Master toggle for all appointment reminders</p>
                </div>
                <Switch
                  id="remindersEnabled"
                  checked={appointmentReminderSettings.enabled}
                  onCheckedChange={(checked) => {
                    setAppointmentReminderSettings((prev) => ({ ...prev, enabled: checked }));
                    setHasChanges(true);
                  }}
                  data-testid="switch-reminders-enabled"
                />
              </div>

              {appointmentReminderSettings.enabled && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Reminder Methods</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Label htmlFor="smsReminders">SMS Reminders</Label>
                          <p className="text-sm text-muted-foreground">Send text message reminders to customers</p>
                        </div>
                        <Switch
                          id="smsReminders"
                          checked={appointmentReminderSettings.smsReminders}
                          onCheckedChange={(checked) => {
                            setAppointmentReminderSettings((prev) => ({ ...prev, smsReminders: checked }));
                            setHasChanges(true);
                          }}
                          data-testid="switch-sms-reminders"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Label htmlFor="emailReminders">Email Reminders</Label>
                          <p className="text-sm text-muted-foreground">Send email reminders to customers</p>
                        </div>
                        <Switch
                          id="emailReminders"
                          checked={appointmentReminderSettings.emailReminders}
                          onCheckedChange={(checked) => {
                            setAppointmentReminderSettings((prev) => ({ ...prev, emailReminders: checked }));
                            setHasChanges(true);
                          }}
                          data-testid="switch-email-reminders"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Reminder Timing</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <Switch
                          id="reminderDayBefore"
                          checked={appointmentReminderSettings.reminderDayBefore}
                          onCheckedChange={(checked) => {
                            setAppointmentReminderSettings((prev) => ({ ...prev, reminderDayBefore: checked }));
                            setHasChanges(true);
                          }}
                          data-testid="switch-reminder-day-before"
                        />
                        <Label htmlFor="reminderDayBefore" className="cursor-pointer">1 Day Before</Label>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <Switch
                          id="reminder24Hours"
                          checked={appointmentReminderSettings.reminder24Hours}
                          onCheckedChange={(checked) => {
                            setAppointmentReminderSettings((prev) => ({ ...prev, reminder24Hours: checked }));
                            setHasChanges(true);
                          }}
                          data-testid="switch-reminder-24-hours"
                        />
                        <Label htmlFor="reminder24Hours" className="cursor-pointer">24 Hours Before</Label>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <Switch
                          id="reminder2Hours"
                          checked={appointmentReminderSettings.reminder2Hours}
                          onCheckedChange={(checked) => {
                            setAppointmentReminderSettings((prev) => ({ ...prev, reminder2Hours: checked }));
                            setHasChanges(true);
                          }}
                          data-testid="switch-reminder-2-hours"
                        />
                        <Label htmlFor="reminder2Hours" className="cursor-pointer">2 Hours Before</Label>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <Switch
                          id="reminder1Hour"
                          checked={appointmentReminderSettings.reminder1Hour}
                          onCheckedChange={(checked) => {
                            setAppointmentReminderSettings((prev) => ({ ...prev, reminder1Hour: checked }));
                            setHasChanges(true);
                          }}
                          data-testid="switch-reminder-1-hour"
                        />
                        <Label htmlFor="reminder1Hour" className="cursor-pointer">1 Hour Before</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customMessage">Custom Message Template</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Customize the reminder message sent to customers. Use placeholders like {"{customer_name}"}, {"{date}"}, {"{time}"}, {"{address}"}
                      </p>
                      <Textarea
                        id="customMessage"
                        placeholder="Hi {customer_name}, this is a reminder about your upcoming appointment on {date} at {time}. Our technician will arrive at {address}."
                        value={appointmentReminderSettings.customMessage}
                        onChange={(e) => {
                          setAppointmentReminderSettings((prev) => ({ ...prev, customMessage: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="min-h-[100px]"
                        data-testid="textarea-custom-message"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <LeadApiIntegrationCard />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5" />
                SEO Content Integration
              </CardTitle>
              <CardDescription>
                Configure how SEO content from webslingeraiglassseo.com is handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="seoAutoApprove">Auto-Approve SEO Content</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow webslingeraiglassseo.com to automatically approve content without manual review
                    </p>
                  </div>
                  <Switch
                    id="seoAutoApprove"
                    checked={generalSettings.seoAutoApprove || false}
                    onCheckedChange={(checked) => {
                      setGeneralSettings((prev) => ({ ...prev, seoAutoApprove: checked }));
                      setHasChanges(true);
                    }}
                    data-testid="switch-seo-auto-approve"
                  />
                </div>
                <Separator />
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium">Webhook URL</h4>
                  <p className="text-sm text-muted-foreground">
                    Share this URL with webslingeraiglassseo.com to receive SEO content packages:
                  </p>
                  <code className="block p-2 bg-background rounded text-sm">
                    {window.location.origin}/api/webhooks/seo-content
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Lead Management</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="autoAssignLeads">Auto-Assign Leads</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically assign new leads to available technicians
                      </p>
                    </div>
                    <Switch
                      id="autoAssignLeads"
                      checked={generalSettings.autoAssignLeads}
                      onCheckedChange={(checked) => {
                        setGeneralSettings((prev) => ({ ...prev, autoAssignLeads: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-auto-assign-leads"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 mr-4">
                      <Label htmlFor="defaultLeadExpiry">Default Lead Expiry (Days)</Label>
                      <p className="text-sm text-muted-foreground">
                        Number of days before leads are marked as expired
                      </p>
                    </div>
                    <Select
                      value={generalSettings.defaultLeadExpiry}
                      onValueChange={(v) => {
                        setGeneralSettings((prev) => ({ ...prev, defaultLeadExpiry: v }));
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger className="w-[120px]" data-testid="select-lead-expiry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="5">5 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Quote & Job Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="requireQuoteApproval">Require Quote Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Quotes must be approved by admin before sending to customers
                      </p>
                    </div>
                    <Switch
                      id="requireQuoteApproval"
                      checked={generalSettings.requireQuoteApproval}
                      onCheckedChange={(checked) => {
                        setGeneralSettings((prev) => ({ ...prev, requireQuoteApproval: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-require-quote-approval"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="allowTechSelfSchedule">Technician Self-Scheduling</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow technicians to schedule their own jobs
                      </p>
                    </div>
                    <Switch
                      id="allowTechSelfSchedule"
                      checked={generalSettings.allowTechSelfSchedule}
                      onCheckedChange={(checked) => {
                        setGeneralSettings((prev) => ({ ...prev, allowTechSelfSchedule: checked }));
                        setHasChanges(true);
                      }}
                      data-testid="switch-tech-self-schedule"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Upload CSV or Excel files from eLocal, Networx, and other lead sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-xl p-12 text-center border-border hover:border-primary/50 transition-colors">
                <div className="mx-auto w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Drop files here</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports CSV and Excel files (.csv, .xlsx)
                </p>
                <input
                  type="file"
                  id="import-file-upload"
                  className="hidden"
                  accept=".csv,.xlsx"
                  multiple
                />
                <Button asChild data-testid="button-browse-import-files">
                  <label htmlFor="import-file-upload" className="cursor-pointer">
                    Browse Files
                  </label>
                </Button>
              </div>
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Supported Sources</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">eLocal</Badge>
                  <Badge variant="secondary">Networx</Badge>
                  <Badge variant="secondary">Angi</Badge>
                  <Badge variant="secondary">Thumbtack</Badge>
                  <Badge variant="secondary">Inquirly</Badge>
                  <Badge variant="secondary">Zapier</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Export Data
              </CardTitle>
              <CardDescription>
                Download all CRM data including leads, jobs, technicians, and quotes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Download className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">CSV Export</h4>
                        <p className="text-sm text-muted-foreground">For Excel, Google Sheets</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" data-testid="button-export-csv-settings">
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Download className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">PDF Report</h4>
                        <p className="text-sm text-muted-foreground">Formatted document</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" data-testid="button-export-pdf-settings">
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">What's Included</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>All leads with contact info and source tracking</li>
                  <li>Jobs with scheduling and revenue data</li>
                  <li>Technician performance metrics</li>
                  <li>Quote history with pricing details</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Operations Guide
              </CardTitle>
              <CardDescription>
                Your role-specific guide to Emergency Chicago Sewer Experts CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" /> Lead Management
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>View all incoming leads from all sources</li>
                    <li>Monitor lead conversion rates by source</li>
                    <li>Track cost-per-lead and ROI by channel</li>
                    <li>Configure webhook endpoints for lead sources</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Technician Management
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>Add and manage technician profiles</li>
                    <li>Set hourly rates and skills</li>
                    <li>View availability and workload</li>
                    <li>Review earnings and performance</li>
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Lead Sources & Webhooks</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Source</th>
                        <th className="text-left py-2 px-3">Endpoint</th>
                        <th className="text-left py-2 px-3">Authentication</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr><td className="py-2 px-3">eLocal</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/elocal</td><td className="py-2 px-3">None</td></tr>
                      <tr><td className="py-2 px-3">Networx</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/networx</td><td className="py-2 px-3">None</td></tr>
                      <tr><td className="py-2 px-3">Angi</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/angi</td><td className="py-2 px-3">x-angi-key header</td></tr>
                      <tr><td className="py-2 px-3">Thumbtack</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/thumbtack</td><td className="py-2 px-3">Basic Auth</td></tr>
                      <tr><td className="py-2 px-3">Zapier</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/zapier/lead</td><td className="py-2 px-3">None</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Documentation Downloads</h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <a href="/api/docs/readme" download="Emergency-Chicago-Sewer-Experts-CRM-README.pdf">
                    <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-download-readme-pdf">
                      <Download className="w-4 h-4" />
                      <span>System README (Full Guide)</span>
                    </Button>
                  </a>
                  <a href="/3-app-integration-guide.pdf" download>
                    <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-download-integration-pdf">
                      <Download className="w-4 h-4" />
                      <span>3-App Integration Guide</span>
                    </Button>
                  </a>
                  <a href="/api/documentation/pdf" download>
                    <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-download-docs-pdf">
                      <Download className="w-4 h-4" />
                      <span>CRM Documentation</span>
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddStaffOpen} onOpenChange={(open) => {
        setIsAddStaffOpen(open);
        if (!open) {
          setNewStaff({ name: "", email: "", role: "technician", payType: "hourly", payRate: 0 });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>Fill in the details below to add a new team member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                placeholder="Full name"
                value={newStaff.name}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.target.value }))}
                data-testid="input-staff-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="email@company.com"
                value={newStaff.email}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.target.value }))}
                data-testid="input-staff-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select
                value={newStaff.role}
                onValueChange={(v) => setNewStaff((prev) => ({ ...prev, role: v as typeof newStaff.role }))}
              >
                <SelectTrigger data-testid="select-staff-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-pay-type">Pay Type</Label>
              <Select
                value={newStaff.payType}
                onValueChange={(v) => setNewStaff((prev) => ({ ...prev, payType: v as typeof newStaff.payType }))}
              >
                <SelectTrigger data-testid="select-staff-pay-type">
                  <SelectValue placeholder="Select pay type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-pay-rate">
                {newStaff.payType === "hourly" ? "Hourly Rate ($)" : "Annual Salary ($)"}
              </Label>
              <Input
                id="staff-pay-rate"
                type="number"
                placeholder={newStaff.payType === "hourly" ? "e.g., 25" : "e.g., 50000"}
                value={newStaff.payRate || ""}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, payRate: parseFloat(e.target.value) || 0 }))}
                data-testid="input-staff-pay-rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStaffOpen(false)} data-testid="button-cancel-add-staff">
              Cancel
            </Button>
            <Button onClick={addStaff} data-testid="button-confirm-add-staff">
              Add Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPayOpen} onOpenChange={(open) => {
        setIsEditPayOpen(open);
        if (!open) setSelectedEmployee(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pay Settings</DialogTitle>
            <DialogDescription>Update the pay type and rate for this employee.</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(selectedEmployee.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedEmployee.role}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pay-type">Pay Type</Label>
                <Select
                  value={selectedEmployee.payType}
                  onValueChange={(v) => setSelectedEmployee((prev) => prev ? { ...prev, payType: v as "hourly" | "salary" } : null)}
                >
                  <SelectTrigger data-testid="select-edit-pay-type">
                    <SelectValue placeholder="Select pay type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pay-rate">
                  {selectedEmployee.payType === "hourly" ? "Hourly Rate ($)" : "Annual Salary ($)"}
                </Label>
                <Input
                  id="edit-pay-rate"
                  type="number"
                  value={selectedEmployee.payRate || ""}
                  onChange={(e) => setSelectedEmployee((prev) => prev ? { ...prev, payRate: parseFloat(e.target.value) || 0 } : null)}
                  data-testid="input-edit-pay-rate"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPayOpen(false)} data-testid="button-cancel-edit-pay">
              Cancel
            </Button>
            <Button onClick={updatePaySettings} data-testid="button-confirm-edit-pay">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
