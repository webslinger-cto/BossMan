import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, FileText, CreditCard, UserCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type: "call" | "quote" | "payment" | "lead" | "alert";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "warning" | "danger";
}

interface RecentActivityProps {
  activities: ActivityItem[];
  title?: string;
  maxHeight?: string;
}

const activityIcons = {
  call: Phone,
  quote: FileText,
  payment: CreditCard,
  lead: UserCheck,
  alert: AlertTriangle,
};

const statusColors = {
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

export default function RecentActivity({
  activities,
  title = "Recent Activity",
  maxHeight = "350px",
}: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {activities.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }} className="px-4 pb-4">
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg bg-muted/30 border hover-elevate transition-all"
                  data-testid={`activity-${activity.id}`}
                >
                  <div
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      activity.status ? `bg-${activity.status === 'success' ? 'green' : activity.status === 'warning' ? 'yellow' : 'red'}-500/10` : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        activity.status ? statusColors[activity.status] : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {activity.timestamp}
                  </span>
                </div>
              );
            })}
            {activities.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No recent activity
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
