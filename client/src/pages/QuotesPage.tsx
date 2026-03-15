import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Search,
  Pencil,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  DollarSign,
  Phone,
  MapPin,
  User,
  Link2,
  Copy,
  Plus,
  Send,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { Quote, Job, Technician, PricebookItem } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", color: "bg-amber-500/20 text-amber-400" },
  viewed: { label: "Viewed", color: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400" },
  declined: { label: "Declined", color: "bg-destructive/20 text-destructive" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

interface LineItem {
  id: string;
  description: string;
  customDescription?: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export default function QuotesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create quote form state
  const [selectedJobId, setSelectedJobId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [laborFee, setLaborFee] = useState(0);
  const [materialsCost, setMaterialsCost] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const { data: pricebookItems = [] } = useQuery<PricebookItem[]>({
    queryKey: ["/api/pricebook/items"],
  });

  const availableJobs = jobs.filter(
    (j) => j.status === "new" || j.status === "pending" || j.status === "assigned" || j.status === "on_site" || j.status === "in_progress"
  );

  const resetCreateForm = () => {
    setSelectedJobId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setAddress("");
    setLineItems([{ id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }]);
    setLaborFee(0);
    setMaterialsCost(0);
    setTaxRate(0);
    setNotes("");
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setCustomerName(job.customerName);
      setCustomerPhone(job.customerPhone || "");
      setCustomerEmail(job.customerEmail || "");
      setAddress(`${job.address}${job.city ? `, ${job.city}` : ""}`);
    }
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "description" && pricebookItems.length > 0) {
          const pricebookItem = pricebookItems.find(p => p.name === value);
          if (pricebookItem) {
            updated.unitPrice = parseFloat(pricebookItem.basePrice);
          }
        }
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: "", customDescription: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Calculate totals
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const subtotal = lineItemsTotal + laborFee + materialsCost;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const createQuoteMutation = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      const validLineItems = lineItems.filter(item => item.description || item.customDescription);
      const quoteData = {
        jobId: selectedJobId && selectedJobId !== "none" ? selectedJobId : undefined,
        customerName,
        customerPhone,
        customerEmail,
        address,
        lineItems: JSON.stringify(validLineItems),
        laborTotal: laborFee.toString(),
        materialsCost: materialsCost.toString(),
        subtotal: subtotal.toString(),
        taxRate: taxRate.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        notes,
        status,
        sentAt: status === "sent" ? new Date().toISOString() : undefined,
      };
      return apiRequest("POST", "/api/quotes", quoteData);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setCreateDialogOpen(false);
      resetCreateForm();
      toast({
        title: status === "draft" ? "Quote Saved" : "Quote Sent",
        description: status === "draft" ? "Quote saved as draft." : "Quote has been sent to customer.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not create quote.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ quoteId, updates }: { quoteId: string; updates: Partial<Quote> }) => {
      return apiRequest("PATCH", `/api/quotes/${quoteId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setEditDialogOpen(false);
      setSelectedQuote(null);
      toast({ title: "Quote Updated", description: "The quote has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Could not update the quote.", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("PATCH", `/api/quotes/${quoteId}`, { status: "accepted", acceptedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote Approved", description: "The quote has been approved." });
    },
    onError: () => {
      toast({ title: "Approval Failed", description: "Could not approve the quote.", variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("PATCH", `/api/quotes/${quoteId}`, { status: "declined", declinedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote Declined", description: "The quote has been declined." });
    },
    onError: () => {
      toast({ title: "Decline Failed", description: "Could not decline the quote.", variant: "destructive" });
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/generate-link`);
      return res.json();
    },
    onSuccess: async (data: { token: string; publicUrl: string }) => {
      const fullUrl = `${window.location.origin}${data.publicUrl}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        toast({ 
          title: "Link Copied", 
          description: "The quote link has been copied to your clipboard." 
        });
      } catch {
        toast({ 
          title: "Link Generated", 
          description: fullUrl,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not generate quote link.", variant: "destructive" });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/resend-email`);
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({ 
        title: "Email Sent", 
        description: data.message || "Quote email has been sent to the customer." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not send quote email. Make sure the quote has a customer email.", variant: "destructive" });
    },
  });

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.customerPhone || "").includes(searchTerm);
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTechnicianName = (techId: string | null) => {
    if (!techId) return "Unknown";
    const tech = technicians.find((t) => t.id === techId);
    return tech?.fullName || "Unknown";
  };

  const getJobInfo = (jobId: string) => {
    return jobs.find((j) => j.id === jobId);
  };

  const parseLineItems = (lineItemsStr: string | null): LineItem[] => {
    if (!lineItemsStr) return [];
    try {
      return JSON.parse(lineItemsStr);
    } catch {
      return [];
    }
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    setViewDialogOpen(true);
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
  };

  const pendingCount = quotes.filter((q) => q.status === "sent" || q.status === "draft").length;
  const acceptedCount = quotes.filter((q) => q.status === "accepted").length;
  const totalValue = quotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + parseFloat(q.total?.toString() || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Quotes Management</h1>
          <p className="text-muted-foreground">
            View, edit, and approve all quotes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            {acceptedCount} Accepted
          </Badge>
          <Badge variant="outline" className="text-sm">
            <DollarSign className="w-4 h-4 mr-1" />
            ${totalValue.toLocaleString()}
          </Badge>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-quote">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Quotes
          </CardTitle>
          <CardDescription>Review and manage customer quotes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, address, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-quotes"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(quoteStatusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {quotesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No quotes found</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => {
                    const status = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
                    return (
                      <TableRow key={quote.id} data-testid={`row-quote-${quote.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium" data-testid={`text-quote-customer-${quote.id}`}>
                              {quote.customerName}
                            </p>
                            {quote.customerPhone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {quote.customerPhone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-[200px] truncate">{quote.address || "N/A"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium" data-testid={`text-quote-total-${quote.id}`}>
                            ${parseFloat(quote.total?.toString() || "0").toLocaleString()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{getTechnicianName(quote.technicianId)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {quote.createdAt && formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateLinkMutation.mutate(quote.id)}
                              disabled={generateLinkMutation.isPending}
                              data-testid={`button-copy-link-${quote.id}`}
                            >
                              <Link2 className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                            {quote.customerEmail && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendEmailMutation.mutate(quote.id)}
                                disabled={resendEmailMutation.isPending}
                                data-testid={`button-resend-email-${quote.id}`}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Resend
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(quote)}
                              data-testid={`button-view-quote-${quote.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(quote)}
                              data-testid={`button-edit-quote-${quote.id}`}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {(quote.status === "draft" || quote.status === "sent") && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => approveMutation.mutate(quote.id)}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-quote-${quote.id}`}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => declineMutation.mutate(quote.id)}
                                  disabled={declineMutation.isPending}
                                  data-testid={`button-decline-quote-${quote.id}`}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <QuoteDetails
              quote={selectedQuote}
              technicians={technicians}
              jobs={jobs}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <EditQuoteForm
              quote={selectedQuote}
              onSave={(updates) => updateMutation.mutate({ quoteId: selectedQuote.id, updates })}
              onCancel={() => setEditDialogOpen(false)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Quote Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) { resetCreateForm(); } setCreateDialogOpen(open); }}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Job Selection (Optional) */}
            <div className="space-y-2">
              <Label>Link to Job <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Select value={selectedJobId} onValueChange={handleJobSelect}>
                <SelectTrigger data-testid="select-job">
                  <SelectValue placeholder="No job linked - enter customer info below" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job linked</SelectItem>
                  {availableJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.customerName} - {job.address} ({job.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Select a job to auto-fill customer info, or enter manually below</p>
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Customer Information</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    data-testid="input-customer-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    data-testid="input-customer-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    data-testid="input-address"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 border rounded-md">
                    <div className="flex-1">
                      <Select
                        value={item.description}
                        onValueChange={(value) => handleLineItemChange(item.id, "description", value)}
                      >
                        <SelectTrigger data-testid={`select-pricebook-${index}`}>
                          <SelectValue placeholder="Select service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pricebookItems.map((pb) => (
                            <SelectItem key={pb.id} value={pb.name}>
                              {pb.name} - ${parseFloat(pb.basePrice).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleLineItemChange(item.id, "quantity", val === "" ? 0 : parseInt(val) || 0);
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "" || parseInt(e.target.value) < 1) {
                            handleLineItemChange(item.id, "quantity", 1);
                          }
                        }}
                        className="w-16 sm:w-20 text-center"
                        min={1}
                        placeholder="Qty"
                        data-testid={`input-quantity-${index}`}
                      />
                      <Input
                        type="number"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleLineItemChange(item.id, "unitPrice", val === "" ? 0 : parseFloat(val) || 0);
                        }}
                        className="w-20 sm:w-24 text-right"
                        step="0.01"
                        placeholder="Price"
                        data-testid={`input-unit-price-${index}`}
                      />
                      <span className="w-20 sm:w-24 text-right font-medium text-sm sm:text-base">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-md p-4 space-y-3">
              <div className="flex justify-between">
                <span>Line Items</span>
                <span className="font-medium">${lineItemsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Labor Fee</span>
                <Input
                  type="number"
                  value={laborFee === 0 ? "" : laborFee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLaborFee(val === "" ? 0 : parseFloat(val) || 0);
                  }}
                  className="w-24 text-right"
                  step="0.01"
                  data-testid="input-labor-fee"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Materials Cost</span>
                <Input
                  type="number"
                  value={materialsCost === 0 ? "" : materialsCost}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaterialsCost(val === "" ? 0 : parseFloat(val) || 0);
                  }}
                  className="w-24 text-right"
                  step="0.01"
                  data-testid="input-materials-cost"
                />
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tax Rate (%)</span>
                <Input
                  type="number"
                  value={taxRate === 0 ? "" : taxRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaxRate(val === "" ? 0 : parseFloat(val) || 0);
                  }}
                  className="w-20 text-right"
                  step="0.1"
                  data-testid="input-tax-rate"
                />
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => createQuoteMutation.mutate("draft")}
              disabled={!customerName || createQuoteMutation.isPending}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => createQuoteMutation.mutate("sent")}
              disabled={!customerName || createQuoteMutation.isPending}
              data-testid="button-send-quote"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuoteDetails({
  quote,
  technicians,
  jobs,
}: {
  quote: Quote;
  technicians: Technician[];
  jobs: Job[];
}) {
  const tech = technicians.find((t) => t.id === quote.technicianId);
  const job = jobs.find((j) => j.id === quote.jobId);
  const status = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;

  let lineItems: LineItem[] = [];
  try {
    if (quote.lineItems) {
      lineItems = JSON.parse(quote.lineItems);
    }
  } catch {
    lineItems = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-lg">{quote.customerName}</p>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
        <p className="text-2xl font-bold">${parseFloat(quote.total?.toString() || "0").toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium">{quote.customerPhone || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium truncate">{quote.customerEmail || "N/A"}</p>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="font-medium">{quote.address || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Created By</p>
          <p className="font-medium">{tech?.fullName || "Unknown"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Created At</p>
          <p className="font-medium text-sm sm:text-base">
            {quote.createdAt && format(new Date(quote.createdAt), "MMM d, yyyy h:mm a")}
          </p>
        </div>
      </div>

      <Separator />

      <div>
        <p className="font-medium mb-3">Line Items</p>
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPrice?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-right">
                      ${(item.quantity * (item.unitPrice || 0)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="bg-muted/50 rounded-md p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${parseFloat(quote.subtotal?.toString() || "0").toLocaleString()}</span>
        </div>
        {parseFloat(quote.laborTotal?.toString() || "0") > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Labor</span>
            <span>${parseFloat(quote.laborTotal?.toString() || "0").toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>${parseFloat(quote.taxAmount?.toString() || "0").toLocaleString()}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>${parseFloat(quote.total?.toString() || "0").toLocaleString()}</span>
        </div>
      </div>

      {quote.notes && (
        <div>
          <p className="font-medium mb-2">Notes</p>
          <p className="text-sm text-muted-foreground">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}

function EditQuoteForm({
  quote,
  onSave,
  onCancel,
  isPending,
}: {
  quote: Quote;
  onSave: (updates: Partial<Quote>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    customerName: quote.customerName,
    customerPhone: quote.customerPhone || "",
    customerEmail: quote.customerEmail || "",
    address: quote.address || "",
    status: quote.status,
    notes: quote.notes || "",
    subtotal: quote.subtotal?.toString() || "0",
    taxAmount: quote.taxAmount?.toString() || "0",
    total: quote.total?.toString() || "0",
  });

  const handleSubmit = () => {
    onSave({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone || null,
      customerEmail: formData.customerEmail || null,
      address: formData.address || null,
      status: formData.status,
      notes: formData.notes || null,
      subtotal: formData.subtotal,
      taxAmount: formData.taxAmount,
      total: formData.total,
    });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
            data-testid="input-edit-quote-customer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input
            id="customerPhone"
            value={formData.customerPhone}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
            data-testid="input-edit-quote-phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
            data-testid="input-edit-quote-email"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}>
            <SelectTrigger data-testid="select-edit-quote-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(quoteStatusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            data-testid="input-edit-quote-address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtotal">Subtotal ($)</Label>
          <Input
            id="subtotal"
            type="number"
            value={formData.subtotal}
            onChange={(e) => setFormData((prev) => ({ ...prev, subtotal: e.target.value }))}
            data-testid="input-edit-quote-subtotal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax ($)</Label>
          <Input
            id="taxAmount"
            type="number"
            value={formData.taxAmount}
            onChange={(e) => setFormData((prev) => ({ ...prev, taxAmount: e.target.value }))}
            data-testid="input-edit-quote-tax"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total">Total ($)</Label>
          <Input
            id="total"
            type="number"
            value={formData.total}
            onChange={(e) => setFormData((prev) => ({ ...prev, total: e.target.value }))}
            data-testid="input-edit-quote-total"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[80px]"
            data-testid="textarea-edit-quote-notes"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-quote">
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}
