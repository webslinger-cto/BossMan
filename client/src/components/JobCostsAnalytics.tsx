import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Briefcase, Wrench, Truck } from "lucide-react";

interface ROIAnalytics {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalRevenue: number;
  totalCost: number;
  totalLaborCost: number;
  totalMaterialsCost: number;
  totalTravelExpense: number;
  totalEquipmentCost: number;
  totalOtherExpenses: number;
  totalProfit: number;
  averageProfitMargin: number;
}

interface Job {
  id: string;
  customerName: string;
  serviceType: string;
  status: string;
  totalRevenue?: string | null;
  totalCost?: string | null;
  laborCost?: string | null;
  laborHours?: string | null;
  materialsCost?: string | null;
  travelExpense?: string | null;
  equipmentCost?: string | null;
  otherExpenses?: string | null;
  profit?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white text-sm font-medium">
            <span style={{ color: entry.color }} className="font-semibold">{entry.name}: </span>
            <span className="text-white font-bold">${entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EXPENSE_COLORS = ["#3b82f6", "#0ea5e9", "#10b981", "#8b5cf6", "#ef4444"];

export default function JobCostsAnalytics({ timeRange }: { timeRange: string }) {
  const { data: roiData, isLoading: roiLoading } = useQuery<ROIAnalytics>({
    queryKey: ["/api/analytics/roi", timeRange],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (roiLoading || jobsLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const analytics = roiData || {
    totalJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalLaborCost: 0,
    totalMaterialsCost: 0,
    totalTravelExpense: 0,
    totalEquipmentCost: 0,
    totalOtherExpenses: 0,
    totalProfit: 0,
    averageProfitMargin: 0,
  };

  // Expense breakdown for pie chart
  const expenseBreakdown = [
    { name: "Labor", value: analytics.totalLaborCost, color: EXPENSE_COLORS[0] },
    { name: "Materials", value: analytics.totalMaterialsCost, color: EXPENSE_COLORS[1] },
    { name: "Travel", value: analytics.totalTravelExpense, color: EXPENSE_COLORS[2] },
    { name: "Equipment", value: analytics.totalEquipmentCost, color: EXPENSE_COLORS[3] },
    { name: "Other", value: analytics.totalOtherExpenses, color: EXPENSE_COLORS[4] },
  ].filter(e => e.value > 0);

  // Get recent jobs with cost data for the table
  const recentJobsWithCosts = jobs
    .filter(j => j.status === "completed" || j.status === "cancelled")
    .slice(0, 10);

  // Calculate cost breakdown per job type
  const jobsByType: Record<string, { revenue: number; cost: number; count: number }> = {};
  jobs.forEach(job => {
    if (job.status === "completed" || job.status === "cancelled") {
      const serviceType = job.serviceType || "Other";
      if (!jobsByType[serviceType]) {
        jobsByType[serviceType] = { revenue: 0, cost: 0, count: 0 };
      }
      jobsByType[serviceType].revenue += parseFloat(job.totalRevenue || "0");
      jobsByType[serviceType].cost += parseFloat(job.totalCost || "0");
      jobsByType[serviceType].count += 1;
    }
  });

  const serviceROI = Object.entries(jobsByType).map(([name, data]) => ({
    name,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.revenue - data.cost,
    jobs: data.count,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-green-500" data-testid="text-job-revenue">
              {formatCurrency(analytics.totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.completedJobs} completed jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Costs</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-job-costs">
              {formatCurrency(analytics.totalCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Labor: {formatCurrency(analytics.totalLaborCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              {analytics.totalProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Profit</p>
            </div>
            <p className={`text-2xl font-bold ${analytics.totalProfit >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-job-profit">
              {formatCurrency(analytics.totalProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.averageProfitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Job Status</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-job-total">
              {analytics.totalJobs}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.cancelledJobs} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              Expense Breakdown
            </CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ROI by Service Type Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              Profit by Service Type
            </CardTitle>
            <CardDescription>Revenue vs costs per service</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceROI.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No service data available
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceROI}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Labor</p>
            <p className="text-lg font-bold text-blue-500">{formatCurrency(analytics.totalLaborCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Materials</p>
            <p className="text-lg font-bold text-blue-500">{formatCurrency(analytics.totalMaterialsCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Travel</p>
            <p className="text-lg font-bold text-green-500">{formatCurrency(analytics.totalTravelExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Equipment</p>
            <p className="text-lg font-bold text-purple-500">{formatCurrency(analytics.totalEquipmentCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Other</p>
            <p className="text-lg font-bold text-pink-500">{formatCurrency(analytics.totalOtherExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs with Cost Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Recent Completed & Cancelled Jobs
          </CardTitle>
          <CardDescription>Job details with expense breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobsWithCosts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No completed or cancelled jobs yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Hours</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Labor</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Materials</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobsWithCosts.map((job) => {
                    const profit = parseFloat(job.profit || "0");
                    return (
                      <tr key={job.id} className="border-b last:border-0" data-testid={`row-job-cost-${job.id}`}>
                        <td className="py-3 px-4 font-medium">{job.customerName}</td>
                        <td className="py-3 px-4">{job.serviceType}</td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={job.status === "completed" ? "default" : "secondary"}
                            className={job.status === "cancelled" ? "bg-red-500/20 text-red-400" : ""}
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4">{job.laborHours || "-"}</td>
                        <td className="text-right py-3 px-4">${parseFloat(job.laborCost || "0").toFixed(0)}</td>
                        <td className="text-right py-3 px-4">${parseFloat(job.materialsCost || "0").toFixed(0)}</td>
                        <td className="text-right py-3 px-4 text-green-500">${parseFloat(job.totalRevenue || "0").toFixed(0)}</td>
                        <td className={`text-right py-3 px-4 font-medium ${profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                          ${profit.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
