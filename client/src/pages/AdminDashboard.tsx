import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import KPICard from "@/components/KPICard";
import LeadSourceChart from "@/components/LeadSourceChart";
import LeadTrendsChart from "@/components/LeadTrendsChart";
import LeadQualityChart from "@/components/LeadQualityChart";
import RecentActivity, { type ActivityItem } from "@/components/RecentActivity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, DollarSign, Phone, TrendingUp, Percent, FileText, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quote, Technician, Lead, Job } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const quoteStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: Clock },
  sent: { label: "Pending", color: "bg-amber-500/20 text-amber-400", icon: Clock },
  viewed: { label: "Viewed", color: "bg-blue-500/20 text-blue-400", icon: FileText },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-destructive/20 text-destructive", icon: XCircle },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground", icon: Clock },
};

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("month");

  const { data: quotes = [], isLoading: quotesLoading, isError: quotesError } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Quote statistics
  const quoteStats = useMemo(() => {
    const pending = quotes.filter(q => q.status === "draft" || q.status === "sent").length;
    const accepted = quotes.filter(q => q.status === "accepted").length;
    const declined = quotes.filter(q => q.status === "declined").length;
    const totalValue = quotes.reduce((sum, q) => sum + parseFloat(String(q.total || 0)), 0);
    const acceptedValue = quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + parseFloat(String(q.total || 0)), 0);
    return { pending, accepted, declined, totalValue, acceptedValue };
  }, [quotes]);

  // Calculate real KPIs from database data
  const kpis = useMemo(() => {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === "converted" || l.status === "completed").length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads * 100).toFixed(1) : "0.0";
    const totalRevenue = jobs.reduce((sum, j) => sum + parseFloat(String(j.totalRevenue || 0)), 0);
    const totalLeadCost = leads.reduce((sum, l) => sum + parseFloat(String(l.cost || 0)), 0);
    const avgLeadCost = totalLeads > 0 ? (totalLeadCost / totalLeads).toFixed(2) : "0.00";
    const missedCalls = leads.filter(l => l.status === "missed" || l.status === "no_answer").length;
    
    return {
      totalLeads: totalLeads.toString(),
      revenue: `$${totalRevenue.toLocaleString()}`,
      conversionRate: `${conversionRate}%`,
      avgLeadCost: `$${avgLeadCost}`,
      missedCalls: missedCalls.toString(),
    };
  }, [leads, jobs]);

  // Calculate lead source data from real leads
  const sourceData = useMemo(() => {
    const sources: Record<string, { count: number; cost: number }> = {};
    leads.forEach(lead => {
      const source = lead.source || "Direct";
      if (!sources[source]) {
        sources[source] = { count: 0, cost: 0 };
      }
      sources[source].count++;
      sources[source].cost += parseFloat(String(lead.cost || 0));
    });
    return Object.entries(sources).map(([name, data]) => ({
      name,
      value: data.count,
      cost: data.cost,
    }));
  }, [leads]);

  // Empty data for charts when no leads
  const trendData: { date: string; leads: number; converted: number }[] = [];
  const qualityData = [
    { category: "Valid Leads", count: leads.filter(l => l.status !== "spam" && l.status !== "duplicate").length, color: "#22c55e" },
    { category: "Duplicates", count: leads.filter(l => l.status === "duplicate").length, color: "#a855f7" },
    { category: "Spam", count: leads.filter(l => l.status === "spam").length, color: "#ef4444" },
    { category: "Missed Calls", count: leads.filter(l => l.status === "missed" || l.status === "no_answer").length, color: "#f59e0b" },
  ];
  const trendTitle = timeRange === "week" ? "Lead Trends (This Week)" : 
                     timeRange === "month" ? "Lead Trends (This Month)" :
                     timeRange === "quarter" ? "Lead Trends (This Quarter)" : "Lead Trends (This Year)";

  // Recent activity from real data
  const recentActivities: ActivityItem[] = useMemo(() => {
    const activities: ActivityItem[] = [];
    
    // Add recent leads
    leads.slice(0, 3).forEach(lead => {
      activities.push({
        id: lead.id,
        type: "lead",
        title: `New Lead: ${lead.customerName}`,
        description: `${lead.serviceType || "General inquiry"} in ${lead.city || "Chicago"}`,
        timestamp: lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : "recently",
        status: "success",
      });
    });
    
    // Add recent quotes
    quotes.slice(0, 2).forEach(quote => {
      activities.push({
        id: quote.id,
        type: "quote",
        title: `Quote sent to ${quote.customerName}`,
        description: `$${parseFloat(String(quote.total || 0)).toFixed(0)} - ${quote.address || ""}`,
        timestamp: quote.createdAt ? formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true }) : "recently",
        status: quote.status === "accepted" ? "success" : undefined,
      });
    });
    
    return activities.slice(0, 5);
  }, [leads, quotes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your lead generation and business performance
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/documentation/pdf", "_blank")}
            data-testid="button-download-docs"
          >
            <Download className="w-4 h-4 mr-2" />
            Documentation
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads}
          icon={<Users className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Revenue"
          value={kpis.revenue}
          icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Conversion Rate"
          value={kpis.conversionRate}
          icon={<Percent className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Avg Lead Cost"
          value={kpis.avgLeadCost}
          icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Missed Calls"
          value={kpis.missedCalls}
          icon={<Phone className="w-5 h-5 text-muted-foreground" />}
          variant="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadTrendsChart data={trendData} title={trendTitle} />
        </div>
        <div>
          <LeadSourceChart data={sourceData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadQualityChart data={qualityData} />
        <RecentActivity activities={recentActivities} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Quote Tracking</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-quotes">{quoteStats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-accepted-quotes">{quoteStats.accepted}</p>
                  <p className="text-sm text-muted-foreground">Accepted Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-destructive/20">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-declined-quotes">{quoteStats.declined}</p>
                  <p className="text-sm text-muted-foreground">Declined Quotes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/20">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-quote-value">${quoteStats.acceptedValue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Accepted Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Quotes
            </CardTitle>
            <CardDescription>
              Track all quotes across technicians
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
            ) : quotesError ? (
              <div className="text-center py-8 text-destructive">Failed to load quotes. Please try again.</div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No quotes yet</div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {quotes.slice(0, 20).map((quote) => {
                    const tech = technicians.find(t => t.id === quote.technicianId);
                    const status = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
                    const StatusIcon = status.icon;
                    return (
                      <div 
                        key={quote.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                        data-testid={`quote-row-${quote.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate" data-testid={`text-quote-name-${quote.id}`}>
                              {quote.customerName}
                            </p>
                            <Badge className={`${status.color} shrink-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {quote.address}
                          </p>
                          {tech && (
                            <p className="text-xs text-muted-foreground">
                              By: {tech.fullName}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-bold text-lg" data-testid={`text-quote-amount-${quote.id}`}>
                            ${parseFloat(String(quote.total || 0)).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quote.createdAt && formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
