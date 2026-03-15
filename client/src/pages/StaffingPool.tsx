import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Wrench,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  XCircle,
} from "lucide-react";
import type { Technician, Job } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  available: { label: "Available", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  busy: { label: "On Job", color: "bg-blue-500/20 text-blue-400", icon: Wrench },
  on_break: { label: "On Break", color: "bg-amber-500/20 text-amber-400", icon: Coffee },
  off_duty: { label: "Off Duty", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const skillConfig: Record<string, { label: string; color: string }> = {
  junior: { label: "Junior", color: "bg-muted text-muted-foreground" },
  standard: { label: "Standard", color: "bg-blue-500/20 text-blue-400" },
  senior: { label: "Senior", color: "bg-primary/20 text-primary" },
};

function TechnicianCard({ 
  technician, 
  currentJob,
  onStatusChange,
  isUpdating
}: { 
  technician: Technician;
  currentJob?: Job;
  onStatusChange: (techId: string, status: string) => void;
  isUpdating: boolean;
}) {
  const status = statusConfig[technician.status] || statusConfig.available;
  const skill = skillConfig[technician.skillLevel || "standard"] || skillConfig.standard;
  const StatusIcon = status.icon;

  const capacityUsed = ((technician.completedJobsToday || 0) / (technician.maxDailyJobs || 8)) * 100;
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(technician.fullName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold" data-testid={`text-tech-name-${technician.id}`}>
                  {technician.fullName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${skill.color} text-xs`}>
                    {skill.label}
                  </Badge>
                  <Badge className={`${status.color} text-xs`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>
              
              <Select 
                value={technician.status} 
                onValueChange={(val) => onStatusChange(technician.id, val)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-32" data-testid={`select-status-${technician.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">On Job</SelectItem>
                  <SelectItem value="on_break">On Break</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span className="truncate">{technician.phone}</span>
              </div>
              {technician.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{technician.email}</span>
                </div>
              )}
            </div>

            {currentJob && technician.status === "busy" && (
              <div className="p-2 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Current Job</p>
                <p className="text-sm font-medium truncate">{currentJob.customerName}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{currentJob.address}, {currentJob.city}</span>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Daily Capacity</span>
                <span>{technician.completedJobsToday || 0} / {technician.maxDailyJobs || 8} jobs</span>
              </div>
              <Progress value={capacityUsed} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffingPool() {
  const { toast } = useToast();

  const { data: technicians = [], isLoading } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ techId, status, previousStatus }: { techId: string; status: string; previousStatus: string }) => {
      await apiRequest("PATCH", `/api/technicians/${techId}`, { status });
      
      // Create shift log if transitioning to/from available
      if (status === "available" && previousStatus !== "available") {
        // Tech is becoming available - clock in
        await apiRequest("POST", "/api/shift-logs", {
          technicianId: techId,
          action: "clock_in",
        });
      } else if (previousStatus === "available" && status !== "available") {
        // Tech is leaving available status - clock out
        await apiRequest("POST", "/api/shift-logs", {
          technicianId: techId,
          action: "clock_out",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      toast({
        title: "Status Updated",
        description: "Technician status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update technician status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (techId: string, status: string) => {
    const tech = technicians.find(t => t.id === techId);
    const previousStatus = tech?.status || "off_duty";
    updateStatusMutation.mutate({ techId, status, previousStatus });
  };

  const getCurrentJob = (technician: Technician) => {
    if (technician.currentJobId) {
      return jobs.find(j => j.id === technician.currentJobId);
    }
    return undefined;
  };

  const availableTechs = technicians.filter(t => t.status === "available");
  const busyTechs = technicians.filter(t => t.status === "busy");
  const breakTechs = technicians.filter(t => t.status === "on_break");
  const offDutyTechs = technicians.filter(t => t.status === "off_duty");

  const totalCapacity = technicians.reduce((acc, t) => acc + (t.maxDailyJobs || 8), 0);
  const usedCapacity = technicians.reduce((acc, t) => acc + (t.completedJobsToday || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading technicians...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Staffing Pool</h1>
        <p className="text-muted-foreground">Manage technician availability and assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-available-count">{availableTechs.length}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/20">
                <Wrench className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-busy-count">{busyTechs.length}</p>
                <p className="text-sm text-muted-foreground">On Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/20">
                <Coffee className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-break-count">{breakTechs.length}</p>
                <p className="text-sm text-muted-foreground">On Break</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-count">{technicians.length}</p>
                <p className="text-sm text-muted-foreground">Total Techs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Team Capacity</span>
            <span className="text-sm font-normal text-muted-foreground">
              {usedCapacity} / {totalCapacity} jobs completed today
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {technicians.map((tech) => (
          <TechnicianCard
            key={tech.id}
            technician={tech}
            currentJob={getCurrentJob(tech)}
            onStatusChange={handleStatusChange}
            isUpdating={updateStatusMutation.isPending}
          />
        ))}
      </div>

      {technicians.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Technicians Found</h3>
            <p className="text-muted-foreground">
              Add technicians to start managing your staffing pool.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
