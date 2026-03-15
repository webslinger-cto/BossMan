import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, CheckCircle, XCircle, TrendingUp } from "lucide-react";

export type TechnicianClassification = "senior" | "junior" | "digger";

export interface Technician {
  id: string;
  name: string;
  initials: string;
  phone: string;
  totalJobs: number;
  completedJobs: number;
  canceledJobs: number;
  revenue: number;
  conversionRate: number;
  status: "online" | "busy" | "offline";
  classification: TechnicianClassification;
  hourlyRate: number;
  commissionRate: number;
}

interface TechnicianCardProps {
  technician: Technician;
  onClick?: (tech: Technician) => void;
}

const statusColors = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  offline: "bg-gray-500",
};

const classificationColors: Record<TechnicianClassification, string> = {
  senior: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  junior: "bg-sky-500/10 text-sky-500 border-sky-500/30",
  digger: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

export default function TechnicianCard({ technician, onClick }: TechnicianCardProps) {
  const successRate = (technician.completedJobs / technician.totalJobs) * 100;

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      onClick={() => onClick?.(technician)}
      data-testid={`card-technician-${technician.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {technician.initials}
              </AvatarFallback>
            </Avatar>
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${statusColors[technician.status]}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{technician.name}</h3>
              <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                {technician.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              <span>{technician.phone}</span>
            </div>
            <Badge variant="outline" className={`mt-1 text-xs capitalize ${classificationColors[technician.classification]}`}>
              {technician.classification}
            </Badge>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-lg font-bold">{technician.totalJobs}</p>
              <p className="text-xs text-muted-foreground">Jobs</p>
            </div>
            <div className="p-2 rounded-md bg-green-500/10">
              <p className="text-lg font-bold text-green-500">{technician.completedJobs}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="p-2 rounded-md bg-red-500/10">
              <p className="text-lg font-bold text-red-500">{technician.canceledJobs}</p>
              <p className="text-xs text-muted-foreground">Canceled</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-medium">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span>{technician.conversionRate}% conversion</span>
            </div>
            <span className="font-semibold text-green-500">
              ${technician.revenue.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-muted-foreground">${technician.hourlyRate}/hr</span>
            <span className="text-muted-foreground">{(technician.commissionRate * 100).toFixed(0)}% commission</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
