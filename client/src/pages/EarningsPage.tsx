import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  Target,
  Award,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Percent,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { useState, useMemo } from "react";
import type { Job, Quote, SalesCommission } from "@shared/schema";

interface EarningsPageProps {
  technicianId?: string;
  salespersonId?: string;
  fullName: string;
}

const CHART_COLORS = {
  revenue: "#10b981",
  commission: "#6366f1",
  labor: "#f59e0b",
  materials: "#ef4444",
  upsell: "#8b5cf6",
  conversion: "#06b6d4",
};

export default function EarningsPage({ technicianId, salespersonId, fullName }: EarningsPageProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "year">("30d");

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: technicianId 
      ? ["/api/jobs", { technicianId }]
      : ["/api/jobs"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<SalesCommission[]>({
    queryKey: salespersonId 
      ? ["/api/salespersons", salespersonId, "commissions"]
      : ["/api/sales-commissions"],
    enabled: !!salespersonId,
  });

  const isLoading = jobsLoading || quotesLoading || (salespersonId && commissionsLoading);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "90d":
        return { start: subDays(now, 90), end: now };
      case "year":
        return { start: subDays(now, 365), end: now };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (technicianId && job.assignedTechnicianId !== technicianId) return false;
      if (salespersonId && job.assignedSalespersonId !== salespersonId) return false;
      const jobDate = job.completedAt ? new Date(job.completedAt) : job.createdAt ? new Date(job.createdAt) : null;
      if (!jobDate) return false;
      return jobDate >= rangeStart && jobDate <= rangeEnd;
    });
  }, [jobs, technicianId, salespersonId, rangeStart, rangeEnd]);

  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      const commDate = c.calculatedAt ? new Date(c.calculatedAt) : null;
      if (!commDate) return true;
      return commDate >= rangeStart && commDate <= rangeEnd;
    });
  }, [commissions, rangeStart, rangeEnd]);

  const completedJobs = filteredJobs.filter(j => j.status === "completed");
  const totalRevenue = completedJobs.reduce((sum, j) => sum + parseFloat(j.totalRevenue || "0"), 0);
  const totalProfit = completedJobs.reduce((sum, j) => sum + parseFloat(j.profit || "0"), 0);
  const totalLabor = completedJobs.reduce((sum, j) => sum + parseFloat(j.laborCost || "0"), 0);
  const totalMaterials = completedJobs.reduce((sum, j) => sum + parseFloat(j.materialsCost || "0"), 0);

  const completedJobIds = useMemo(() => new Set(completedJobs.map(j => j.id)), [completedJobs]);
  
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      if (q.jobId && completedJobIds.has(q.jobId)) return true;
      if (!technicianId && !salespersonId) return true;
      return false;
    });
  }, [quotes, completedJobIds, technicianId, salespersonId]);

  const acceptedQuotes = filteredQuotes.filter(q => q.status === "accepted");
  const sentQuotes = filteredQuotes.filter(q => ["sent", "viewed", "accepted", "declined"].includes(q.status));
  const conversionRate = sentQuotes.length > 0 ? (acceptedQuotes.length / sentQuotes.length) * 100 : 0;

  const upsellData = useMemo(() => {
    let totalOriginalQuote = 0;
    let totalFinalRevenue = 0;
    let upsellJobs = 0;

    completedJobs.forEach(job => {
      const originalQuote = quotes.find(q => q.jobId === job.id);
      if (originalQuote) {
        const quoteTotal = parseFloat(originalQuote.total || "0");
        const jobRevenue = parseFloat(job.totalRevenue || "0");
        totalOriginalQuote += quoteTotal;
        totalFinalRevenue += jobRevenue;
        if (jobRevenue > quoteTotal) {
          upsellJobs++;
        }
      }
    });

    const upsellAmount = totalFinalRevenue - totalOriginalQuote;
    const upsellPercentage = totalOriginalQuote > 0 ? (upsellAmount / totalOriginalQuote) * 100 : 0;

    return {
      totalOriginalQuote,
      totalFinalRevenue,
      upsellAmount: Math.max(0, upsellAmount),
      upsellPercentage: Math.max(0, upsellPercentage),
      upsellJobs,
    };
  }, [completedJobs, quotes]);

  const revenueByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map(day => {
      const dayJobs = completedJobs.filter(j => {
        const jobDate = j.completedAt ? new Date(j.completedAt) : null;
        return jobDate && format(jobDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      });

      return {
        date: format(day, "MMM d"),
        revenue: dayJobs.reduce((sum, j) => sum + parseFloat(j.totalRevenue || "0"), 0),
        profit: dayJobs.reduce((sum, j) => sum + parseFloat(j.profit || "0"), 0),
        jobs: dayJobs.length,
      };
    });
  }, [completedJobs, rangeStart, rangeEnd]);

  const serviceBreakdown = useMemo(() => {
    const breakdown: Record<string, { revenue: number; count: number }> = {};
    completedJobs.forEach(job => {
      const service = job.serviceType || "Other";
      if (!breakdown[service]) {
        breakdown[service] = { revenue: 0, count: 0 };
      }
      breakdown[service].revenue += parseFloat(job.totalRevenue || "0");
      breakdown[service].count++;
    });

    return Object.entries(breakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [completedJobs]);

  const costBreakdown = [
    { name: "Labor", value: totalLabor, color: CHART_COLORS.labor },
    { name: "Materials", value: totalMaterials, color: CHART_COLORS.materials },
    { name: "Profit", value: totalProfit, color: CHART_COLORS.revenue },
  ];

  const quoteConversionData = useMemo(() => {
    const sent = filteredQuotes.filter(q => q.status === "sent").length;
    const viewed = filteredQuotes.filter(q => q.status === "viewed").length;
    const accepted = filteredQuotes.filter(q => q.status === "accepted").length;
    const declined = filteredQuotes.filter(q => q.status === "declined").length;

    return [
      { name: "Sent", value: sent, color: "#3b82f6" },
      { name: "Viewed", value: viewed, color: "#f59e0b" },
      { name: "Accepted", value: accepted, color: "#10b981" },
      { name: "Declined", value: declined, color: "#ef4444" },
    ];
  }, [filteredQuotes]);

  const avgJobValue = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const commissionData = useMemo(() => {
    const totalCommission = filteredCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0);
    const paidCommissions = filteredCommissions.filter(c => c.status === "paid");
    const pendingCommissions = filteredCommissions.filter(c => c.status === "pending");
    const approvedCommissions = filteredCommissions.filter(c => c.status === "approved");
    
    return {
      totalCommission,
      paidAmount: paidCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0),
      pendingAmount: pendingCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0),
      approvedAmount: approvedCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || "0"), 0),
      count: filteredCommissions.length,
    };
  }, [filteredCommissions]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings Dashboard</h1>
          <p className="text-muted-foreground">
            Financial performance for {fullName}
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <SelectTrigger className="w-[140px]" data-testid="select-time-range">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/20">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>{completedJobs.length} jobs completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${totalProfit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
              <Percent className="w-3 h-3" />
              <span>{profitMargin.toFixed(1)}% margin</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upsell Revenue</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${upsellData.upsellAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <ArrowUpRight className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
              <Target className="w-3 h-3" />
              <span>+{upsellData.upsellPercentage.toFixed(1)}% above quotes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quote Conversion</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {conversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-cyan-500/20">
                <CheckCircle2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-cyan-400">
              <Briefcase className="w-3 h-3" />
              <span>{acceptedQuotes.length} of {sentQuotes.length} quotes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {salespersonId && commissionData.count > 0 && (
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Commission Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  ${commissionData.totalCommission.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Earned</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  ${commissionData.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Paid Out</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-blue-400">
                  ${commissionData.approvedAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Approved</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-orange-400">
                  ${commissionData.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue and profit over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.commission} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.commission} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#f3f4f6" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={CHART_COLORS.revenue}
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke={CHART_COLORS.commission}
                    fill="url(#profitGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Breakdown</CardTitle>
            <CardDescription>Where the money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {costBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Service Type</CardTitle>
            <CardDescription>Top performing service categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={11}
                    width={120}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? `$${value.toLocaleString()}` : `${value} jobs`,
                      name === "revenue" ? "Revenue" : "Jobs"
                    ]}
                  />
                  <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Funnel</CardTitle>
            <CardDescription>Quote status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quoteConversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {quoteConversionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Avg Job Value</span>
                <span className="font-bold text-emerald-400">
                  ${avgJobValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Upsell Jobs</span>
                <span className="font-bold text-purple-400">{upsellData.upsellJobs}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-emerald-400">{completedJobs.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Jobs Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-blue-400">
                ${avgJobValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Avg Job Value</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-purple-400">{profitMargin.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Profit Margin</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-cyan-400">{conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Quote Conversion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Completed Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {completedJobs.slice(0, 10).map((job) => {
                const originalQuote = quotes.find(q => q.jobId === job.id);
                const quoteTotal = originalQuote ? parseFloat(originalQuote.total || "0") : 0;
                const jobRevenue = parseFloat(job.totalRevenue || "0");
                const hasUpsell = jobRevenue > quoteTotal && quoteTotal > 0;

                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                    data-testid={`job-row-${job.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{job.customerName}</span>
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          ${jobRevenue.toLocaleString()}
                        </Badge>
                        {hasUpsell && (
                          <Badge className="bg-purple-500/20 text-purple-400">
                            +${(jobRevenue - quoteTotal).toLocaleString()} upsell
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{job.serviceType}</span>
                        {job.completedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(job.completedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className="font-bold text-blue-400">
                        ${parseFloat(job.profit || "0").toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {completedJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No completed jobs in this time range
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
