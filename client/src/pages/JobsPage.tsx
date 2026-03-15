import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  MapPin,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Truck,
  PlayCircle,
  Search,
  Pencil,
  UserPlus,
  Phone,
  Calendar,
  MessageSquare,
  Bell,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Job, Technician } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

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

export default function JobsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  // Deep link: auto-open job dialog when ?jobId=<id> is in URL
  useEffect(() => {
    if (jobsLoading || jobs.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const jobIdFromUrl = params.get("jobId");
    
    if (jobIdFromUrl && !selectedJob) {
      const job = jobs.find(j => j.id === jobIdFromUrl);
      if (job) {
        setSelectedJob(job);
        setEditDialogOpen(true);
        // Remove query param from URL to prevent re-triggering
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [jobs, jobsLoading, selectedJob]);

  const assignMutation = useMutation({
    mutationFn: async ({ jobId, technicianId }: { jobId: string; technicianId: string }) => {
      return apiRequest("POST", `/api/jobs/${jobId}/assign`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setAssignDialogOpen(false);
      setSelectedJob(null);
      setSelectedTechnician("");
      toast({ title: "Job Assigned", description: "The job has been assigned successfully." });
    },
    onError: () => {
      toast({ title: "Assignment Failed", description: "Could not assign the job.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Partial<Job> }) => {
      return apiRequest("PATCH", `/api/jobs/${jobId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setEditDialogOpen(false);
      setSelectedJob(null);
      toast({ title: "Job Updated", description: "The job has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Could not update the job.", variant: "destructive" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/send-reminder`);
    },
    onSuccess: (_, jobId) => {
      toast({ title: "Reminder Sent", description: "Appointment reminder has been sent via email and SMS." });
    },
    onError: () => {
      toast({ title: "Send Failed", description: "Could not send reminder.", variant: "destructive" });
    },
  });

  const sendEnRouteSMSMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/send-en-route-sms`, { estimatedArrival: "15-20 minutes" });
    },
    onSuccess: () => {
      toast({ title: "SMS Sent", description: "En route notification sent to customer." });
    },
    onError: () => {
      toast({ title: "Send Failed", description: "Could not send SMS.", variant: "destructive" });
    },
  });

  const sendCompleteSMSMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/send-complete-sms`);
    },
    onSuccess: () => {
      toast({ title: "SMS Sent", description: "Job complete notification sent to customer." });
    },
    onError: () => {
      toast({ title: "Send Failed", description: "Could not send SMS.", variant: "destructive" });
    },
  });

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customerPhone.includes(searchTerm) ||
      job.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTechnicianName = (techId: string | null) => {
    if (!techId) return "Unassigned";
    const tech = technicians.find((t) => t.id === techId);
    return tech?.fullName || "Unknown";
  };

  const handleAssign = (job: Job) => {
    setSelectedJob(job);
    setSelectedTechnician(job.assignedTechnicianId || "");
    setAssignDialogOpen(true);
  };

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setEditDialogOpen(true);
  };

  const activeJobCount = jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
  const completedToday = jobs.filter((j) => {
    if (j.status !== "completed" || !j.completedAt) return false;
    const today = new Date();
    const completedDate = new Date(j.completedAt);
    return completedDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Jobs Management</h1>
          <p className="text-muted-foreground">
            View, edit, and assign all jobs
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Wrench className="w-4 h-4 mr-1" />
            {activeJobCount} Active
          </Badge>
          <Badge variant="outline" className="text-sm">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {completedToday} Completed Today
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>Manage job assignments and details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, address, phone, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-jobs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(jobStatusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {jobsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No jobs found</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const status = jobStatusConfig[job.status] || jobStatusConfig.pending;
                    const priority = priorityConfig[job.priority || "normal"] || priorityConfig.normal;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium" data-testid={`text-job-customer-${job.id}`}>{job.customerName}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {job.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.serviceType}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-[200px] truncate">{job.address}</p>
                          {job.city && <p className="text-xs text-muted-foreground">{job.city}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priority.color}>{priority.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm" data-testid={`text-job-technician-${job.id}`}>
                            {getTechnicianName(job.assignedTechnicianId)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {job.createdAt && formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(job)}
                              data-testid={`button-edit-job-${job.id}`}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssign(job)}
                              data-testid={`button-assign-job-${job.id}`}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Assign
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" data-testid={`button-sms-menu-${job.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>SMS Notifications</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => sendReminderMutation.mutate(job.id)}
                                  disabled={sendReminderMutation.isPending}
                                  data-testid={`button-send-reminder-${job.id}`}
                                >
                                  <Bell className="w-4 h-4 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => sendEnRouteSMSMutation.mutate(job.id)}
                                  disabled={sendEnRouteSMSMutation.isPending}
                                  data-testid={`button-send-enroute-${job.id}`}
                                >
                                  <Truck className="w-4 h-4 mr-2" />
                                  Send En Route SMS
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => sendCompleteSMSMutation.mutate(job.id)}
                                  disabled={sendCompleteSMSMutation.isPending}
                                  data-testid={`button-send-complete-${job.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Send Job Complete SMS
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Job</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-md bg-muted/50">
                <p className="font-medium">{selectedJob.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedJob.address}</p>
                <p className="text-sm text-muted-foreground">{selectedJob.serviceType}</p>
              </div>
              <div className="space-y-2">
                <Label>Assign to Technician</Label>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger data-testid="select-technician">
                    <SelectValue placeholder="Select a technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians
                      .filter((t) => t.status !== "off_duty")
                      .map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          <div className="flex items-center gap-2">
                            <span>{tech.fullName}</span>
                            <Badge variant="outline" className="text-xs">
                              {tech.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedJob && selectedTechnician) {
                  assignMutation.mutate({ jobId: selectedJob.id, technicianId: selectedTechnician });
                }
              }}
              disabled={!selectedTechnician || assignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <EditJobForm
              job={selectedJob}
              technicians={technicians}
              onSave={(updates) => updateMutation.mutate({ jobId: selectedJob.id, updates })}
              onCancel={() => setEditDialogOpen(false)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditJobForm({
  job,
  technicians,
  onSave,
  onCancel,
  isPending,
}: {
  job: Job;
  technicians: Technician[];
  onSave: (updates: Partial<Job>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    customerEmail: job.customerEmail || "",
    address: job.address,
    city: job.city || "",
    serviceType: job.serviceType,
    description: job.description || "",
    status: job.status,
    priority: job.priority || "normal",
    assignedTechnicianId: job.assignedTechnicianId || "",
  });

  const handleSubmit = () => {
    onSave({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || null,
      address: formData.address,
      city: formData.city || null,
      serviceType: formData.serviceType,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority,
      assignedTechnicianId: formData.assignedTechnicianId || null,
    });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
            data-testid="input-edit-customer-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input
            id="customerPhone"
            value={formData.customerPhone}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
            data-testid="input-edit-customer-phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
            data-testid="input-edit-customer-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serviceType">Service Type</Label>
          <Input
            id="serviceType"
            value={formData.serviceType}
            onChange={(e) => setFormData((prev) => ({ ...prev, serviceType: e.target.value }))}
            data-testid="input-edit-service-type"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            data-testid="input-edit-address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
            data-testid="input-edit-city"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}>
            <SelectTrigger data-testid="select-edit-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(jobStatusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData((prev) => ({ ...prev, priority: v }))}>
            <SelectTrigger data-testid="select-edit-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assigned Technician</Label>
          <Select
            value={formData.assignedTechnicianId || "unassigned"}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, assignedTechnicianId: v === "unassigned" ? "" : v }))}
          >
            <SelectTrigger data-testid="select-edit-technician">
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>{tech.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[80px]"
            data-testid="textarea-edit-description"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-job">
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}
