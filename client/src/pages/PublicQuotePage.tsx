import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Phone,
  MapPin,
  Mail,
  Clock,
  DollarSign,
  Building2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CustomerChat } from "@/components/CustomerChat";
const cseLogo = "/cse-logo.png";
import type { Quote } from "@shared/schema";

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface LaborEntry {
  id: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

const DISCLOSURE_TEXT_V1 = "By opting in, you agree to receive job updates about this service request by the selected channel(s). Msg & data rates may apply. Reply STOP to opt out of SMS. You can opt out anytime for this job.";

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [actionTaken, setActionTaken] = useState<'accepted' | 'declined' | null>(null);
  
  // Consent state
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOwnershipConfirmed, setSmsOwnershipConfirmed] = useState(false);
  const [emailOwnershipConfirmed, setEmailOwnershipConfirmed] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const { data: quote, isLoading, error } = useQuery<Quote>({
    queryKey: ['/api/public/quote', token],
    queryFn: async () => {
      const res = await fetch(`/api/public/quote/${token}`);
      if (!res.ok) throw new Error('Quote not found');
      return res.json();
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      // Only send consent payload if at least one opt-in is selected
      // This preserves legacy behavior - no consent data means customer never interacted with consent UI
      const hasOptIn = smsOptIn || emailOptIn;
      const payload = hasOptIn ? {
        consent: {
          smsOptIn,
          emailOptIn,
          smsOwnershipConfirmed,
          emailOwnershipConfirmed,
          disclosureVersion: "v1",
          disclosureText: DISCLOSURE_TEXT_V1,
        }
      } : {};
      
      const res = await apiRequest('POST', `/api/public/quote/${token}/accept`, payload);
      return res.json();
    },
    onSuccess: () => setActionTaken('accepted'),
    onError: (error: Error) => {
      setConsentError(error.message || "Failed to accept quote. Please try again.");
    },
  });
  
  const validateAndAccept = () => {
    setConsentError(null);
    
    // Validate consent requirements - only if opt-in is checked, ownership must be confirmed
    if (smsOptIn && !smsOwnershipConfirmed) {
      setConsentError("Please confirm that the phone number belongs to you to receive SMS updates.");
      return;
    }
    if (emailOptIn && !emailOwnershipConfirmed) {
      setConsentError("Please confirm that the email address belongs to you to receive email updates.");
      return;
    }
    
    acceptMutation.mutate();
  };

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/public/quote/${token}/decline`);
      return res.json();
    },
    onSuccess: () => setActionTaken('declined'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Quote Not Found</h1>
            <p className="text-muted-foreground">
              This quote link may have expired or is invalid. Please contact Emergency Chicago Sewer Experts for assistance.
            </p>
            <div className="mt-6">
              <a href="tel:7083987600" className="inline-flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" />
                (708) 398-7600
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lineItems: QuoteLineItem[] = quote.lineItems ? JSON.parse(quote.lineItems) : [];
  const laborEntries: LaborEntry[] = quote.laborEntries ? JSON.parse(quote.laborEntries) : [];
  const subtotal = parseFloat(quote.subtotal || '0');
  const laborTotal = parseFloat(quote.laborTotal || '0');
  const taxAmount = parseFloat(quote.taxAmount || '0');
  const total = parseFloat(quote.total || '0');

  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();
  const isAlreadyActioned = quote.status === 'accepted' || quote.status === 'declined' || actionTaken;
  const canTakeAction = !isExpired && !isAlreadyActioned && quote.status !== 'draft';

  const getStatusBadge = () => {
    if (actionTaken === 'accepted' || quote.status === 'accepted') {
      return <Badge className="bg-green-600 text-white">Accepted</Badge>;
    }
    if (actionTaken === 'declined' || quote.status === 'declined') {
      return <Badge className="bg-red-600 text-white">Declined</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (quote.status === 'viewed') {
      return <Badge variant="outline">Viewed</Badge>;
    }
    return <Badge variant="outline">Pending Review</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-[#1a1a1a] text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={cseLogo} alt="Emergency Chicago Sewer Experts" className="h-12 w-auto rounded" />
            <div>
              <h1 className="font-bold text-lg">Emergency Chicago Sewer Experts</h1>
              <p className="text-sm text-gray-300">Professional Sewer & Drain Services</p>
            </div>
          </div>
          <a href="tel:7083987600" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
            <Phone className="w-4 h-4" />
            (708) 398-7600
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 py-8">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="w-6 h-6" />
                  Service Quote
                </CardTitle>
                <CardDescription className="mt-1">
                  Quote #{quote.id.slice(0, 8).toUpperCase()}
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Customer Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-customer-name">{quote.customerName}</span>
                  </div>
                  {quote.customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${quote.customerPhone}`} className="hover:underline" data-testid="text-customer-phone">
                        {quote.customerPhone}
                      </a>
                    </div>
                  )}
                  {quote.customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-customer-email">{quote.customerEmail}</span>
                    </div>
                  )}
                  {quote.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-customer-address">{quote.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quote Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Created: {format(new Date(quote.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  {quote.expiresAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className={isExpired ? 'text-destructive' : ''}>
                        {isExpired ? 'Expired' : 'Expires'}: {format(new Date(quote.expiresAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {lineItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Services & Materials</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center w-20">Qty</TableHead>
                      <TableHead className="text-right w-28">Unit Price</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${parseFloat(String(item.unitPrice)).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(String(item.total)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {laborEntries.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Labor</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center w-20">Hours</TableHead>
                      <TableHead className="text-right w-28">Rate</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborEntries.map((entry, index) => (
                      <TableRow key={entry.id || index}>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-center">{entry.hours}</TableCell>
                        <TableCell className="text-right">${parseFloat(String(entry.rate)).toFixed(2)}/hr</TableCell>
                        <TableCell className="text-right">${parseFloat(String(entry.total)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services & Materials:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {laborTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor:</span>
                    <span>${laborTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (6.25%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary" data-testid="text-quote-total">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {quote.notes && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">Notes</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">{quote.notes}</p>
              </div>
            )}
          </CardContent>

          {canTakeAction && (
            <CardFooter className="flex-col gap-4 pt-6 border-t">
              <div className="w-full space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Keep Me Updated</h3>
                
                <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sms-opt-in" 
                        checked={smsOptIn} 
                        onCheckedChange={(checked) => {
                          setSmsOptIn(checked === true);
                          if (!checked) setSmsOwnershipConfirmed(false);
                        }}
                        data-testid="checkbox-sms-opt-in"
                      />
                      <Label htmlFor="sms-opt-in" className="text-sm font-medium cursor-pointer">
                        Send me SMS job updates
                      </Label>
                    </div>
                    {smsOptIn && (
                      <div className="flex items-center space-x-2 ml-6">
                        <Checkbox 
                          id="sms-ownership" 
                          checked={smsOwnershipConfirmed} 
                          onCheckedChange={(checked) => setSmsOwnershipConfirmed(checked === true)}
                          data-testid="checkbox-sms-ownership"
                        />
                        <Label htmlFor="sms-ownership" className="text-sm text-muted-foreground cursor-pointer">
                          I confirm this phone number belongs to me
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="email-opt-in" 
                        checked={emailOptIn} 
                        onCheckedChange={(checked) => {
                          setEmailOptIn(checked === true);
                          if (!checked) setEmailOwnershipConfirmed(false);
                        }}
                        data-testid="checkbox-email-opt-in"
                      />
                      <Label htmlFor="email-opt-in" className="text-sm font-medium cursor-pointer">
                        Send me email job updates
                      </Label>
                    </div>
                    {emailOptIn && (
                      <div className="flex items-center space-x-2 ml-6">
                        <Checkbox 
                          id="email-ownership" 
                          checked={emailOwnershipConfirmed} 
                          onCheckedChange={(checked) => setEmailOwnershipConfirmed(checked === true)}
                          data-testid="checkbox-email-ownership"
                        />
                        <Label htmlFor="email-ownership" className="text-sm text-muted-foreground cursor-pointer">
                          I confirm this email address belongs to me
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  {(smsOptIn || emailOptIn) && (
                    <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
                      {DISCLOSURE_TEXT_V1}
                    </p>
                  )}
                </div>
                
                {consentError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{consentError}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  onClick={validateAndAccept}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  data-testid="button-accept-quote"
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Accept Quote
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => declineMutation.mutate()}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  data-testid="button-decline-quote"
                >
                  {declineMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Decline Quote
                </Button>
              </div>
            </CardFooter>
          )}

          {(actionTaken || quote.status === 'accepted' || quote.status === 'declined') && (
            <CardFooter className="border-t pt-6">
              <div className="w-full text-center">
                {(actionTaken === 'accepted' || quote.status === 'accepted') && (
                  <div className="text-green-600">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                    <h3 className="font-bold text-lg">Quote Accepted</h3>
                    <p className="text-muted-foreground mt-1">
                      Thank you! Our team will contact you shortly to schedule your service.
                    </p>
                  </div>
                )}
                {(actionTaken === 'accepted' || quote.status === 'accepted') && token && (
                  <CustomerChat token={token} customerName={quote.customerName || undefined} />
                )}
                {(actionTaken === 'declined' || quote.status === 'declined') && (
                  <div className="text-destructive">
                    <XCircle className="w-12 h-12 mx-auto mb-2" />
                    <h3 className="font-bold text-lg">Quote Declined</h3>
                    <p className="text-muted-foreground mt-1">
                      If you have questions or need a revised quote, please call us at (708) 398-7600.
                    </p>
                  </div>
                )}
              </div>
            </CardFooter>
          )}
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Questions? Call us at <a href="tel:7083987600" className="text-primary hover:underline">(708) 398-7600</a></p>
          <p className="mt-1">Emergency Chicago Sewer Experts - Professional Sewer & Drain Services</p>
        </div>
      </div>
    </div>
  );
}
