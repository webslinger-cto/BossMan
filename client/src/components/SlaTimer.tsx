import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface SlaTimerProps {
  slaDeadline: string | Date | null;
  contactedAt: string | Date | null;
  className?: string;
}

export function SlaTimer({ slaDeadline, contactedAt, className = "" }: SlaTimerProps) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [status, setStatus] = useState<"ok" | "warning" | "breached" | "contacted">("ok");

  useEffect(() => {
    if (contactedAt) {
      setStatus("contacted");
      return;
    }

    if (!slaDeadline) {
      setStatus("ok");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const deadline = new Date(slaDeadline);
      const diffMs = deadline.getTime() - now.getTime();
      const diffMinutes = Math.ceil(diffMs / 60000);
      
      setRemainingTime(diffMinutes);
      
      if (diffMinutes <= 0) {
        setStatus("breached");
      } else if (diffMinutes <= 5) {
        setStatus("warning");
      } else {
        setStatus("ok");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 10000);
    return () => clearInterval(interval);
  }, [slaDeadline, contactedAt]);

  if (status === "contacted") {
    return (
      <Badge variant="outline" className={`bg-green-500/10 text-green-600 border-green-500/30 ${className}`} data-testid="badge-sla-contacted">
        <CheckCircle className="w-3 h-3 mr-1" />
        Contacted
      </Badge>
    );
  }

  if (status === "breached") {
    return (
      <Badge variant="destructive" className={className} data-testid="badge-sla-breached">
        <AlertTriangle className="w-3 h-3 mr-1" />
        SLA Breached
      </Badge>
    );
  }

  if (status === "warning") {
    return (
      <Badge variant="outline" className={`bg-yellow-500/10 text-yellow-600 border-yellow-500/30 animate-pulse ${className}`} data-testid="badge-sla-warning">
        <Clock className="w-3 h-3 mr-1" />
        {remainingTime}m left
      </Badge>
    );
  }

  if (!slaDeadline) {
    return (
      <Badge variant="outline" className={`text-muted-foreground/50 ${className}`} data-testid="badge-sla-none">
        <Clock className="w-3 h-3 mr-1" />
        No SLA
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`text-muted-foreground ${className}`} data-testid="badge-sla-ok">
      <Clock className="w-3 h-3 mr-1" />
      {remainingTime}m
    </Badge>
  );
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return "Breached";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
