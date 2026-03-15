import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import JobTimeline from "@/components/JobTimeline";
import { JobChat } from "@/components/JobChat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  MapPin,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Truck,
  PlayCircle,
  Calendar,
  Plus,
  Moon,
  Sun,
  PhoneCall,
  UserCheck,
  UserX,
  Bell,
  Shield,
  FileText,
  ClipboardList,
} from "lucide-react";
import type { Job, Lead, Call, Technician, Quote, PricebookItem } from "@shared/schema";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { DollarSign, Trash2, Save, Send, X, Edit3 } from "lucide-react";

const jobStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  assigned: { label: "Assigned", color: "bg-blue-500/20 text-blue-400", icon: User },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  en_route: { label: "En Route", color: "bg-amber-500/20 text-amber-400", icon: Truck },
  on_site: { label: "On Site", color: "bg-purple-500/20 text-purple-400", icon: MapPin },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-blue-500/20 text-blue-400" },
  high: { label: "High", color: "bg-amber-500/20 text-amber-400" },
  urgent: { label: "Urgent", color: "bg-destructive/20 text-destructive" },
};

interface EmergencyTeamMember {
  id: string;
  technicianId: string;
  technicianName: string;
  phone: string;
  isOnCall: boolean;
  isPrimary: boolean;
  lastCallTime?: string;
  callsHandled: number;
}

