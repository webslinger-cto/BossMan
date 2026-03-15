import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Send, Save, CreditCard, Star, QrCode, Download, Users, Clock, Briefcase, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";

interface LineItem {
  id: string;
  description: string;
  type: "labor" | "material" | "service";
  quantity: number;
  unitPrice: number;
}

interface LaborEntry {
  id: string;
  laborerName: string;
  role: string;
  hoursWorked: number;
  hourlyRate: number;
}

interface QuoteBuilderProps {
  jobId?: string;
  technicianId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  technicianName?: string;
  showJobSelector?: boolean;
  onSave?: (quote: QuoteData) => void;
  onSend?: (quote: QuoteData) => void;
  onQuoteCreated?: () => void;
}

const GOOGLE_REVIEW_PLACE_ID = "ChIJSTKCCzZwBYgRPN0F2TRRuoA";
const GOOGLE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${GOOGLE_REVIEW_PLACE_ID}`;

export interface QuoteData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  lineItems: LineItem[];
  laborEntries: LaborEntry[];
  notes: string;
  subtotal: number;
  laborTotal: number;
  tax: number;
  total: number;
}

const SERVICE_PRESETS = [
  { name: "Drain Cleaning - Basic", price: 150, type: "service" as const },
  { name: "Drain Cleaning - Main Line", price: 350, type: "service" as const },
  { name: "Sewer Camera Inspection", price: 275, type: "service" as const },
  { name: "Hydro Jetting", price: 450, type: "service" as const },
  { name: "Sewer Line Repair", price: 850, type: "service" as const },
  { name: "Emergency Call Fee", price: 100, type: "service" as const },
  { name: "Labor - Per Hour", price: 125, type: "labor" as const },
];

const TAX_RATE = 0.0625; // 6.25% IL tax

const LABORER_ROLES = [
  { role: "Lead Technician", defaultRate: 75 },
  { role: "Assistant Technician", defaultRate: 45 },
  { role: "Apprentice", defaultRate: 30 },
  { role: "Digger/Excavator", defaultRate: 35 },
  { role: "General Labor", defaultRate: 25 },
];

export default function QuoteBuilder({
  jobId: initialJobId,
  technicianId,
  customerName = "",
  customerPhone = "",
  customerEmail: initialCustomerEmail = "",
  customerAddress = "",
  technicianName = "Your Technician",
  showJobSelector = false,
  onSave,
  onSend,
  onQuoteCreated,
}: QuoteBuilderProps) {
  const { toast } = useToast();
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [email, setEmail] = useState(initialCustomerEmail);
  const [address, setAddress] = useState(customerAddress);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLabor, setShowLabor] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || "");

  // Fetch jobs for job selector (when showJobSelector is true or no jobId provided)
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    enabled: showJobSelector || !initialJobId,
  });

  // Filter to active jobs that can have quotes
  const activeJobs = jobs.filter(j => 
    ["pending", "assigned", "confirmed", "en_route", "on_site", "in_progress"].includes(j.status)
  );

  // When a job is selected, populate customer info
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setName(job.customerName);
      setPhone(job.customerPhone || "");
      // Only update email if job has one, otherwise preserve existing
      if (job.customerEmail) {
        setEmail(job.customerEmail);
      }
      setAddress(`${job.address}${job.city ? `, ${job.city}` : ""}`);
    }
  };

  // Mutation to save quote to API
  const saveQuoteMutation = useMutation({
    mutationFn: async (data: { status: "draft" | "sent" }) => {
      const quoteData = getQuoteData();
      const jobIdToUse = selectedJobId || initialJobId;
      
      if (!jobIdToUse) {
        throw new Error("Please select a job first");
      }

      return apiRequest("POST", "/api/quotes", {
        jobId: jobIdToUse,
        technicianId: technicianId || undefined,
        customerName: quoteData.customerName,
        customerPhone: quoteData.customerPhone,
        customerEmail: email || undefined,
        address: quoteData.customerAddress,
        lineItems: JSON.stringify(quoteData.lineItems),
        laborEntries: JSON.stringify(quoteData.laborEntries),
        subtotal: String(quoteData.subtotal),
        laborTotal: String(quoteData.laborTotal),
        taxRate: String(TAX_RATE * 100),
        taxAmount: String(quoteData.tax),
        total: String(quoteData.total),
        status: data.status,
        notes: quoteData.notes,
        sentAt: data.status === "sent" ? new Date().toISOString() : undefined,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate all relevant queries for cross-platform sync
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      // Also invalidate technician-scoped jobs query if technicianId is provided
      if (technicianId) {
        queryClient.invalidateQueries({ queryKey: ["/api/jobs", { technicianId }] });
      }
      toast({
        title: variables.status === "sent" ? "Quote Sent" : "Quote Saved",
        description: variables.status === "sent" 
          ? "Quote has been sent to the customer and saved to the system."
          : "Quote has been saved as a draft.",
      });
      onQuoteCreated?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save quote",
        variant: "destructive",
      });
    },
  });

  const handleSaveQuote = () => {
    const quoteData = getQuoteData();
    onSave?.(quoteData);
    saveQuoteMutation.mutate({ status: "draft" });
  };

  const handleSendQuote = () => {
    const quoteData = getQuoteData();
    onSend?.(quoteData);
    saveQuoteMutation.mutate({ status: "sent" });
  };

  const currentJobId = selectedJobId || initialJobId;

  const addLineItem = (preset?: typeof SERVICE_PRESETS[0]) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: preset?.name || "",
      type: preset?.type || "service",
      quantity: 1,
      unitPrice: preset?.price || 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const addLaborEntry = (rolePreset?: typeof LABORER_ROLES[0]) => {
    const newEntry: LaborEntry = {
      id: crypto.randomUUID(),
      laborerName: "",
      role: rolePreset?.role || "General Labor",
      hoursWorked: 1,
      hourlyRate: rolePreset?.defaultRate || 25,
    };
    setLaborEntries([...laborEntries, newEntry]);
  };

  const updateLaborEntry = (id: string, updates: Partial<LaborEntry>) => {
    setLaborEntries(laborEntries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));
  };

  const removeLaborEntry = (id: string) => {
    setLaborEntries(laborEntries.filter((entry) => entry.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const laborTotal = laborEntries.reduce((sum, entry) => sum + entry.hoursWorked * entry.hourlyRate, 0);
  const taxableAmount = subtotal; // Labor is typically not taxable
  const tax = taxableAmount * TAX_RATE;
  const total = subtotal + laborTotal + tax;

  const getQuoteData = (): QuoteData => ({
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    lineItems,
    laborEntries,
    notes,
    subtotal,
    laborTotal,
    tax,
    total,
  });

  const typeColors = {
    labor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    material: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    service: "bg-green-500/10 text-green-400 border-green-500/30",
  };

  const handleDownloadPDF = () => {
    const quoteData = getQuoteData();
    const today = new Date().toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
    
    const lineItemsHtml = quoteData.lineItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    `).join("");

    const laborEntriesHtml = quoteData.laborEntries.length > 0 ? `
      <h3 style="color: #3b82f6; margin-top: 30px;">Labor</h3>
      <table>
        <thead>
          <tr>
            <th style="background: #3b82f6;">Worker</th>
            <th style="background: #3b82f6;">Role</th>
            <th style="background: #3b82f6; text-align: center;">Hours</th>
            <th style="background: #3b82f6; text-align: right;">Rate</th>
            <th style="background: #3b82f6; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quoteData.laborEntries.map(entry => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${entry.laborerName || 'Unnamed'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${entry.role}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${entry.hoursWorked}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${entry.hourlyRate.toFixed(2)}/hr</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(entry.hoursWorked * entry.hourlyRate).toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote - Emergency Chicago Sewer Experts</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #3b82f6; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .customer-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #3b82f6; color: white; padding: 10px; text-align: left; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 5px 0; }
          .total-line { font-size: 18px; font-weight: bold; color: #3b82f6; }
          .notes { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print {
            body { margin: 0; padding: 15px; }
            .header h1 { font-size: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Emergency Chicago Sewer Experts</h1>
          <p>Professional Sewer & Drain Services</p>
          <p>Quote Date: ${today}</p>
        </div>
        
        <div class="customer-info">
          <p><strong>Customer:</strong> ${quoteData.customerName}</p>
          <p><strong>Phone:</strong> ${quoteData.customerPhone}</p>
          <p><strong>Address:</strong> ${quoteData.customerAddress}</p>
        </div>
        
        <h3 style="color: #3b82f6;">Services & Materials</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        
        ${laborEntriesHtml}
        
        <div class="totals">
          <p>Services & Materials: $${quoteData.subtotal.toFixed(2)}</p>
          ${quoteData.laborTotal > 0 ? `<p>Labor: $${quoteData.laborTotal.toFixed(2)}</p>` : ""}
          <p>Tax (6.25%): $${quoteData.tax.toFixed(2)}</p>
          <p class="total-line">Total: $${quoteData.total.toFixed(2)}</p>
        </div>
        
        ${quoteData.notes ? `<div class="notes"><strong>Notes:</strong> ${quoteData.notes}</div>` : ""}
        
        <div class="footer">
          <p>Thank you for choosing Emergency Chicago Sewer Experts!</p>
          <p>This quote is valid for 30 days from the date above.</p>
        </div>
      </body>
      </html>
    `;
    
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }
  };

  return (
    <div className="space-y-4">
      {/* Job Selector - shown when no jobId provided or showJobSelector is true */}
      {(showJobSelector || !initialJobId) && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Select Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading jobs...</span>
              </div>
            ) : activeJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active jobs available. Create a job first before generating a quote.
              </p>
            ) : (
              <Select value={selectedJobId} onValueChange={handleJobSelect}>
                <SelectTrigger data-testid="select-job-for-quote">
                  <SelectValue placeholder="Select a job to create quote for..." />
                </SelectTrigger>
                <SelectContent>
                  {activeJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{job.customerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {job.serviceType} - {job.address}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedJobId && (
              <div className="mt-3 p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-1">Selected Job</p>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{address}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter customer name"
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone Number</Label>
              <Input
                id="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(xxx) xxx-xxxx"
                data-testid="input-customer-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email Address</Label>
              <Input
                id="customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                data-testid="input-customer-email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">Service Address</Label>
            <Input
              id="customer-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter service address"
              data-testid="input-customer-address"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              Line Items
            </CardTitle>
            <Select onValueChange={(v) => {
              const preset = SERVICE_PRESETS.find((p) => p.name === v);
              if (preset) addLineItem(preset);
            }}>
              <SelectTrigger className="w-[200px]" data-testid="select-add-preset">
                <SelectValue placeholder="Add service..." />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name} - ${preset.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No items added yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => addLineItem()}
                data-testid="button-add-first-item"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Item
              </Button>
            </div>
          ) : (
            <>
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                  data-testid={`row-line-item-${item.id}`}
                >
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      placeholder="Description"
                      className="h-9"
                    />
                  </div>
                  <Select
                    value={item.type}
                    onValueChange={(v) => updateLineItem(item.id, { type: v as LineItem["type"] })}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) })}
                      className="w-16 h-9 text-center"
                      min={1}
                    />
                    <span className="text-muted-foreground">x</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, { unitPrice: Number(e.target.value) })}
                        className="w-24 h-9 pl-6"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={typeColors[item.type]}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="text-destructive"
                      data-testid={`button-remove-item-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addLineItem()}
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {showLabor && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Labor Tracking
              </CardTitle>
              <Select onValueChange={(v) => {
                const preset = LABORER_ROLES.find((p) => p.role === v);
                if (preset) addLaborEntry(preset);
              }}>
                <SelectTrigger className="w-[180px]" data-testid="select-add-laborer">
                  <SelectValue placeholder="Add laborer..." />
                </SelectTrigger>
                <SelectContent>
                  {LABORER_ROLES.map((preset) => (
                    <SelectItem key={preset.role} value={preset.role}>
                      {preset.role} - ${preset.defaultRate}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {laborEntries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No laborers added yet</p>
                <p className="text-xs mt-1">Track worker hours and costs for this job</p>
              </div>
            ) : (
              <>
                {laborEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                    data-testid={`row-labor-entry-${entry.id}`}
                  >
                    <div className="flex-1 min-w-[140px]">
                      <Input
                        value={entry.laborerName}
                        onChange={(e) => updateLaborEntry(entry.id, { laborerName: e.target.value })}
                        placeholder="Worker name"
                        className="h-9"
                        data-testid={`input-laborer-name-${entry.id}`}
                      />
                    </div>
                    <Select
                      value={entry.role}
                      onValueChange={(v) => {
                        const preset = LABORER_ROLES.find((r) => r.role === v);
                        updateLaborEntry(entry.id, { 
                          role: v, 
                          hourlyRate: preset?.defaultRate || entry.hourlyRate 
                        });
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LABORER_ROLES.map((r) => (
                          <SelectItem key={r.role} value={r.role}>
                            {r.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={entry.hoursWorked}
                        onChange={(e) => updateLaborEntry(entry.id, { hoursWorked: Number(e.target.value) })}
                        className="w-16 h-9 text-center"
                        min={0.5}
                        step={0.5}
                      />
                      <span className="text-muted-foreground text-sm">hrs</span>
                      <span className="text-muted-foreground">@</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          value={entry.hourlyRate}
                          onChange={(e) => updateLaborEntry(entry.id, { hourlyRate: Number(e.target.value) })}
                          className="w-20 h-9 pl-6"
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm">/hr</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                        ${(entry.hoursWorked * entry.hourlyRate).toFixed(2)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLaborEntry(entry.id)}
                        className="text-destructive"
                        data-testid={`button-remove-labor-${entry.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-blue-500/20">
                  <span className="text-sm text-muted-foreground">
                    Total: {laborEntries.reduce((sum, e) => sum + e.hoursWorked, 0)} hours
                  </span>
                  <span className="font-semibold text-blue-400">
                    Labor Cost: ${laborTotal.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Special Instructions</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the job..."
              className="min-h-[80px]"
              data-testid="input-notes"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Services & Materials</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          {laborTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Labor ({laborEntries.reduce((sum, e) => sum + e.hoursWorked, 0)} hrs)</span>
              <span className="font-medium text-blue-400">${laborTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (6.25%)</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-green-500" data-testid="text-quote-total">
              ${total.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {showPayment && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Payment integration coming soon. Stripe will be configured for secure card processing.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input placeholder="4242 4242 4242 4242" disabled />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" disabled />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input placeholder="123" disabled />
                </div>
              </div>
            </div>
            <Button className="w-full" disabled>
              Process Payment (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      )}

      {showFeedback && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Customer Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Thank you for choosing Emergency Chicago Sewer Experts!
              </p>
              <p className="text-sm">
                Your technician today was <span className="font-semibold text-foreground">{technicianName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                We would love to hear about your experience. Scan the QR code below to leave us a Google review!
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={GOOGLE_REVIEW_URL}
                  size={120}
                  level="H"
                  includeMargin={false}
                  data-testid="qr-google-review"
                />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-xs font-medium flex items-center justify-center gap-1.5">
                  <QrCode className="w-3 h-3" />
                  Scan to Review
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Or visit: google.com/maps and search "Emergency Chicago Sewer Experts"
                </p>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-3">
              <p className="text-sm font-medium">How was your experience with {technicianName}?</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="icon"
                    className="text-yellow-500"
                    data-testid={`button-star-${star}`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder="Tell us about your experience (optional)..."
                className="min-h-[60px]"
                data-testid="input-feedback-comment"
              />
              <Button variant="outline" className="w-full" data-testid="button-submit-feedback">
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleSaveQuote}
          disabled={saveQuoteMutation.isPending || (!currentJobId && !selectedJobId)}
          data-testid="button-save-quote"
        >
          {saveQuoteMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Draft
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={lineItems.length === 0 || !name}
          data-testid="button-download-pdf"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowLabor(!showLabor)}
          className={showLabor ? "border-blue-500/50 bg-blue-500/10" : ""}
          data-testid="button-toggle-labor"
        >
          <Users className="w-4 h-4 mr-2" />
          {showLabor ? "Hide Labor" : "Track Labor"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPayment(!showPayment)}
          data-testid="button-toggle-payment"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {showPayment ? "Hide Payment" : "Accept Payment"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFeedback(!showFeedback)}
          data-testid="button-toggle-feedback"
        >
          <Star className="w-4 h-4 mr-2" />
          {showFeedback ? "Hide Feedback" : "Customer Feedback"}
        </Button>
        <Button
          onClick={handleSendQuote}
          disabled={lineItems.length === 0 || !name || saveQuoteMutation.isPending || (!currentJobId && !selectedJobId)}
          data-testid="button-send-quote"
        >
          {saveQuoteMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send Quote
        </Button>
      </div>
    </div>
  );
}
