import { useQuery } from "@tanstack/react-query";
import { Phone, FileText, Briefcase, Receipt, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { Lead, Call, Job, Quote } from "@shared/schema";

interface TimelineEvent {
  id: string;
  type: "lead" | "call" | "job" | "quote";
  title: string;
  description: string;
  status: string;
  date: Date;
  data: Lead | Call | Job | Quote;
}

interface CustomerTimelineProps {
  phone: string;
}

export function CustomerTimeline({ phone }: CustomerTimelineProps) {
  const { data, isLoading, error } = useQuery<{
    leads: Lead[];
    calls: Call[];
    jobs: Job[];
    quotes: Quote[];
  }>({
    queryKey: ["/api/customer/timeline", phone],
    queryFn: async () => {
      const res = await fetch(`/api/customer/timeline?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
    enabled: !!phone,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Failed to load timeline
      </div>
    );
  }

  if (!data) return null;

  const events: TimelineEvent[] = [];

  data.leads.forEach((lead) => {
    events.push({
      id: `lead-${lead.id}`,
      type: "lead",
      title: "Lead Created",
      description: `${lead.serviceType || "Service inquiry"} from ${lead.source}`,
      status: lead.status,
      date: new Date(lead.createdAt),
      data: lead,
    });
  });

  data.calls.forEach((call) => {
    events.push({
      id: `call-${call.id}`,
      type: "call",
      title: call.direction === "inbound" ? "Incoming Call" : "Outgoing Call",
      description: call.duration ? `Duration: ${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "No duration",
      status: call.status,
      date: new Date(call.createdAt),
      data: call,
    });
  });

  data.jobs.forEach((job) => {
    events.push({
      id: `job-${job.id}`,
      type: "job",
      title: "Job Created",
      description: `${job.serviceType} at ${job.address}`,
      status: job.status,
      date: new Date(job.createdAt),
      data: job,
    });
  });

  data.quotes.forEach((quote) => {
    events.push({
      id: `quote-${quote.id}`,
      type: "quote",
      title: "Quote Generated",
      description: quote.total ? `Total: $${Number(quote.total).toLocaleString()}` : "Quote pending",
      status: quote.status,
      date: new Date(quote.createdAt),
      data: quote,
    });
  });

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No previous interactions found
      </div>
    );
  }

  const getIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "lead":
        return <FileText className="w-4 h-4" />;
      case "call":
        return <Phone className="w-4 h-4" />;
      case "job":
        return <Briefcase className="w-4 h-4" />;
      case "quote":
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      qualified: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      scheduled: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      converted: "bg-green-500/10 text-green-400 border-green-500/30",
      completed: "bg-green-500/10 text-green-400 border-green-500/30",
      accepted: "bg-green-500/10 text-green-400 border-green-500/30",
      lost: "bg-red-500/10 text-red-400 border-red-500/30",
      declined: "bg-red-500/10 text-red-400 border-red-500/30",
      cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      sent: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      draft: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    };
    return statusColors[status] || "bg-gray-500/10 text-gray-400 border-gray-500/30";
  };

  return (
    <ScrollArea className="h-[250px]">
      <div className="space-y-3 pr-4">
        {events.map((event, idx) => (
          <div
            key={event.id}
            className="flex gap-3 items-start"
            data-testid={`timeline-event-${event.id}`}
          >
            <div className="flex flex-col items-center">
              <div className="p-2 rounded-md bg-muted">
                {getIcon(event.type)}
              </div>
              {idx < events.length - 1 && (
                <div className="w-px h-6 bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{event.title}</span>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${getStatusColor(event.status)}`}
                >
                  {event.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {event.description}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                {format(event.date, "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
