import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format, differenceInMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  PlayCircle,
  Bell,
  FileText,
  MessageSquare,
  Timer,
} from "lucide-react";
import type { Job, JobTimelineEvent } from "@shared/schema";

const eventConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  created: { label: "Created", icon: Clock, color: "text-muted-foreground" },
  assigned: { label: "Assigned", icon: Bell, color: "text-blue-400" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-emerald-400" },
  en_route: { label: "En Route", icon: Truck, color: "text-amber-400" },
  arrived: { label: "Arrived", icon: MapPin, color: "text-purple-400" },
  started: { label: "Work Started", icon: PlayCircle, color: "text-primary" },
  quote_sent: { label: "Quote Sent", icon: FileText, color: "text-cyan-400" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-400" },
  note: { label: "Note", icon: MessageSquare, color: "text-muted-foreground" },
};

interface JobTimelineProps {
  job: Job;
  showCountdown?: boolean;
}

function TimeElapsed({ label, startTime, endTime }: { label: string; startTime: Date | null; endTime: Date | null }) {
  if (!startTime) return null;
  
  const end = endTime || new Date();
  const minutes = differenceInMinutes(end, startTime);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Timer className="w-3 h-3" />
      <span>{label}:</span>
      <span className="font-medium">
        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </span>
    </div>
  );
}

function CountdownTimer({ job }: { job: Job }) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (job.status === "completed" || job.status === "cancelled") {
    return null;
  }
  
  let statusMessage = "";
  let timeSince: Date | null = null;
  let urgencyClass = "text-muted-foreground";
  
  switch (job.status) {
    case "assigned":
      if (job.assignedAt) {
        timeSince = new Date(job.assignedAt);
        const minsSinceAssigned = differenceInMinutes(now, timeSince);
        statusMessage = "Awaiting confirmation";
        if (minsSinceAssigned > 10) urgencyClass = "text-amber-400";
        if (minsSinceAssigned > 20) urgencyClass = "text-destructive";
      }
      break;
    case "confirmed":
      if (job.confirmedAt) {
        timeSince = new Date(job.confirmedAt);
        statusMessage = "Ready to dispatch";
      }
      break;
    case "en_route":
      if (job.enRouteAt) {
        timeSince = new Date(job.enRouteAt);
        statusMessage = "Traveling to site";
      }
      break;
    case "on_site":
      if (job.arrivedAt) {
        timeSince = new Date(job.arrivedAt);
        statusMessage = "On site, ready to start";
      }
      break;
    case "in_progress":
      if (job.startedAt) {
        timeSince = new Date(job.startedAt);
        statusMessage = "Work in progress";
      }
      break;
  }
  
  if (!timeSince) return null;
  
  const minutes = differenceInMinutes(now, timeSince);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
      <div className={`shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ${urgencyClass}`}>
        <Timer className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${urgencyClass}`}>{statusMessage}</p>
        <p className="text-lg font-bold">
          {hours > 0 ? `${hours}h ${mins}m` : `${mins} min`}
        </p>
      </div>
    </div>
  );
}

function TimeMetrics({ job }: { job: Job }) {
  const assignedAt = job.assignedAt ? new Date(job.assignedAt) : null;
  const confirmedAt = job.confirmedAt ? new Date(job.confirmedAt) : null;
  const enRouteAt = job.enRouteAt ? new Date(job.enRouteAt) : null;
  const arrivedAt = job.arrivedAt ? new Date(job.arrivedAt) : null;
  const startedAt = job.startedAt ? new Date(job.startedAt) : null;
  const completedAt = job.completedAt ? new Date(job.completedAt) : null;
  
  return (
    <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Time Metrics</p>
      <TimeElapsed label="Response time" startTime={assignedAt} endTime={confirmedAt} />
      <TimeElapsed label="Dispatch to arrival" startTime={enRouteAt} endTime={arrivedAt} />
      <TimeElapsed label="On-site prep" startTime={arrivedAt} endTime={startedAt} />
      <TimeElapsed label="Work duration" startTime={startedAt} endTime={completedAt} />
      {assignedAt && completedAt && (
        <div className="pt-2 mt-2 border-t">
          <TimeElapsed label="Total job time" startTime={assignedAt} endTime={completedAt} />
        </div>
      )}
    </div>
  );
}

export default function JobTimeline({ job, showCountdown = true }: JobTimelineProps) {
  if (!job) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No job selected
      </div>
    );
  }

  const { data: events = [], isLoading } = useQuery<JobTimelineEvent[]>({
    queryKey: ["/api/jobs", job.id, "timeline"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${job.id}/timeline`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      {showCountdown && <CountdownTimer job={job} />}
      
      {job.status === "completed" && <TimeMetrics job={job} />}
      
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Timeline</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading timeline...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No timeline events yet</p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {events.map((event, index) => {
                const config = eventConfig[event.eventType] || eventConfig.note;
                const Icon = config.icon;
                return (
                  <div key={event.id} className="relative" data-testid={`timeline-event-${event.id}`}>
                    <div className={`absolute -left-4 w-4 h-4 rounded-full bg-background border-2 flex items-center justify-center ${config.color}`}>
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{config.label}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.createdAt && format(new Date(event.createdAt), "MMM d, h:mm a")}
                          {event.createdAt && (
                            <span className="ml-2">
                              ({formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