// Emergency team populated from actual technicians
const initialEmergencyTeam: EmergencyTeamMember[] = [];

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  sent: { label: "Pending Review", color: "bg-amber-500/20 text-amber-400" },
  viewed: { label: "Viewed", color: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400" },
  declined: { label: "Declined", color: "bg-destructive/20 text-destructive" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

function QuoteReviewCard({ quote, jobs, technicians }: { quote: Quote; jobs: Job[]; technicians: Technician[] }) {
  const { toast } = useToast();
  const job = jobs.find(j => j.id === quote.jobId);
  const technician = technicians.find(t => t.id === quote.technicianId);
  const status = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
  
  let lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
  try {
    if (quote.lineItems) {
      lineItems = JSON.parse(quote.lineItems);
    }
  } catch {
    lineItems = [];
  }

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/quotes/${quote.id}`, { status: "sent", acceptedAt: new Date().toISOString() });
      if (quote.jobId) {
        await apiRequest("PATCH", `/api/jobs/${quote.jobId}`, { status: "pending", assignedTechnicianId: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Quote Approved",
        description: "The quote has been approved and the job is now on the dispatch board.",
      });
    },
    onError: () => {
      toast({
        title: "Approval Failed",
        description: "Could not approve the quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/quotes/${quote.id}`, { status: "declined" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote Rejected",
        description: "The quote has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Rejection Failed",
        description: "Could not reject the quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid={`quote-card-${quote.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium" data-testid={`text-quote-customer-${quote.id}`}>
                {quote.customerName}
              </p>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {quote.address}
            </p>
            {technician && (
              <p className="text-sm text-muted-foreground">
                Created by: {technician.fullName}
              </p>
            )}
            {job && (
              <p className="text-sm text-muted-foreground">
                Job: {job.serviceType}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary" data-testid={`text-quote-total-${quote.id}`}>
              ${parseFloat(String(quote.total || 0)).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              Created {quote.createdAt && formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-right p-2 font-medium">Qty</th>
                  <th className="text-right p-2 font-medium">Price</th>
                  <th className="text-right p-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">${parseFloat(String(item.unitPrice || 0)).toFixed(2)}</td>
                    <td className="p-2 text-right">${parseFloat(String(item.total || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Subtotal: ${parseFloat(String(quote.subtotal || 0)).toFixed(2)}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Tax: ${parseFloat(String(quote.taxAmount || 0)).toFixed(2)}</span>
        </div>

        {quote.notes && (
          <div className="bg-muted/30 rounded-lg p-3 mb-4">
            <p className="text-sm">{quote.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            data-testid={`button-reject-quote-${quote.id}`}
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            data-testid={`button-approve-quote-${quote.id}`}
          >
            {approveMutation.isPending ? "Approving..." : "Approve & Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({ job, onAssign, onViewDetails }: { job: Job; onAssign: (job: Job) => void; onViewDetails?: (job: Job) => void }) {
  const status = jobStatusConfig[job.status] || jobStatusConfig.pending;
  const priority = priorityConfig[job.priority || "normal"] || priorityConfig.normal;
  const StatusIcon = status.icon;

  return (
    <Card 
      className="mb-2 cursor-pointer hover-elevate" 
      onClick={() => onViewDetails?.(job)}
      data-testid={`job-card-${job.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`text-job-customer-${job.id}`}>
              {job.customerName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{job.serviceType}</p>
          </div>
          <Badge className={`${priority.color} text-xs shrink-0`}>
            {priority.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{job.address}, {job.city}</span>
        </div>

        {job.scheduledDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            <span>
              {format(new Date(job.scheduledDate), "MMM d")} {job.scheduledTimeStart && `at ${job.scheduledTimeStart}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Badge className={`${status.color} text-xs`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
          
          {job.status !== "completed" && job.status !== "cancelled" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onAssign(job); }}
              data-testid={`button-assign-job-${job.id}`}
            >
              <User className="w-3 h-3 mr-1" />
              {job.assignedTechnicianId ? "Reassign" : "Assign"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CallItem({ call }: { call: Call }) {
  const isInbound = call.direction === "inbound";
  const Icon = isInbound ? PhoneIncoming : PhoneOutgoing;

  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <div className={`p-2 rounded-md ${isInbound ? "bg-emerald-500/20" : "bg-blue-500/20"}`}>
        <Icon className={`w-4 h-4 ${isInbound ? "text-emerald-400" : "text-blue-400"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid={`text-call-phone-${call.id}`}>
          {call.callerName || call.callerPhone}
        </p>
        <p className="text-xs text-muted-foreground">
          {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "Missed"}
        </p>
      </div>
      <div className="text-xs text-muted-foreground">
        {call.createdAt && formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}

function LeadItem({ lead }: { lead: Lead }) {
  const priority = priorityConfig[lead.priority || "normal"] || priorityConfig.normal;

  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <div className="p-2 rounded-md bg-primary/20">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid={`text-lead-name-${lead.id}`}>
          {lead.customerName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {lead.source} - {lead.serviceType || "General inquiry"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={`${priority.color} text-xs`}>
          {priority.label}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {lead.status}
        </Badge>
      </div>
    </div>
  );
}

function AssignJobDialog({ 
  job, 
  technicians, 
  open, 
  onOpenChange,
  onAssign,
  isPending
}: { 
  job: Job | null; 
  technicians: Technician[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (jobId: string, technicianId: string) => void;
  isPending: boolean;
}) {
  const [selectedTech, setSelectedTech] = useState<string>("");

  if (!job) return null;

  const availableTechs = technicians.filter(t => t.status === "available");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Job to Technician</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{job.customerName}</p>
            <p className="text-sm text-muted-foreground">{job.serviceType}</p>
            <p className="text-sm text-muted-foreground">{job.address}, {job.city}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Technician</label>
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger data-testid="select-technician">
                <SelectValue placeholder="Choose a technician..." />
              </SelectTrigger>
              <SelectContent>
                {availableTechs.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No available technicians
                  </div>
                ) : (
                  availableTechs.map((tech) => (
                    <SelectItem 
                      key={tech.id} 
                      value={tech.id}
                      data-testid={`option-technician-${tech.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span>{tech.fullName}</span>
                        <Badge variant="outline" className="text-xs capitalize ml-2">
                          {tech.skillLevel}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-assign">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTech && job) {
                  onAssign(job.id, selectedTech);
                }
              }}
              disabled={!selectedTech || isPending}
              data-testid="button-confirm-assign"
            >
              {isPending ? "Assigning..." : "Assign Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmergencyTeamMemberCard({ 
  member, 
  onToggleOnCall, 
  onSetPrimary 
}: { 
  member: EmergencyTeamMember; 
  onToggleOnCall: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  return (
    <Card className={`${member.isOnCall ? "border-emerald-500/50" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${member.isOnCall ? "bg-emerald-500/20" : "bg-muted"}`}>
              {member.isOnCall ? (
                <UserCheck className={`w-5 h-5 ${member.isPrimary ? "text-primary" : "text-emerald-400"}`} />
              ) : (
                <UserX className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium" data-testid={`text-oncall-name-${member.id}`}>{member.technicianName}</p>
                {member.isPrimary && (
                  <Badge className="bg-primary/20 text-primary text-xs">Primary</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={member.isOnCall}
              onCheckedChange={() => onToggleOnCall(member.id)}
              data-testid={`switch-oncall-${member.id}`}
            />
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              <span>{member.callsHandled} calls handled</span>
            </div>
          </div>
          {member.isOnCall && !member.isPrimary && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSetPrimary(member.id)}
              data-testid={`button-set-primary-${member.id}`}
            >
              <Shield className="w-3 h-3 mr-1" />
              Set Primary
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CallTeamTab({ technicians }: { technicians: Technician[] }) {
  const { toast } = useToast();
  const [emergencyTeam, setEmergencyTeam] = useState<EmergencyTeamMember[]>(initialEmergencyTeam);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTechToAdd, setSelectedTechToAdd] = useState<string>("");

  const currentHour = new Date().getHours();
  const isNightShift = currentHour >= 19 || currentHour < 7;

  const onCallCount = emergencyTeam.filter(m => m.isOnCall).length;
  const primaryMember = emergencyTeam.find(m => m.isPrimary && m.isOnCall);

  const handleToggleOnCall = (id: string) => {
    setEmergencyTeam(prev => prev.map(m => {
      if (m.id === id) {
        const newOnCall = !m.isOnCall;
        if (!newOnCall && m.isPrimary) {
          return { ...m, isOnCall: false, isPrimary: false };
        }
        return { ...m, isOnCall: newOnCall };
      }
      return m;
    }));
    toast({
      title: "On-Call Status Updated",
      description: "Technician on-call status has been changed.",
    });
  };

  const handleSetPrimary = (id: string) => {
    setEmergencyTeam(prev => prev.map(m => ({
      ...m,
      isPrimary: m.id === id,
    })));
    toast({
      title: "Primary Contact Updated",
      description: "Primary on-call technician has been set.",
    });
  };

  const handleAddToTeam = () => {
    if (!selectedTechToAdd) return;
    const tech = technicians.find(t => t.id === selectedTechToAdd);
    if (!tech) return;

    const alreadyInTeam = emergencyTeam.some(m => m.technicianId === selectedTechToAdd);
    if (alreadyInTeam) {
      toast({
        title: "Already in Team",
        description: "This technician is already part of the emergency team.",
        variant: "destructive",
      });
      return;
    }

    const newMember: EmergencyTeamMember = {
      id: `new-${Date.now()}`,
      technicianId: tech.id,
      technicianName: tech.fullName,
      phone: tech.phone,
      isOnCall: true,
      isPrimary: false,
      callsHandled: 0,
    };

    setEmergencyTeam(prev => [...prev, newMember]);
    setAddDialogOpen(false);
    setSelectedTechToAdd("");
    toast({
      title: "Technician Added",
      description: `${tech.fullName} has been added to the emergency call team.`,
    });
  };

  const handleRemoveFromTeam = (id: string) => {
    setEmergencyTeam(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Technician Removed",
      description: "Technician has been removed from the emergency team.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isNightShift ? (
            <div className="p-3 rounded-lg bg-indigo-500/20">
              <Moon className="w-6 h-6 text-indigo-400" />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/20">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">Emergency Call Team</h2>
            <p className="text-sm text-muted-foreground">7:00 PM - 7:00 AM After-Hours Coverage</p>
          </div>
        </div>
        <Badge className={isNightShift ? "bg-indigo-500/20 text-indigo-400" : "bg-muted text-muted-foreground"}>
          {isNightShift ? "Night Shift Active" : "Day Shift"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-500/20">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-oncall-count">{onCallCount}</p>
                <p className="text-sm text-muted-foreground">On-Call Techs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold truncate" data-testid="text-primary-oncall">
                  {primaryMember?.technicianName || "Not Set"}
                </p>
                <p className="text-sm text-muted-foreground">Primary Contact</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/20">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Rings Before Forward</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Call Team Roster</CardTitle>
              <CardDescription>Technicians available for after-hours emergency calls</CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-to-team">
              <Plus className="w-4 h-4 mr-2" />
              Add Technician
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emergencyTeam.map((member) => (
              <EmergencyTeamMemberCard
                key={member.id}
                member={member}
                onToggleOnCall={handleToggleOnCall}
                onSetPrimary={handleSetPrimary}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Call Forwarding Rules</CardTitle>
          <CardDescription>Automated routing for after-hours calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Main Office Line</p>
                  <p className="text-sm text-muted-foreground">(312) 555-PIPE</p>
                </div>
              </div>
              <div className="text-sm text-right">
                <p className="text-muted-foreground">After 4 rings, forward to:</p>
                <p className="font-medium text-primary">{primaryMember?.technicianName || "Primary On-Call"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium">Escalation Path</p>
                  <p className="text-sm text-muted-foreground">If primary doesn't answer in 30s</p>
                </div>
              </div>
              <div className="text-sm text-right">
                <p className="text-muted-foreground">Forward to:</p>
                <p className="font-medium">Next Available On-Call</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <PhoneCall className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium">Final Fallback</p>
                  <p className="text-sm text-muted-foreground">If no technician answers</p>
                </div>
              </div>
              <div className="text-sm text-right">
                <p className="text-muted-foreground">Forward to:</p>
                <p className="font-medium">Answering Service</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Technician to Emergency Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Technician</label>
              <Select value={selectedTechToAdd} onValueChange={setSelectedTechToAdd}>
                <SelectTrigger data-testid="select-add-technician">
                  <SelectValue placeholder="Choose a technician..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span>{tech.fullName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddToTeam} disabled={!selectedTechToAdd} data-testid="button-confirm-add-team">
                Add to Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Quote Builder Tab Component with RightFlow CRM Style
interface QuoteLineItem {
  id: string;
  pricebookItemId?: string;
  description: string;
  customDescription?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteBuilderTabProps {
  jobs: Job[];
  technicians: Technician[];
}

function QuoteBuilderTab({ jobs, technicians }: QuoteBuilderTabProps) {
  const { toast } = useToast();
  
  // View state: list or create
  const [view, setView] = useState<"list" | "create">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  
  // Form state
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [laborFee, setLaborFee] = useState(0);
  const [materialsCost, setMaterialsCost] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<string[]>(["email"]);

  // Fetch all quotes
  const { data: allQuotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  // Fetch pricebook items
  const { data: pricebookItems = [] } = useQuery<PricebookItem[]>({
    queryKey: ["/api/pricebook/items"],
  });

  // Filter quotes
  const filteredQuotes = allQuotes.filter((quote) => {
    const matchesSearch = searchQuery === "" || 
      quote.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    const matchesArchived = showArchived ? quote.status === "declined" || quote.status === "expired" : 
      quote.status !== "declined" && quote.status !== "expired";
    
    return matchesSearch && matchesStatus && matchesArchived;
  });

  // Calculate totals
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const subtotal = lineItemsTotal + laborFee + materialsCost;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // Add new line item row
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }
    ]);
  };

  // Update line item from pricebook selection
  const updateLineItemFromPricebook = (itemId: string, pricebookItemId: string) => {
    const pricebookItem = pricebookItems.find(p => p.id === pricebookItemId);
    if (!pricebookItem) return;
    
    setLineItems(lineItems.map(item => 
      item.id === itemId ? {
        ...item,
        pricebookItemId,
        description: pricebookItem.name,
        unitPrice: parseFloat(pricebookItem.basePrice || "0"),
        total: item.quantity * parseFloat(pricebookItem.basePrice || "0")
      } : item
    ));
  };

  // Update line item quantity
  const updateLineItemQuantity = (itemId: string, qty: number) => {
    setLineItems(lineItems.map(item =>
      item.id === itemId ? { ...item, quantity: qty, total: qty * item.unitPrice } : item
    ));
  };

  // Update line item price
  const updateLineItemPrice = (itemId: string, price: number) => {
    setLineItems(lineItems.map(item =>
      item.id === itemId ? { ...item, unitPrice: price, total: item.quantity * price } : item
    ));
  };

  // Update custom description
  const updateLineItemCustomDesc = (itemId: string, desc: string) => {
    setLineItems(lineItems.map(item =>
      item.id === itemId ? { ...item, customDescription: desc } : item
    ));
  };

  // Remove line item
  const removeLineItem = (itemId: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter(item => item.id !== itemId));
  };

  // Reset form
  const resetForm = () => {
    setEditingQuoteId(null);
    setSelectedJobId("");
    setSelectedTechnicianId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setAddress("");
    setZipCode("");
    setLineItems([{ id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }]);
    setLaborFee(0);
    setMaterialsCost(0);
    setTaxRate(0);
    setNotes("");
    setPreferredContactMethod(["email"]);
  };

  // Handle job selection - auto-fill customer info
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setCustomerName(job.customerName);
      setCustomerPhone(job.customerPhone || "");
      setCustomerEmail(job.customerEmail || "");
      setAddress(`${job.address}${job.city ? `, ${job.city}` : ""}`);
      setZipCode(job.zipCode || "");
      if (job.assignedTechnicianId) {
        setSelectedTechnicianId(job.assignedTechnicianId);
      }
    }
  };

  // Get available jobs for selection
  const availableJobs = jobs.filter(
    (j) => j.status === "new" || j.status === "pending" || j.status === "assigned" || j.status === "on_site" || j.status === "in_progress"
  );

  // Open create view
  const openCreateView = () => {
    resetForm();
    setView("create");
  };

  // Load quote for editing
  const loadQuoteForEdit = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setSelectedJobId(quote.jobId || "");
    setSelectedTechnicianId(quote.technicianId || "");
    setCustomerName(quote.customerName);
    setCustomerPhone(quote.customerPhone || "");
    setCustomerEmail(quote.customerEmail || "");
    setAddress(quote.address || "");
    setZipCode("");
    setTaxRate(parseFloat(quote.taxRate || "0"));
    setNotes(quote.notes || "");
    setLaborFee(parseFloat(quote.laborTotal || "0"));
    setMaterialsCost(0);
    setPreferredContactMethod(quote.preferredContactMethod ? quote.preferredContactMethod.split(",") : ["email"]);
    
    try {
      const items = JSON.parse(quote.lineItems || "[]");
      if (items.length > 0) {
        setLineItems(items.map((item: QuoteLineItem) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
        })));
      } else {
        setLineItems([{ id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }]);
      }
    } catch {
      setLineItems([{ id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }]);
    }
    
    setView("create");
  };

  // Save quote mutation
  const saveQuoteMutation = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      // Filter out empty line items
      const validLineItems = lineItems.filter(item => item.description || item.customDescription);
      
      const quoteData = {
        jobId: selectedJobId || undefined, // Optional - job is created when quote is accepted
        technicianId: selectedTechnicianId || undefined,
        customerName,
        customerPhone,
        customerEmail,
        address,
        preferredContactMethod: preferredContactMethod.join(","),
        lineItems: JSON.stringify(validLineItems),
        laborTotal: laborFee.toString(),
        subtotal: subtotal.toString(),
        taxRate: taxRate.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        notes,
        status,
        sentAt: status === "sent" ? new Date().toISOString() : undefined,
      };

      if (editingQuoteId) {
        return apiRequest("PATCH", `/api/quotes/${editingQuoteId}`, quoteData);
      } else {
        return apiRequest("POST", "/api/quotes", quoteData);
      }
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: status === "draft" ? "Quote Saved" : "Quote Sent",
        description: status === "draft" 
          ? "Quote saved as draft" 
          : "Quote has been sent to the customer",
      });
      resetForm();
      setView("list");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save quote",
        variant: "destructive",
      });
    },
  });

  // Quote List View
  if (view === "list") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Quotes</h2>
            <p className="text-muted-foreground">Create and manage customer quotes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              data-testid="button-toggle-archived"
            >
              <FileText className="w-4 h-4 mr-2" />
              Archived
            </Button>
            <Button onClick={openCreateView} data-testid="button-new-quote">
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search quotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                  data-testid="input-search-quotes"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quotes List */}
        <Card>
          <CardContent className="p-6">
            {quotesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading quotes...</div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">No quotes found</p>
                <p className="text-muted-foreground mb-4">Start by creating your first quote</p>
                <Button onClick={openCreateView} data-testid="button-create-first-quote">
                  Create Quote
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 border rounded-md hover-elevate cursor-pointer"
                    onClick={() => loadQuoteForEdit(quote)}
                    data-testid={`quote-row-${quote.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{quote.customerName}</p>
                      <p className="text-sm text-muted-foreground">{quote.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${parseFloat(quote.total || "0").toFixed(2)}</p>
                      <Badge className={quoteStatusConfig[quote.status]?.color || "bg-muted"}>
                        {quoteStatusConfig[quote.status]?.label || quote.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create/Edit Quote View
  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { resetForm(); setView("list"); }}
          data-testid="button-back-to-list"
        >
          <X className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{editingQuoteId ? "Edit Quote" : "Create Quote"}</h2>
          <p className="text-muted-foreground">Build a detailed quote for your customer</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder=""
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder=""
                    data-testid="input-customer-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder=""
                    data-testid="input-customer-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder=""
                    data-testid="input-address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Zip Code (for tax calculation)</Label>
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="e.g., 60455"
                  className="max-w-xs"
                  data-testid="input-zipcode"
                />
              </div>
              <div className="space-y-3 pt-2">
                <Label>Preferred Contact Method</Label>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contact-email"
                      checked={preferredContactMethod.includes("email")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPreferredContactMethod([...preferredContactMethod, "email"]);
                        } else {
                          setPreferredContactMethod(preferredContactMethod.filter(m => m !== "email"));
                        }
                      }}
                      data-testid="checkbox-contact-email"
                    />
                    <label htmlFor="contact-email" className="text-sm font-medium cursor-pointer">
                      Email
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contact-sms"
                      checked={preferredContactMethod.includes("sms")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPreferredContactMethod([...preferredContactMethod, "sms"]);
                        } else {
                          setPreferredContactMethod(preferredContactMethod.filter(m => m !== "sms"));
                        }
                      }}
                      data-testid="checkbox-contact-sms"
                    />
                    <label htmlFor="contact-sms" className="text-sm font-medium cursor-pointer">
                      Text Message
                    </label>
                  </div>
                </div>
                {preferredContactMethod.length === 0 && (
                  <p className="text-sm text-amber-500">Please select at least one contact method</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-3 mb-3 text-sm font-medium text-muted-foreground">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Line Items */}
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="space-y-2">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <Select
                          value={item.pricebookItemId || ""}
                          onValueChange={(val) => updateLineItemFromPricebook(item.id, val)}
                        >
                          <SelectTrigger data-testid={`select-pricebook-${index}`}>
                            <SelectValue placeholder="Select from pricebook..." />
                          </SelectTrigger>
                          <SelectContent>
                            {pricebookItems.filter(p => p.isActive).map((pItem) => (
                              <SelectItem key={pItem.id} value={pItem.id}>
                                {pItem.name} - ${parseFloat(pItem.basePrice || "0").toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity === 0 ? "" : item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItemQuantity(item.id, val === "" ? 0 : parseInt(val) || 0);
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "" || parseInt(e.target.value) < 1) {
                              updateLineItemQuantity(item.id, 1);
                            }
                          }}
                          min={1}
                          data-testid={`input-qty-${index}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitPrice === 0 ? "" : item.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItemPrice(item.id, val === "" ? 0 : parseFloat(val) || 0);
                          }}
                          step="0.01"
                          data-testid={`input-price-${index}`}
                        />
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        ${item.total.toFixed(2)}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length <= 1}
                          data-testid={`button-remove-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={item.customDescription || ""}
                      onChange={(e) => updateLineItemCustomDesc(item.id, e.target.value)}
                      placeholder="Or enter custom description..."
                      className="text-sm"
                      data-testid={`input-custom-desc-${index}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or terms for this quote..."
                rows={4}
                data-testid="input-notes"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quote Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Line Items Total */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Line Items</span>
                <span className="font-medium">${lineItemsTotal.toFixed(2)}</span>
              </div>

              {/* Labor Fee */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Labor Fee</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={laborFee === 0 ? "" : laborFee}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLaborFee(val === "" ? 0 : parseFloat(val) || 0);
                    }}
                    className="w-20 text-right"
                    step="0.01"
                    data-testid="input-labor-fee"
                  />
                </div>
              </div>

              {/* Materials Cost */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Materials Cost</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={materialsCost === 0 ? "" : materialsCost}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaterialsCost(val === "" ? 0 : parseFloat(val) || 0);
                    }}
                    className="w-20 text-right"
                    step="0.01"
                    data-testid="input-materials-cost"
                  />
                </div>
              </div>

              <Separator />

              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Tax Rate */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax Rate</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={taxRate === 0 ? "" : taxRate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaxRate(val === "" ? 0 : parseFloat(val) || 0);
                    }}
                    className="w-16 text-right"
                    step="0.1"
                    data-testid="input-tax-rate"
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="ml-2 font-medium">${taxAmount.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={() => saveQuoteMutation.mutate("sent")}
                  disabled={!customerName || !address || preferredContactMethod.length === 0 || saveQuoteMutation.isPending}
                  data-testid="button-send-quote"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Quote
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => saveQuoteMutation.mutate("draft")}
                  disabled={!customerName || !address || preferredContactMethod.length === 0 || saveQuoteMutation.isPending}
                  data-testid="button-save-draft"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface DispatcherDashboardProps {
  userId?: string;
}

export default function DispatcherDashboard({ userId }: DispatcherDashboardProps = {}) {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState("dispatch");
  const [showCustomerSnapshot, setShowCustomerSnapshot] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls?limit=10"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: quotes = [], isLoading: quotesLoading, isError: quotesError } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const pendingQuotes = quotes.filter(q => q.status === "draft");

  const assignMutation = useMutation({
    mutationFn: async ({ jobId, technicianId }: { jobId: string; technicianId: string }) => {
      return apiRequest("POST", `/api/jobs/${jobId}/assign`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setAssignDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Job Assigned",
        description: "The technician has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Could not assign the job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssign = (job: Job) => {
    setSelectedJob(job);
    setAssignDialogOpen(true);
  };

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setDetailsDialogOpen(true);
  };

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const pendingJobs = jobs.filter(j => j.status === "pending");
  const assignedJobs = jobs.filter(j => j.status === "assigned");
  const confirmedJobs = jobs.filter(j => j.status === "confirmed");
  const enRouteJobs = jobs.filter(j => j.status === "en_route");
  const onSiteJobs = jobs.filter(j => ["on_site", "in_progress"].includes(j.status));

  const availableTechs = technicians.filter(t => t.status === "available");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Dispatch Center</h1>
          <p className="text-muted-foreground">Manage jobs, calls, and technician assignments</p>
        </div>
        <Button onClick={() => setActiveTab("quotebuilder")} data-testid="button-new-quote">
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dispatch" data-testid="tab-dispatch">
            <Truck className="w-4 h-4 mr-2" />
            Dispatch Board
          </TabsTrigger>
          <TabsTrigger value="callteam" data-testid="tab-callteam">
            <Moon className="w-4 h-4 mr-2" />
            Call Team (7PM-7AM)
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="w-4 h-4 mr-2" />
            Quotes ({pendingQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="quotebuilder" data-testid="tab-quotebuilder">
            <DollarSign className="w-4 h-4 mr-2" />
            Quote Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/20">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingJobs.length}</p>
                    <p className="text-sm text-muted-foreground">Pending Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-500/20">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-active-count">{activeJobs.length}</p>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-500/20">
                    <Wrench className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-available-techs">{availableTechs.length}</p>
                    <p className="text-sm text-muted-foreground">Available Techs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover-elevate" onClick={() => setShowCustomerSnapshot(true)} data-testid="card-customer-snapshot">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-500/20">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-customer-count">{jobs.length}</p>
                    <p className="text-sm text-muted-foreground">Customer Snapshot</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Job Board</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Pending ({pendingJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {pendingJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {pendingJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No pending jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Assigned ({assignedJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {assignedJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {assignedJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No assigned jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmed ({confirmedJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {confirmedJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {confirmedJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No confirmed jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        En Route ({enRouteJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {enRouteJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {enRouteJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No en route jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" />
                        On Site ({onSiteJobs.length})
                      </h3>
                      <ScrollArea className="h-[400px]">
                        {onSiteJobs.map((job) => (
                          <JobCard key={job.id} job={job} onAssign={handleAssign} onViewDetails={handleViewDetails} />
                        ))}
                        {onSiteJobs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No on site jobs
                          </p>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="callteam">
          <CallTeamTab technicians={technicians} />
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pending Quotes for Review
              </CardTitle>
              <CardDescription>
                Review and approve quotes submitted by technicians
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
              ) : quotesError ? (
                <div className="text-center py-8 text-destructive">Failed to load quotes. Please try again.</div>
              ) : pendingQuotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pending quotes to review</div>
              ) : (
                <div className="space-y-4">
                  {pendingQuotes.map((quote) => (
                    <QuoteReviewCard key={quote.id} quote={quote} jobs={jobs} technicians={technicians} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotebuilder">
          <QuoteBuilderTab jobs={jobs} technicians={technicians} />
        </TabsContent>
      </Tabs>

      <AssignJobDialog
        job={selectedJob}
        technicians={technicians}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={(jobId, technicianId) => assignMutation.mutate({ jobId, technicianId })}
        isPending={assignMutation.isPending}
      />

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Job Details - {selectedJob?.customerName}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="details" className="text-xs sm:text-sm" data-testid="tab-job-details">Details</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs sm:text-sm" data-testid="tab-job-timeline">Timeline</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs sm:text-sm" data-testid="tab-job-chat">Chat</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedJob.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedJob.customerPhone}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedJob.address}, {selectedJob.city}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedJob.serviceType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={jobStatusConfig[selectedJob.status]?.color}>
                      {jobStatusConfig[selectedJob.status]?.label || selectedJob.status}
                    </Badge>
                  </div>
                  {selectedJob.scheduledDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="font-medium text-sm sm:text-base">
                        {format(new Date(selectedJob.scheduledDate), "MMM d, yyyy")}
                        {selectedJob.scheduledTimeStart && ` at ${selectedJob.scheduledTimeStart}`}
                      </p>
                    </div>
                  )}
                  {selectedJob.description && (
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{selectedJob.description}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <JobTimeline job={selectedJob} />
              </TabsContent>
              <TabsContent value="chat" className="mt-4">
                <JobChat jobId={selectedJob.id} jobCustomerName={selectedJob.customerName} userId={userId} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomerSnapshot} onOpenChange={setShowCustomerSnapshot}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Snapshot
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ScrollArea className="h-[500px]">
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customer data available
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs
                    .reduce((acc: Array<{ name: string; phone: string; email: string; address: string; jobCount: number; lastService: Date | null; totalValue: number }>, job) => {
                      const existing = acc.find(c => c.name === job.customerName && c.address === job.address);
                      if (existing) {
                        existing.jobCount++;
                        if (job.createdAt && (!existing.lastService || new Date(job.createdAt) > existing.lastService)) {
                          existing.lastService = new Date(job.createdAt);
                        }
                      } else {
                        acc.push({
                          name: job.customerName,
                          phone: job.customerPhone,
                          email: job.customerEmail || '',
                          address: job.address,
                          jobCount: 1,
                          lastService: job.createdAt ? new Date(job.createdAt) : null,
                          totalValue: 0
                        });
                      }
                      return acc;
                    }, [])
                    .sort((a, b) => (b.lastService?.getTime() || 0) - (a.lastService?.getTime() || 0))
                    .map((customer, index) => (
                      <Card key={index} data-testid={`customer-snapshot-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium" data-testid={`text-customer-name-${index}`}>{customer.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {customer.address}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                {customer.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {customer.phone}
                                  </span>
                                )}
                                {customer.email && (
                                  <span>{customer.email}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-primary/20 text-primary">
                                {customer.jobCount} job{customer.jobCount !== 1 ? 's' : ''}
                              </Badge>
                              {customer.lastService && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last: {format(customer.lastService, "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
