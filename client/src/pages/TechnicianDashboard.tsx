import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import KPICard from "@/components/KPICard";
import QuoteBuilder from "@/components/QuoteBuilder";
import JobTimeline from "@/components/JobTimeline";
import { JobChat } from "@/components/JobChat";
import JobAttachments from "@/components/JobAttachments";
import JobChecklist from "@/components/JobChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  CheckCircle,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Plus,
  Bell,
  Truck,
  PlayCircle,
  Navigation,
  AlertCircle,
  MapPinCheck,
  MapPinOff,
  Loader2,
  Hand,
  Briefcase,
  Camera,
  ListChecks,
  Radio,
  WifiOff,
} from "lucide-react";
import type { Job, Notification } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const jobStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  assigned: { label: "Assigned", color: "bg-blue-500/20 text-blue-400", icon: Bell },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  en_route: { label: "En Route", color: "bg-amber-500/20 text-amber-400", icon: Truck },
  on_site: { label: "On Site", color: "bg-purple-500/20 text-purple-400", icon: MapPin },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary", icon: PlayCircle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

interface TechnicianDashboardProps {
  technicianId: string;
  userId: string;
  fullName: string;
}

function getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    let resolved = false;
    
    // Short fallback timeout - if geolocation doesn't respond quickly, proceed without it
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 2000);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      },
      () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(null);
        }
      },
      { enableHighAccuracy: false, timeout: 1500, maximumAge: 30000 }
    );
  });
}

