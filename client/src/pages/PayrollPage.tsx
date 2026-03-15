import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  Play,
  CreditCard,
  Plus,
  FileText,
  Receipt,
  Percent,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Technician, Job, User, JobRevenueEvent, SalesCommission, Salesperson } from "@shared/schema";

interface TimeEntry {
  id: number;
  userId: number;
  userName: string;
  clockInTime: string;
  clockOutTime: string | null;
  hoursWorked: number;
  status: string;
}

interface PayrollRecord {
  id: number;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
}

interface LeadFee {
  id: number;
  technicianName: string;
  jobId: number;
  customerName: string;
  feeAmount: number;
  deductedAt: string | null;
  status: string;
}

// Tax rate constants
const TAX_RATES = {
  federal: 22,
  state: 4.95,
  socialSecurity: 6.2,
  medicare: 1.45,
};

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState("timesheet");
  const [isClockInDialogOpen, setIsClockInDialogOpen] = useState(false);
  const [isSetRateDialogOpen, setIsSetRateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [newRate, setNewRate] = useState({
    employeeId: "",
    type: "1099 Hourly",
    hourlyRate: "25.00",
    salary: "",
    commission: "10",
  });
  const { toast } = useToast();

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/payroll/time-entries"],
  });

  // Fetch job revenue events for analytics integration
  const { data: revenueEvents = [] } = useQuery<JobRevenueEvent[]>({
    queryKey: ["/api/revenue-events"],
  });

  // Fetch sales commissions for payroll integration
  const { data: salesCommissions = [] } = useQuery<SalesCommission[]>({
    queryKey: ["/api/sales-commissions"],
  });

  // Fetch salespersons for commission display
  const { data: salespersons = [] } = useQuery<Salesperson[]>({
    queryKey: ["/api/salespersons"],
  });

  // Calculate payroll data per technician (restored from original logic)
  const payrollData = useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === "completed");
    
    return technicians.map((tech) => {
      const techJobs = completedJobs.filter(j => j.assignedTechnicianId === tech.id);
      const hourlyRate = parseFloat(String(tech.hourlyRate)) || 25;
      const commissionRate = parseFloat(String(tech.commissionRate)) || 0.1;
      const emergencyRate = parseFloat(String(tech.emergencyRate)) || 1.5;

      let totalHoursWorked = 0;
      let emergencyHoursWorked = 0;

      techJobs.forEach((job) => {
        if (job.startedAt && job.completedAt) {
          const started = new Date(job.startedAt);
          const completed = new Date(job.completedAt);
          const hours = (completed.getTime() - started.getTime()) / (1000 * 60 * 60);
          
          const isEmergency = job.priority === "urgent" || job.priority === "high";
          if (isEmergency) {
            emergencyHoursWorked += hours;
          }
          totalHoursWorked += hours;
        } else if (job.estimatedDuration) {
          totalHoursWorked += job.estimatedDuration / 60;
        }
      });

      const totalRevenue = techJobs.reduce((sum, j) => sum + (parseFloat(String(j.totalRevenue)) || 0), 0);
      const regularHours = totalHoursWorked - emergencyHoursWorked;
      const regularPay = regularHours * hourlyRate;
      const emergencyPay = emergencyHoursWorked * hourlyRate * emergencyRate;
      const commissionEarned = totalRevenue * commissionRate;
      const leadFees = techJobs.length * 125; // $125 per job
      
      const grossPay = regularPay + emergencyPay + commissionEarned;
      const estimatedTax = grossPay * 0.22;
      const netPay = grossPay - estimatedTax - leadFees;

      return {
        technicianId: tech.id,
        technicianName: tech.fullName,
        hourlyRate,
        commissionRate,
        jobsCompleted: techJobs.length,
        regularHours: Math.round(regularHours * 10) / 10,
        emergencyHours: Math.round(emergencyHoursWorked * 10) / 10,
        totalHours: Math.round(totalHoursWorked * 10) / 10,
        regularPay: Math.round(regularPay * 100) / 100,
        emergencyPay: Math.round(emergencyPay * 100) / 100,
        commissionEarned: Math.round(commissionEarned * 100) / 100,
        leadFees,
        grossPay: Math.round(grossPay * 100) / 100,
        estimatedTax: Math.round(estimatedTax * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        revenue: totalRevenue,
      };
    });
  }, [technicians, jobs]);

  // Calculate stats from real payroll data
  const stats = useMemo(() => {
    const totalPayroll = payrollData.reduce((sum, p) => sum + p.grossPay, 0);
    const totalHours = payrollData.reduce((sum, p) => sum + p.totalHours, 0);
    
    // Pending = entries from time entries not processed yet
    const pendingHours = timeEntries.filter(e => e.status === "pending").reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
    const avgHourlyRate = technicians.length > 0 
      ? technicians.reduce((sum, t) => sum + (parseFloat(String(t.hourlyRate)) || 25), 0) / technicians.length 
      : 25;
    const pendingPayroll = pendingHours * avgHourlyRate;

    return {
      totalPayroll: Math.round(totalPayroll * 100) / 100,
      pendingPayroll: Math.round(pendingPayroll * 100) / 100,
      totalHours: Math.round(totalHours * 10) / 10,
      activeEmployees: technicians.length,
    };
  }, [payrollData, timeEntries, technicians]);

  // Get employee pay rates from users/technicians
  const employeePayRates = useMemo(() => {
    return technicians.map(tech => ({
      id: tech.id,
      name: tech.fullName,
      type: "1099 Hourly",
      hourlyRate: parseFloat(String(tech.hourlyRate)) || 25,
      salary: null as number | null,
      commission: (parseFloat(String(tech.commissionRate)) || 0.1) * 100,
      effectiveDate: new Date().toISOString(),
      status: tech.status === "available" || tech.status === "busy" ? "Active" : "Inactive",
      initials: tech.fullName.split(" ").map(n => n[0]).join("").toUpperCase(),
    }));
  }, [technicians]);

  // Calculate job revenue by technician - use revenue events exclusively to avoid double counting
  const jobRevenue = useMemo(() => {
    const revenueByTech: Record<string, { name: string; jobs: number; revenue: number; labor: number; materials: number; netProfit: number; commission: number }> = {};
    
    // Track job IDs that have revenue events to avoid double counting
    const eventJobIds = new Set(revenueEvents.map(e => e.jobId));
    
    // First add data from revenue events (authoritative source)
    revenueEvents.forEach(event => {
      const techId = event.technicianId;
      const tech = technicians.find(t => t.id === techId);
      if (!tech) return;
      
      if (!revenueByTech[techId]) {
        revenueByTech[techId] = {
          name: tech.fullName,
          jobs: 0,
          revenue: 0,
          labor: 0,
          materials: 0,
          netProfit: 0,
          commission: 0,
        };
      }
      
      revenueByTech[techId].jobs++;
      revenueByTech[techId].revenue += parseFloat(String(event.totalRevenue)) || 0;
      revenueByTech[techId].labor += parseFloat(String(event.laborCost)) || 0;
      revenueByTech[techId].materials += parseFloat(String(event.materialCost)) || 0;
      revenueByTech[techId].netProfit += parseFloat(String(event.netProfit)) || 0;
      revenueByTech[techId].commission += parseFloat(String(event.commissionAmount)) || 0;
    });
    
    // Add fallback data from jobs that DON'T have revenue events (older jobs)
    jobs.filter(j => j.status === "completed" && !eventJobIds.has(j.id)).forEach(job => {
      const techId = job.assignedTechnicianId;
      if (!techId) return;
      
      const tech = technicians.find(t => t.id === techId);
      if (!tech) return;
      
      if (!revenueByTech[techId]) {
        revenueByTech[techId] = {
          name: tech.fullName,
          jobs: 0,
          revenue: 0,
          labor: 0,
          materials: 0,
          netProfit: 0,
          commission: 0,
        };
      }
      
      const revenue = parseFloat(String(job.totalRevenue)) || 0;
      const labor = parseFloat(String(job.laborCost)) || 0;
      const materials = parseFloat(String(job.materialsCost)) || 0;
      const travel = parseFloat(String(job.travelExpense)) || 0;
      const equipment = parseFloat(String(job.equipmentCost)) || 0;
      const other = parseFloat(String(job.otherExpenses)) || 0;
      const totalCost = labor + materials + travel + equipment + other;
      const netProfit = revenue - totalCost;
      const commissionRate = parseFloat(String(tech.commissionRate)) || 0.1;
      
      revenueByTech[techId].jobs++;
      revenueByTech[techId].revenue += revenue;
      revenueByTech[techId].labor += labor + travel + equipment + other; // Include all labor-related costs
      revenueByTech[techId].materials += materials;
      revenueByTech[techId].netProfit += netProfit;
      revenueByTech[techId].commission += netProfit > 0 ? netProfit * commissionRate : 0;
    });
    
    return Object.entries(revenueByTech).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [jobs, technicians, revenueEvents]);

  // Calculate sales commission summary (for salespersons)
  const salesCommissionSummary = useMemo(() => {
    const bySalesperson: Record<string, { name: string; jobs: number; revenue: number; netProfit: number; commission: number; pending: number; paid: number }> = {};
    
    salesCommissions.forEach(comm => {
      const spId = comm.salespersonId;
      const salesperson = salespersons.find(s => s.id === spId);
      const name = salesperson?.fullName || "Unknown";
      
      if (!bySalesperson[spId]) {
        bySalesperson[spId] = { name, jobs: 0, revenue: 0, netProfit: 0, commission: 0, pending: 0, paid: 0 };
      }
      
      const amount = parseFloat(String(comm.commissionAmount)) || 0;
      bySalesperson[spId].jobs++;
      bySalesperson[spId].revenue += parseFloat(String(comm.jobRevenue)) || 0;
      bySalesperson[spId].netProfit += parseFloat(String(comm.netProfit)) || 0;
      bySalesperson[spId].commission += amount;
      
      if (comm.status === "paid") {
        bySalesperson[spId].paid += amount;
      } else {
        bySalesperson[spId].pending += amount;
      }
    });
    
    return Object.entries(bySalesperson).map(([id, data]) => ({ id, ...data }));
  }, [salesCommissions, salespersons]);

  // Total commission amounts for display
  const totalCommissions = useMemo(() => {
    const techCommissions = payrollData.reduce((sum, p) => sum + p.commissionEarned, 0);
    const salesPending = salesCommissions.filter(c => c.status === "pending").reduce((sum, c) => sum + parseFloat(String(c.commissionAmount) || "0"), 0);
    const salesPaid = salesCommissions.filter(c => c.status === "paid").reduce((sum, c) => sum + parseFloat(String(c.commissionAmount) || "0"), 0);
    return {
      technician: Math.round(techCommissions * 100) / 100,
      salesPending: Math.round(salesPending * 100) / 100,
      salesPaid: Math.round(salesPaid * 100) / 100,
      total: Math.round((techCommissions + salesPending + salesPaid) * 100) / 100,
    };
  }, [payrollData, salesCommissions]);

  // Lead fees (mock data based on jobs)
  const leadFees = useMemo(() => {
    return jobs
      .filter(j => j.status === "completed" && j.assignedTechnicianId)
      .slice(0, 10)
      .map(job => {
        const tech = technicians.find(t => t.id === job.assignedTechnicianId);
        return {
          id: job.id,
          technicianName: tech?.fullName || "Unknown",
          jobId: job.id,
          customerName: job.customerName,
          feeAmount: 125,
          deductedAt: job.completedAt,
          status: job.completedAt ? "Deducted" : "Pending",
        };
      });
  }, [jobs, technicians]);

  const handleClockIn = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Clocked In",
      description: `Employee clocked in successfully`,
    });
    setIsClockInDialogOpen(false);
    setSelectedEmployee("");
  };

  const handleSetRate = () => {
    toast({
      title: "Rate Updated",
      description: "Employee pay rate has been updated",
    });
    setIsSetRateDialogOpen(false);
    setNewRate({
      employeeId: "",
      type: "1099 Hourly",
      hourlyRate: "25.00",
      salary: "",
      commission: "10",
    });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-sky-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
    ];
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-payroll-title">
            Payroll
          </h1>
          <p className="text-muted-foreground">
            Manage employee time tracking and payroll
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setIsClockInDialogOpen(true)}
            data-testid="button-clock-in-employee"
          >
            <Play className="w-4 h-4 mr-2" />
            Clock In Employee
          </Button>
          <Button data-testid="button-process-payroll">
            <CreditCard className="w-4 h-4 mr-2" />
            Process Payroll
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Payroll</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-total-payroll">
                  ${stats.totalPayroll.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-pending-payroll">
                  ${stats.pendingPayroll.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Hours</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-total-hours">
                  {stats.totalHours}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Employees</p>
                <p className="text-2xl font-bold mt-1" data-testid="stat-active-employees">
                  {stats.activeEmployees}
                </p>
                <p className="text-xs text-muted-foreground mt-1">On payroll</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="timesheet" data-testid="tab-timesheet">
            <Clock className="w-4 h-4 mr-2" />
            Time Sheet
          </TabsTrigger>
          <TabsTrigger value="jobrevenue" data-testid="tab-jobrevenue">
            <TrendingUp className="w-4 h-4 mr-2" />
            Job Revenue
          </TabsTrigger>
          <TabsTrigger value="records" data-testid="tab-records">
            <FileText className="w-4 h-4 mr-2" />
            Payroll Records
          </TabsTrigger>
          <TabsTrigger value="payrates" data-testid="tab-payrates">
            <DollarSign className="w-4 h-4 mr-2" />
            Pay Rates
          </TabsTrigger>
          <TabsTrigger value="leadfees" data-testid="tab-leadfees">
            <Receipt className="w-4 h-4 mr-2" />
            Lead Fees
          </TabsTrigger>
        </TabsList>

        {/* Time Sheet Tab */}
        <TabsContent value="timesheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No time entries</h3>
                  <p className="text-muted-foreground mt-1">
                    Time entries will appear here as employees clock in
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-time-entry-${entry.id}`}>
                          <TableCell className="font-medium">{entry.userName}</TableCell>
                          <TableCell>{new Date(entry.clockInTime).toLocaleString()}</TableCell>
                          <TableCell>
                            {entry.clockOutTime 
                              ? new Date(entry.clockOutTime).toLocaleString() 
                              : <Badge variant="outline">Active</Badge>
                            }
                          </TableCell>
                          <TableCell className="text-right">{entry.hoursWorked.toFixed(1)}</TableCell>
                          <TableCell>
                            <Badge variant={entry.status === "completed" ? "default" : "secondary"}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Revenue Tab - Linked to Analytics */}
        <TabsContent value="jobrevenue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Revenue by Technician</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {revenueEvents.length > 0 
                    ? `Linked to ${revenueEvents.length} revenue events from analytics`
                    : "Using job data (create revenue events for full tracking)"}
                </p>
              </div>
              <Badge variant={revenueEvents.length > 0 ? "default" : "secondary"}>
                {revenueEvents.length > 0 ? "Analytics Linked" : "Job Data"}
              </Badge>
            </CardHeader>
            <CardContent>
              {jobRevenue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <TrendingUp className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No revenue data</h3>
                  <p className="text-muted-foreground mt-1">
                    Revenue will appear here as jobs are completed
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead className="text-center">Jobs</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Labor</TableHead>
                        <TableHead className="text-right">Materials</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobRevenue.map((row) => (
                        <TableRow key={row.id} data-testid={`row-revenue-${row.id}`}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-center">{row.jobs}</TableCell>
                          <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-500">${row.labor.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-500">${row.materials.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-500 font-medium">
                            ${row.netProfit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-blue-500 font-medium">
                            ${row.commission.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Commissions Section */}
          {salesCommissionSummary.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Sales Commissions</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Commission tracking for salespersons (NET profit based)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Pending: ${totalCommissions.salesPending.toLocaleString()}</Badge>
                  <Badge variant="default">Paid: ${totalCommissions.salesPaid.toLocaleString()}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Salesperson</TableHead>
                        <TableHead className="text-center">Jobs</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesCommissionSummary.map((row) => (
                        <TableRow key={row.id} data-testid={`row-sales-commission-${row.id}`}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-center">{row.jobs}</TableCell>
                          <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-500">${row.netProfit.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">${row.commission.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-500">${row.pending.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-500">${row.paid.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payroll Records Tab - Shows technician payroll summary */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technician Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No payroll records</h3>
                  <p className="text-muted-foreground mt-1">
                    Payroll records will appear here after processing
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead className="text-center">Jobs</TableHead>
                        <TableHead className="text-center">Hours</TableHead>
                        <TableHead className="text-right">Hourly Pay</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Lead Fees</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Est. Tax</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.map((p) => (
                        <TableRow key={p.technicianId} data-testid={`row-payroll-${p.technicianId}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className={getAvatarColor(p.technicianName)}>
                                  {p.technicianName.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{p.technicianName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{p.jobsCompleted}</TableCell>
                          <TableCell className="text-center">
                            {p.totalHours}
                            {p.emergencyHours > 0 && (
                              <span className="text-amber-500 text-xs ml-1">
                                (+{p.emergencyHours} OT)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(p.regularPay + p.emergencyPay).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-500">
                            ${p.commissionEarned.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            -${p.leadFees.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${p.grossPay.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            -${p.estimatedTax.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-500">
                            ${p.netPay.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pay Rates Tab */}
        <TabsContent value="payrates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Employee Pay Rates</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setIsSetRateDialogOpen(true)}
                data-testid="button-set-rate"
              >
                <Plus className="w-4 h-4 mr-2" />
                Set Rate
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tax Rates Section */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">Tax Rates (W2 Employees Only)</p>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Federal:</span>
                    <span className="font-semibold">{TAX_RATES.federal}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">IL State:</span>
                    <span className="font-semibold">{TAX_RATES.state}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Social Security:</span>
                    <span className="font-semibold">{TAX_RATES.socialSecurity}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Medicare:</span>
                    <span className="font-semibold">{TAX_RATES.medicare}%</span>
                  </div>
                </div>
              </div>

              {/* Employee Table */}
              {employeePayRates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No employees</h3>
                  <p className="text-muted-foreground mt-1">
                    Add employees to set their pay rates
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Hourly Rate</TableHead>
                        <TableHead className="text-right">Salary</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeePayRates.map((employee) => (
                        <TableRow key={employee.id} data-testid={`row-payrate-${employee.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className={getAvatarColor(employee.name)}>
                                  {employee.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{employee.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                              {employee.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${employee.hourlyRate.toFixed(2)}/hr
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {employee.salary ? `$${employee.salary.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {employee.commission}%
                          </TableCell>
                          <TableCell>
                            {new Date(employee.effectiveDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={employee.status === "Active" 
                                ? "bg-green-500/10 text-green-500 border-green-500/30" 
                                : "bg-muted text-muted-foreground"
                              }
                            >
                              {employee.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Fees Tab */}
        <TabsContent value="leadfees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lead Fee Deductions</CardTitle>
                <Badge variant="outline" className="text-base px-3 py-1">
                  $125 per job
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {leadFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Receipt className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No lead fees</h3>
                  <p className="text-muted-foreground mt-1">
                    Lead fees will appear here as jobs are completed
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Fee Amount</TableHead>
                        <TableHead>Deducted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leadFees.map((fee) => (
                        <TableRow key={fee.id} data-testid={`row-leadfee-${fee.id}`}>
                          <TableCell className="font-medium">{fee.technicianName}</TableCell>
                          <TableCell>#{fee.jobId}</TableCell>
                          <TableCell>{fee.customerName}</TableCell>
                          <TableCell className="text-right text-red-500">
                            -${fee.feeAmount}
                          </TableCell>
                          <TableCell>
                            {fee.deductedAt 
                              ? new Date(fee.deductedAt).toLocaleDateString()
                              : "—"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={fee.status === "Deducted"
                                ? "bg-green-500/10 text-green-500 border-green-500/30"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                              }
                            >
                              {fee.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clock In Employee Dialog */}
      <Dialog open={isClockInDialogOpen} onOpenChange={setIsClockInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock In Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger data-testid="select-clock-in-employee">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClockInDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClockIn} data-testid="button-confirm-clock-in">
              <Play className="w-4 h-4 mr-2" />
              Clock In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Rate Dialog */}
      <Dialog open={isSetRateDialogOpen} onOpenChange={setIsSetRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Employee Pay Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select 
                value={newRate.employeeId} 
                onValueChange={(v) => setNewRate({...newRate, employeeId: v})}
              >
                <SelectTrigger data-testid="select-rate-employee">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select 
                value={newRate.type} 
                onValueChange={(v) => setNewRate({...newRate, type: v})}
              >
                <SelectTrigger data-testid="select-rate-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1099 Hourly">1099 Hourly</SelectItem>
                  <SelectItem value="W2 Hourly">W2 Hourly</SelectItem>
                  <SelectItem value="W2 Salary">W2 Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={newRate.hourlyRate}
                    onChange={(e) => setNewRate({...newRate, hourlyRate: e.target.value})}
                    className="pl-7"
                    data-testid="input-hourly-rate"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Commission %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={newRate.commission}
                    onChange={(e) => setNewRate({...newRate, commission: e.target.value})}
                    className="pr-7"
                    data-testid="input-commission"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetRateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetRate} data-testid="button-save-rate">
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
