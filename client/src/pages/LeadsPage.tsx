import { useState } from "react";
import LeadsTable, { type Lead } from "@/components/LeadsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Upload, Phone, Mail, MapPin, Calendar, DollarSign, PhoneCall, Loader2, TrendingUp, RefreshCw, Copy, Link, History, Wifi, WifiOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SlaTimer } from "@/components/SlaTimer";
import { CustomerTimeline } from "@/components/CustomerTimeline";
import { useToast } from "@/hooks/use-toast";
import type { Lead as ApiLead } from "@shared/schema";

interface CompanySettingsData {
  id?: string;
  leadApiEnabled?: boolean;
  [key: string]: unknown;
}

function mapApiLeadToTableLead(lead: ApiLead): Lead & { slaBreach?: boolean } {
  return {
    id: lead.id,
    name: lead.customerName,
    phone: lead.customerPhone,
    email: lead.customerEmail || undefined,
    city: lead.city || "",
    state: "IL",
    zipCode: lead.zipCode || "",
    source: lead.source,
    service: lead.serviceType || "Not specified",
    status: (lead.status as Lead["status"]) || "new",
    cost: lead.cost ? Number(lead.cost) : 0,
    date: lead.createdAt ? new Date(lead.createdAt).toISOString().split("T")[0] : "",
    slaDeadline: lead.slaDeadline ? String(lead.slaDeadline) : null,
    contactedAt: lead.contactedAt ? String(lead.contactedAt) : null,
    priority: lead.priority || "normal",
    slaBreach: lead.slaBreach || false,
    leadScore: lead.leadScore || 50,
    isDuplicate: lead.isDuplicate || false,
    duplicateOfId: lead.duplicateOfId || null,
  };
}

export default function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  const { data: apiLeads = [], isLoading } = useQuery<ApiLead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: settings } = useQuery<CompanySettingsData>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettingsData>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Lead API integration setting has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leadApiEnabled = settings?.leadApiEnabled !== false;

  const leads = apiLeads.map(mapApiLeadToTableLead);

  const markContactedMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/contact`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: data.slaBreached ? "SLA Breached" : "Lead Contacted",
        description: data.slaBreached 
          ? `Response time: ${data.responseTimeMinutes} minutes (SLA exceeded)`
          : `Lead marked as contacted. Response time: ${data.responseTimeMinutes} minutes`,
        variant: data.slaBreached ? "destructive" : "default",
      });
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark lead as contacted",
        variant: "destructive",
      });
    },
  });

  const recalculateScoresMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/leads/recalculate-scores");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Scores Recalculated",
        description: `Updated scores for ${data.updated} leads`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recalculate scores",
        variant: "destructive",
      });
    },
  });

  const handleMarkContacted = () => {
    if (selectedLead) {
      markContactedMutation.mutate(selectedLead.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track all incoming leads from your sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => recalculateScoresMutation.mutate()}
            disabled={recalculateScoresMutation.isPending}
            data-testid="button-recalculate-scores"
          >
            {recalculateScoresMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Recalculate Scores
          </Button>
          <Button variant="outline" data-testid="button-export-leads">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button data-testid="button-import-leads">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <div className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${leadApiEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
        <div className="flex items-center gap-3">
          {leadApiEnabled ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-yellow-400" />
          )}
          <div>
            <Label htmlFor="leadApiToggle" className="text-sm font-medium cursor-pointer">
              Lead API Integration
            </Label>
            <p className="text-xs text-muted-foreground">
              {leadApiEnabled 
                ? "Receiving leads from Thumbtack, Angi, Zapier & other sources" 
                : "Lead webhooks are paused - no new leads will be created"
              }
            </p>
          </div>
        </div>
        <Switch
          id="leadApiToggle"
          checked={leadApiEnabled}
          onCheckedChange={(checked) => updateSettingsMutation.mutate({ leadApiEnabled: checked })}
          disabled={updateSettingsMutation.isPending}
          data-testid="switch-lead-api-toggle"
        />
      </div>

      <LeadsTable leads={leads} onLeadClick={setSelectedLead} />

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">
                      {selectedLead.source}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={`${
                        (selectedLead.leadScore || 50) >= 80 ? "bg-green-500/10 text-green-400 border-green-500/30" :
                        (selectedLead.leadScore || 50) >= 60 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                        (selectedLead.leadScore || 50) >= 40 ? "bg-sky-500/10 text-sky-400 border-sky-500/30" :
                        "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                      data-testid="badge-lead-score"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Score: {selectedLead.leadScore || 50}
                    </Badge>
                    <SlaTimer
                      slaDeadline={selectedLead.slaDeadline || null}
                      contactedAt={selectedLead.contactedAt || null}
                    />
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="capitalize"
                >
                  {selectedLead.status}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.phone}</span>
                  </div>
                  {selectedLead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedLead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {selectedLead.city}, {selectedLead.state} {selectedLead.zipCode}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedLead.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Lead Cost: ${selectedLead.cost}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-1">Service Requested</p>
                <p className="text-sm text-muted-foreground">{selectedLead.service}</p>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Customer History</p>
                </div>
                <CustomerTimeline phone={selectedLead.phone} />
              </div>

              {selectedLead.isDuplicate && (
                <>
                  <Separator />
                  <div className="p-3 rounded-md bg-purple-500/10 border border-purple-500/30" data-testid="duplicate-alert">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Copy className="w-4 h-4" />
                      <span className="font-medium">Duplicate Lead Detected</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      This lead has the same phone number as an existing lead.
                    </p>
                    {selectedLead.duplicateOfId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const originalLead = leads.find(l => l.id === selectedLead.duplicateOfId);
                          if (originalLead) {
                            setSelectedLead(originalLead);
                          }
                        }}
                        data-testid="button-view-original"
                      >
                        <Link className="w-3 h-3 mr-1" />
                        View Original Lead
                      </Button>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                {!selectedLead.contactedAt && selectedLead.status === "new" && (
                  <Button 
                    variant="outline"
                    onClick={handleMarkContacted}
                    disabled={markContactedMutation.isPending}
                    data-testid="button-mark-contacted"
                  >
                    {markContactedMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <PhoneCall className="w-4 h-4 mr-2" />
                    )}
                    Mark Contacted
                  </Button>
                )}
                <Button className="flex-1" data-testid="button-create-quote">
                  Create Quote
                </Button>
                <Button variant="outline" className="flex-1" data-testid="button-update-status">
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