export default function TechnicianDashboard({ technicianId, userId, fullName }: TechnicianDashboardProps) {
  const { toast } = useToast();
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [arrivingJobId, setArrivingJobId] = useState<string | null>(null);
  const [showLeadFeeDialog, setShowLeadFeeDialog] = useState(false);
  const [jobToConfirm, setJobToConfirm] = useState<Job | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [permissionsAccepted, setPermissionsAccepted] = useState(() => {
    return localStorage.getItem(`permissionsAccepted_${technicianId}`) === "true";
  });
  const [isLocationTrackingEnabled, setIsLocationTrackingEnabled] = useState(() => {
    const saved = localStorage.getItem(`locationTracking_${technicianId}`);
    // Default to true (auto-enabled) if not explicitly set to false
    return saved !== "false";
  });
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem(`notificationsEnabled_${technicianId}`);
    // Default to true (auto-enabled) if not explicitly set to false
    return saved !== "false";
  });
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { technicianId }],
    queryFn: async () => {
      if (!technicianId) return [];
      const res = await fetch(`/api/jobs?technicianId=${technicianId}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    enabled: !!technicianId,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { userId }],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: poolJobs = [], isLoading: poolLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/pool", { technicianId }],
    queryFn: async () => {
      if (!technicianId) return [];
      const res = await fetch(`/api/jobs/pool?technicianId=${technicianId}`);
      if (!res.ok) throw new Error("Failed to fetch pool jobs");
      return res.json();
    },
    enabled: !!technicianId,
  });

  const locationUpdateMutation = useMutation({
    mutationFn: async (data: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number }) => {
      const activeJob = jobs.find(j => ["en_route", "on_site", "in_progress"].includes(j.status));
      return apiRequest("POST", `/api/technicians/${technicianId}/location`, {
        latitude: String(data.latitude),
        longitude: String(data.longitude),
        accuracy: data.accuracy !== undefined ? String(data.accuracy) : undefined,
        speed: data.speed !== undefined ? String(data.speed) : undefined,
        heading: data.heading !== undefined ? String(data.heading) : undefined,
        isMoving: (data.speed || 0) > 0.5,
        jobId: activeJob?.id || null,
      });
    },
  });

  // Show permissions dialog on first load if not already accepted
  useEffect(() => {
    if (!permissionsAccepted) {
      setShowPermissionsDialog(true);
    }
  }, [permissionsAccepted]);

  // Request and enable all permissions
  const acceptPermissions = async () => {
    let locationGranted = false;
    let notificationsGranted = false;

    // Request location permission
    if (navigator.geolocation) {
      try {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        locationGranted = true;
      } catch (error) {
        console.log("Location permission denied or unavailable");
        locationGranted = false;
      }
    }

    // Request notification permission
    if ("Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        notificationsGranted = permission === "granted";
      } catch (error) {
        console.log("Notification permission denied or unavailable");
        notificationsGranted = false;
      }
    }

    // Set tracking based on actual permission status
    setIsLocationTrackingEnabled(locationGranted);
    setIsNotificationsEnabled(notificationsGranted);
    setPermissionsAccepted(true);
    localStorage.setItem(`permissionsAccepted_${technicianId}`, "true");
    localStorage.setItem(`locationTracking_${technicianId}`, String(locationGranted));
    localStorage.setItem(`notificationsEnabled_${technicianId}`, String(notificationsGranted));
    setShowPermissionsDialog(false);

    // Show appropriate feedback
    if (locationGranted && notificationsGranted) {
      toast({
        title: "Permissions Enabled",
        description: "GPS tracking and notifications are now active.",
      });
    } else if (!locationGranted && !notificationsGranted) {
      toast({
        title: "Permissions Denied",
        description: "Location and notification access was denied. You can enable them in your browser settings.",
        variant: "destructive",
      });
    } else if (!locationGranted) {
      toast({
        title: "Location Access Denied",
        description: "GPS tracking requires location permission. Enable it in browser settings.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Notifications Denied",
        description: "Push notifications require notification permission. Enable in browser settings.",
        variant: "destructive",
      });
    }
  };

  // Save notifications state to localStorage
  useEffect(() => {
    localStorage.setItem(`notificationsEnabled_${technicianId}`, String(isNotificationsEnabled));
  }, [isNotificationsEnabled, technicianId]);

  useEffect(() => {
    localStorage.setItem(`locationTracking_${technicianId}`, String(isLocationTrackingEnabled));
    
    if (isLocationTrackingEnabled && technicianId) {
      const updateLocation = () => {
        if (!navigator.geolocation) return;
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            locationUpdateMutation.mutate({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
            });
          },
          (error) => {
            console.log("Location update failed:", error.message);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      };

      updateLocation();
      locationIntervalRef.current = setInterval(updateLocation, 30000);

      return () => {
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
      };
    } else {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }
  }, [isLocationTrackingEnabled, technicianId, jobs]);

  const toggleLocationTracking = async () => {
    if (isLocationTrackingEnabled) {
      // Turning off - always allowed
      setIsLocationTrackingEnabled(false);
      toast({
        title: "Location Sharing Disabled",
        description: "Location sharing has been turned off.",
      });
    } else {
      // Turning on - verify permission first
      if (!navigator.geolocation) {
        toast({
          title: "Location Not Available",
          description: "Your browser doesn't support location services.",
          variant: "destructive",
        });
        return;
      }
      try {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        setIsLocationTrackingEnabled(true);
        toast({
          title: "Location Sharing Enabled",
          description: "Your location is now being shared with dispatch.",
        });
      } catch (error) {
        toast({
          title: "Location Access Denied",
          description: "Please enable location access in your browser settings.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleNotifications = async () => {
    if (isNotificationsEnabled) {
      // Turning off - always allowed
      setIsNotificationsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "Push notifications have been turned off.",
      });
    } else {
      // Turning on - verify permission first
      if (!("Notification" in window)) {
        toast({
          title: "Notifications Not Available",
          description: "Your browser doesn't support push notifications.",
          variant: "destructive",
        });
        return;
      }
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setIsNotificationsEnabled(true);
          toast({
            title: "Notifications Enabled",
            description: "You will receive push notifications for new jobs and updates.",
          });
        } else {
          toast({
            title: "Notifications Denied",
            description: "Please enable notifications in your browser settings.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Notifications Error",
          description: "Could not request notification permission.",
          variant: "destructive",
        });
      }
    }
  };

  const claimMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/claim`, { technicianId: technicianId });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || "Failed to claim job");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/pool"] });
      toast({ title: "Job Claimed", description: "You have claimed this job. Please confirm when ready." });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/pool"] });
      toast({ title: "Error", description: error.message || "Could not claim the job. It may have been taken.", variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ jobId, acceptLeadFee }: { jobId: string; acceptLeadFee: boolean }) => {
      // First accept the lead fee
      if (acceptLeadFee) {
        await apiRequest("POST", `/api/job-lead-fees`, { 
          jobId, 
          technicianId: technicianId,
          amount: "125"
        });
      }
      // Then confirm the job
      return apiRequest("POST", `/api/jobs/${jobId}/confirm`, { technicianId: technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setShowLeadFeeDialog(false);
      setJobToConfirm(null);
      toast({ title: "Job Confirmed", description: "You have accepted the $125 lead fee and confirmed this job." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not confirm the job.", variant: "destructive" });
    },
  });

  // Open lead fee dialog before confirming
  const handleConfirmClick = (job: Job) => {
    setJobToConfirm(job);
    setShowLeadFeeDialog(true);
  };

  const enRouteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/en-route`, { technicianId: technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "En Route", description: "You are now en route to the job." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    },
  });

  const arriveMutation = useMutation({
    mutationFn: async ({ jobId, latitude, longitude }: { jobId: string; latitude?: number; longitude?: number }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/arrive`, { 
        technicianId: technicianId,
        latitude,
        longitude,
      });
      return res.json() as Promise<Job>;
    },
    onSuccess: (data: Job) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      if (data.arrivalVerified === true) {
        const distance = data.arrivalDistance ?? "unknown";
        toast({ 
          title: "Arrived - Location Verified", 
          description: `Your location was verified (${distance}m from job site).` 
        });
      } else if (data.arrivalVerified === false) {
        const distance = data.arrivalDistance ?? "unknown";
        toast({ 
          title: "Arrived - Location Not Verified", 
          description: `You appear to be ${distance}m from the job site.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Arrived", description: "You have arrived at the job site. Location could not be verified." });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    },
    onSettled: () => {
      setArrivingJobId(null);
    },
  });

  const handleArrive = useCallback(async (jobId: string) => {
    setArrivingJobId(jobId);
    try {
      const position = await getCurrentPosition();
      if (!position) {
        toast({ 
          title: "Location Unavailable", 
          description: "Could not get your location. Arrival will be recorded without verification.",
        });
      }
      arriveMutation.mutate({ 
        jobId, 
        latitude: position?.latitude, 
        longitude: position?.longitude 
      });
    } catch {
      toast({ 
        title: "Location Error", 
        description: "Failed to get location. Arrival will be recorded without verification.",
        variant: "destructive",
      });
      arriveMutation.mutate({ jobId });
    }
  }, [arriveMutation, toast]);

  const startMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/start`, { technicianId: technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job Started", description: "Work has begun." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not start job.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/complete`, { technicianId: technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJob(null);
      toast({ title: "Job Completed", description: "Great work! The job has been marked complete." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not complete job.", variant: "destructive" });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Guard against missing technicianId - placed after all hooks
  if (!technicianId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Account Not Configured</h2>
          <p className="text-muted-foreground">Your technician account is not properly set up. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.isRead);

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const assignedJobs = jobs.filter(j => j.status === "assigned");
  const confirmedJobs = jobs.filter(j => j.status === "confirmed");
  const enRouteJobs = jobs.filter(j => j.status === "en_route");
  const onSiteJobs = jobs.filter(j => ["on_site", "in_progress"].includes(j.status));
  const completedToday = jobs.filter(j => j.status === "completed");

  function getNextAction(job: Job) {
    switch (job.status) {
      case "assigned":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); handleConfirmClick(job); }}
            disabled={confirmMutation.isPending}
            data-testid={`button-confirm-job-${job.id}`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Job
          </Button>
        );
      case "confirmed":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); enRouteMutation.mutate(job.id); }}
            disabled={enRouteMutation.isPending}
            data-testid={`button-en-route-${job.id}`}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Start Driving
          </Button>
        );
      case "en_route":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); handleArrive(job.id); }}
            disabled={arriveMutation.isPending || arrivingJobId === job.id}
            data-testid={`button-arrive-${job.id}`}
          >
            {arrivingJobId === job.id ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 mr-2" />
            )}
            {arrivingJobId === job.id ? "Getting Location..." : "I've Arrived"}
          </Button>
        );
      case "on_site":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); startMutation.mutate(job.id); }}
            disabled={startMutation.isPending}
            data-testid={`button-start-work-${job.id}`}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Work
          </Button>
        );
      case "in_progress":
        return (
          <Button
            onClick={(e) => { e.stopPropagation(); completeMutation.mutate(job.id); }}
            disabled={completeMutation.isPending}
            variant="default"
            data-testid={`button-complete-job-${job.id}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Job
          </Button>
        );
      default:
        return null;
    }
  }

  function JobCard({ job }: { job: Job }) {
    const status = jobStatusConfig[job.status] || jobStatusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <div
        className="p-4 rounded-lg bg-muted/30 border hover-elevate cursor-pointer transition-all"
        onClick={() => setSelectedJob(job)}
        data-testid={`job-card-${job.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold" data-testid={`text-job-customer-${job.id}`}>
                {job.customerName}
              </h3>
              <Badge className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {job.serviceType}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {job.scheduledDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(job.scheduledDate), "MMM d")} {job.scheduledTimeStart && `at ${job.scheduledTimeStart}`}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {job.customerPhone}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{job.address}, {job.city}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          {getNextAction(job)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your schedule for today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isLocationTrackingEnabled ? "default" : "outline"}
                size="icon"
                onClick={toggleLocationTracking}
                data-testid="button-location-toggle"
                className={isLocationTrackingEnabled ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {isLocationTrackingEnabled ? <Radio className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLocationTrackingEnabled ? "GPS Tracking ON" : "GPS Tracking OFF"}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isNotificationsEnabled ? "default" : "outline"}
                size="icon"
                onClick={toggleNotifications}
                data-testid="button-notifications-toggle"
                className={isNotificationsEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                {isNotificationsEnabled ? <Bell className="w-4 h-4" /> : <Bell className="w-4 h-4 opacity-50" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isNotificationsEnabled ? "Notifications ON" : "Notifications OFF"}</p>
            </TooltipContent>
          </Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Notifications</h4>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications</p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-md text-sm cursor-pointer ${n.isRead ? "bg-muted/30" : "bg-primary/10"}`}
                          onClick={() => {
                            if (!n.isRead) {
                              markNotificationReadMutation.mutate(n.id);
                            }
                          }}
                          data-testid={`notification-${n.id}`}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="text-muted-foreground text-xs">{n.message}</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {n.createdAt && formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => setShowQuoteBuilder(true)} data-testid="button-new-quote">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Available Jobs"
          value={String(poolJobs.length)}
          icon={<Briefcase className="w-5 h-5 text-muted-foreground" />}
          variant={poolJobs.length > 0 ? "success" : "default"}
        />
        <KPICard
          title="Active Jobs"
          value={String(activeJobs.length)}
          icon={<ClipboardList className="w-5 h-5 text-muted-foreground" />}
          variant="default"
        />
        <KPICard
          title="Needs Confirmation"
          value={String(assignedJobs.length)}
          icon={<Bell className="w-5 h-5 text-muted-foreground" />}
          variant={assignedJobs.length > 0 ? "warning" : "default"}
        />
        <KPICard
          title="Completed Today"
          value={String(completedToday.length)}
          icon={<CheckCircle className="w-5 h-5 text-muted-foreground" />}
          variant="success"
        />
        <KPICard
          title="Notifications"
          value={String(unreadNotifications.length)}
          icon={<Bell className="w-5 h-5 text-muted-foreground" />}
          variant={unreadNotifications.length > 0 ? "warning" : "default"}
        />
      </div>

      {assignedJobs.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Jobs Awaiting Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-emerald-500/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            Available Jobs
            {poolJobs.length > 0 && (
              <Badge className="ml-2 bg-emerald-500/20 text-emerald-400">
                {poolJobs.length}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Jobs matching your approved service types</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {poolLoading ? (
            <p className="text-muted-foreground text-center py-4">Loading available jobs...</p>
          ) : poolJobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No jobs available to claim right now</p>
          ) : (
            poolJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-lg bg-muted/30 border hover-elevate transition-all"
                data-testid={`pool-job-card-${job.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{job.customerName}</h3>
                      <Badge className={job.priority === "urgent" ? "bg-destructive/20 text-destructive" : job.priority === "high" ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"}>
                        {job.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{job.serviceType}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {job.scheduledDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(job.scheduledDate), "MMM d")} {job.scheduledTimeStart && `at ${job.scheduledTimeStart}`}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {job.customerPhone}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{job.address}, {job.city}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => claimMutation.mutate(job.id)}
                    disabled={claimMutation.isPending}
                    data-testid={`button-claim-job-${job.id}`}
                  >
                    <Hand className="w-4 h-4 mr-2" />
                    Claim Job
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobsLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading jobs...</p>
              ) : activeJobs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No active jobs assigned</p>
              ) : (
                activeJobs
                  .filter(j => j.status !== "assigned")
                  .map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {completedToday.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No completed jobs yet</p>
                  ) : (
                    completedToday.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                        data-testid={`completed-job-${job.id}`}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{job.customerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.serviceType}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showLeadFeeDialog} onOpenChange={setShowLeadFeeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Lead Fee</DialogTitle>
            <DialogDescription>
              To confirm this job, you must accept the lead fee.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{jobToConfirm?.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">{jobToConfirm?.serviceType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{jobToConfirm?.address}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Lead Fee:</span>
                  <span className="text-2xl font-bold text-primary">$125.00</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              By accepting, you agree that $125 will be deducted from your pay for this lead.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLeadFeeDialog(false);
                setJobToConfirm(null);
              }}
              data-testid="button-decline-lead-fee"
            >
              Decline
            </Button>
            <Button
              onClick={() => {
                if (jobToConfirm) {
                  confirmMutation.mutate({ jobId: jobToConfirm.id, acceptLeadFee: true });
                }
              }}
              disabled={confirmMutation.isPending}
              data-testid="button-accept-lead-fee"
            >
              {confirmMutation.isPending ? "Processing..." : "Accept & Confirm Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuoteBuilder} onOpenChange={setShowQuoteBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
          </DialogHeader>
          <QuoteBuilder
            technicianId={technicianId}
            technicianName={fullName}
            showJobSelector={true}
            onQuoteCreated={() => setShowQuoteBuilder(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Job Details - {selectedJob?.customerName}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
                <TabsTrigger value="details" className="text-xs sm:text-sm" data-testid="tab-details">Details</TabsTrigger>
                <TabsTrigger value="photos" className="text-xs sm:text-sm" data-testid="tab-photos">
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Photos
                </TabsTrigger>
                <TabsTrigger value="checklist" className="text-xs sm:text-sm" data-testid="tab-checklist">
                  <ListChecks className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs sm:text-sm" data-testid="tab-timeline">Timeline</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs sm:text-sm" data-testid="tab-chat">Chat</TabsTrigger>
                <TabsTrigger value="quote" className="text-xs sm:text-sm" data-testid="tab-quote">Quote</TabsTrigger>
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
                  {selectedJob.arrivedAt && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Arrival Verification</p>
                      <div className="flex items-center gap-2">
                        {selectedJob.arrivalVerified === true ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            <MapPinCheck className="w-3 h-3 mr-1" />
                            Verified ({selectedJob.arrivalDistance ?? "N/A"}m)
                          </Badge>
                        ) : selectedJob.arrivalVerified === false ? (
                          <Badge className="bg-amber-500/20 text-amber-400">
                            <MapPinOff className="w-3 h-3 mr-1" />
                            Not Verified ({selectedJob.arrivalDistance ?? "N/A"}m)
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            Location Not Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedJob.scheduledDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="font-medium">
                        {format(new Date(selectedJob.scheduledDate), "MMM d, yyyy")} {selectedJob.scheduledTimeStart && `at ${selectedJob.scheduledTimeStart}`}
                      </p>
                    </div>
                  )}
                  {selectedJob.description && (
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedJob.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4 flex-wrap">
                  {getNextAction(selectedJob)}
                  <Button variant="outline" data-testid="button-call-customer">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Customer
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="photos" className="mt-4">
                <JobAttachments 
                  jobId={selectedJob.id} 
                  technicianId={technicianId} 
                />
              </TabsContent>
              <TabsContent value="checklist" className="mt-4">
                <JobChecklist 
                  jobId={selectedJob.id} 
                  technicianId={technicianId}
                  serviceType={selectedJob.serviceType || undefined}
                />
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <JobTimeline job={selectedJob} />
              </TabsContent>
              <TabsContent value="chat" className="mt-4">
                <JobChat jobId={selectedJob.id} jobCustomerName={selectedJob.customerName} userId={userId} />
              </TabsContent>
              <TabsContent value="quote" className="mt-4">
                <QuoteBuilder
                  jobId={selectedJob.id}
                  technicianId={technicianId}
                  customerName={selectedJob.customerName}
                  customerPhone={selectedJob.customerPhone || ""}
                  customerAddress={`${selectedJob.address}${selectedJob.city ? `, ${selectedJob.city}` : ""}`}
                  technicianName={fullName}
                  onQuoteCreated={() => setSelectedJob(null)}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Consent Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Enable Required Permissions
            </DialogTitle>
            <DialogDescription>
              To work effectively in the field, please enable the following permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">GPS Location Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Allows dispatch to see your real-time location and verify arrival at job sites.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive instant alerts for new job assignments, schedule changes, and customer updates.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Camera Access</p>
                  <p className="text-sm text-muted-foreground">
                    Take photos and videos of job sites for documentation and customer records.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              By clicking "I Agree & Enable", you consent to share your location while using the app and receive work-related notifications.
              These permissions are required while on duty.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={acceptPermissions}
              className="w-full"
              data-testid="button-accept-permissions"
            >
              I Agree & Enable All Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
