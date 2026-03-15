import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Users,
  Send,
  Clock,
  User,
  UserCog,
  Wrench,
  Building,
  Phone,
  MapPin,
  ChevronLeft,
  Plus,
  X,
  CheckCircle2,
  Archive,
  RefreshCw,
  Smartphone,
  Mail,
  LinkIcon,
  Copy,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ChatThread {
  id: string;
  visibility: 'internal' | 'customer_visible';
  subject: string | null;
  status: 'active' | 'closed';
  relatedJobId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  participants: Participant[];
  unreadCount: number;
  lastMessagePreview: {
    body: string;
    senderDisplayName: string;
    createdAt: string;
  } | null;
  job?: {
    id: string;
    customerName: string;
    serviceType: string;
    status: string;
  };
}

interface Participant {
  id: string;
  threadId: string;
  participantType: 'user' | 'customer';
  participantId: string;
  roleAtTime: string;
  displayName: string;
  lastReadAt: string | null;
}

interface ChatMessage {
  id: string;
  threadId: string;
  senderType: 'user' | 'customer';
  senderId: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
  meta: any;
}

interface UserData {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
}

const roleIcons: Record<string, typeof User> = {
  dispatcher: UserCog,
  technician: Wrench,
  admin: Building,
  customer: User,
};

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const RoleIcon = roleIcons[message.senderType === 'customer' ? 'customer' : 'dispatcher'] || User;
  
  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          <RoleIcon className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
        <div className={`text-xs text-muted-foreground mb-1`}>
          {message.senderDisplayName} • {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

function ThreadListItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: ChatThread;
  isSelected: boolean;
  onClick: () => void;
}) {
  const participantNames = thread.participants
    .filter(p => p.participantType === 'user')
    .map(p => p.displayName)
    .slice(0, 2)
    .join(', ');

  return (
    <div
      onClick={onClick}
      className={`p-3 border-b cursor-pointer transition-colors hover-elevate ${
        isSelected ? 'bg-accent' : ''
      }`}
      data-testid={`thread-item-${thread.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {thread.visibility === 'customer_visible' ? (
              <Users className="h-4 w-4 text-blue-400" />
            ) : (
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium truncate text-sm">
              {thread.subject || (thread.job ? `Job: ${thread.job.customerName}` : 'Thread')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {thread.lastMessagePreview ? (
              <>
                <span className="font-medium">{thread.lastMessagePreview.senderDisplayName}:</span>{' '}
                {thread.lastMessagePreview.body}
              </>
            ) : (
              <span className="italic">No messages yet</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {participantNames}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {thread.unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-5 flex items-center justify-center">
              {thread.unreadCount}
            </Badge>
          )}
          {thread.lastMessageAt && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {thread.visibility === 'customer_visible' && (
          <Badge variant="outline" className="text-xs">Customer</Badge>
        )}
        {thread.job && (
          <Badge variant="outline" className="text-xs">{thread.job.serviceType}</Badge>
        )}
        {thread.status === 'closed' && (
          <Badge variant="secondary" className="text-xs">Closed</Badge>
        )}
      </div>
    </div>
  );
}

// Helper to create fetch with user ID header
const createAuthFetch = (userId: string) => async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-User-Id': userId,
    },
  });
  return response;
};

function NewThreadDialog({
  open,
  onOpenChange,
  onSuccess,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (threadId: string) => void;
  userId: string;
}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const authFetch = createAuthFetch(userId);

  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ['/api/admin/users'],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_user_ids: selectedUsers,
          subject: subject || null,
          visibility: 'internal',
        }),
      });
      if (!res.ok) throw new Error('Failed to create thread');
      return res.json();
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/threads'] });
      toast({ title: 'Thread created' });
      onSuccess(thread.id);
      onOpenChange(false);
      setSubject('');
      setSelectedUsers([]);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create thread', description: error.message, variant: 'destructive' });
    },
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const dispatchersAndAdmins = users.filter(u => u.role === 'dispatcher' || u.role === 'admin');
  const technicians = users.filter(u => u.role === 'technician');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Internal Thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              data-testid="input-thread-subject"
            />
          </div>
          <div>
            <Label className="mb-2 block">Select Participants</Label>
            {dispatchersAndAdmins.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Dispatchers & Admins</div>
                <div className="space-y-2">
                  {dispatchersAndAdmins.map(user => (
                    <div key={user.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                        {user.fullName || user.username} ({user.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {technicians.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Technicians</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {technicians.map(user => (
                    <div key={user.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                        {user.fullName || user.username}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={selectedUsers.length === 0 || createMutation.isPending}
            data-testid="button-create-thread"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Thread'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Job {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerConsentInAppMessaging: boolean;
  serviceType: string | null;
}

function CustomerInviteDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'sms' | 'email' | 'none'>('sms');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const authFetch = createAuthFetch(userId);

  // Fetch jobs that have customer consent for messaging (authenticated)
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['/api/jobs', 'with-consent', userId],
    queryFn: async () => {
      const res = await authFetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const allJobs = await res.json();
      // Filter to jobs that have messaging consent
      return allJobs.filter((j: Job) => j.customerConsentInAppMessaging);
    },
    enabled: open,
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const canSendSms = selectedJob && selectedJob.customerPhone;
  const canSendEmail = selectedJob && selectedJob.customerEmail;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/chat/jobs/${selectedJobId}/customer-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_method: deliveryMethod }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to send invite' }));
        throw new Error(data.error || 'Failed to send invite');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedLink(data.magicLink);
      if (data.delivery?.success) {
        toast({
          title: 'Invite Sent!',
          description: deliveryMethod === 'sms'
            ? `Text message sent to ${selectedJob?.customerPhone}`
            : `Email sent to ${selectedJob?.customerEmail}`,
        });
      } else if (data.delivery?.error) {
        toast({
          title: 'Delivery Failed',
          description: `Link created but delivery failed: ${data.delivery.error}. You can copy the link manually.`,
          variant: 'destructive',
        });
      } else if (deliveryMethod === 'none') {
        toast({ title: 'Chat Link Generated', description: 'Copy the link to share with the customer.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create invite', description: error.message, variant: 'destructive' });
    },
  });

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({ title: 'Link Copied!' });
    }
  };

  const handleClose = () => {
    setSelectedJobId('');
    setGeneratedLink(null);
    setDeliveryMethod('sms');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Invite Customer to Chat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!generatedLink ? (
            <>
              <div>
                <Label className="mb-2 block">Select Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="select-job">
                    <SelectValue placeholder="Choose a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No jobs with messaging consent
                      </div>
                    ) : (
                      jobs.map(job => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.customerName} - {job.serviceType || 'Service'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedJob && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    <span>{selectedJob.customerName}</span>
                  </div>
                  {selectedJob.customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{selectedJob.customerPhone}</span>
                    </div>
                  )}
                  {selectedJob.customerEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{selectedJob.customerEmail}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedJob && (
                <div>
                  <Label className="mb-2 block">Send Invite Via</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={deliveryMethod === 'sms' ? 'default' : 'outline'}
                      onClick={() => setDeliveryMethod('sms')}
                      disabled={!canSendSms}
                      className="flex-1"
                      data-testid="button-delivery-sms"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Text (SMS)
                    </Button>
                    <Button
                      type="button"
                      variant={deliveryMethod === 'email' ? 'default' : 'outline'}
                      onClick={() => setDeliveryMethod('email')}
                      disabled={!canSendEmail}
                      className="flex-1"
                      data-testid="button-delivery-email"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={deliveryMethod === 'none' ? 'default' : 'outline'}
                      onClick={() => setDeliveryMethod('none')}
                      className="flex-1"
                      data-testid="button-delivery-link"
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Link Only
                    </Button>
                  </div>
                  {!canSendSms && selectedJob && (
                    <p className="text-xs text-muted-foreground mt-1">No phone number on file</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Invite Created!</span>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Chat Link:</p>
                <p className="text-sm break-all font-mono">{generatedLink}</p>
              </div>
              <Button onClick={copyLink} variant="outline" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {generatedLink ? 'Done' : 'Cancel'}
          </Button>
          {!generatedLink && (
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!selectedJobId || inviteMutation.isPending}
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DispatchChatPage({ userId, fullName }: { userId: string; fullName: string }) {
  const { toast } = useToast();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed'>('active');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [showCustomerInviteDialog, setShowCustomerInviteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authFetch = createAuthFetch(userId);
  
  // Create a pseudo current user object from props
  const currentUser: UserData = { id: userId, username: fullName, fullName, role: 'dispatcher' };

  const {
    data: threads = [],
    isLoading: threadsLoading,
    refetch: refetchThreads,
  } = useQuery<ChatThread[]>({
    queryKey: ['/api/chat/threads', statusFilter, userId],
    queryFn: async () => {
      const res = await authFetch(`/api/chat/threads?status=${statusFilter}`);
      if (!res.ok) throw new Error('Failed to fetch threads');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  const {
    data: threadDetail,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery<{
    id: string;
    messages: ChatMessage[];
    participants: Participant[];
    job: any;
  }>({
    queryKey: ['/api/chat/threads', selectedThreadId, userId],
    queryFn: async () => {
      const res = await authFetch(`/api/chat/threads/${selectedThreadId}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      return res.json();
    },
    enabled: !!selectedThreadId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await authFetch(`/api/chat/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, client_msg_id: `msg_${Date.now()}` }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      refetchMessages();
      refetchThreads();
      setMessageInput('');
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/chat/threads/${selectedThreadId}/read`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark read');
    },
    onSuccess: () => {
      refetchThreads();
    },
  });

  const closeThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/chat/threads/${selectedThreadId}/close`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to close thread');
    },
    onSuccess: () => {
      toast({ title: 'Thread closed' });
      refetchThreads();
      setSelectedThreadId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to close thread', description: error.message, variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (selectedThreadId && threadDetail) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      markReadMutation.mutate();
    }
  }, [selectedThreadId, threadDetail?.messages?.length]);

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedThreadId) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Internal team & customer communication</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchThreads()} data-testid="button-refresh-threads">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCustomerInviteDialog(true)} data-testid="button-invite-customer">
            <Smartphone className="h-4 w-4 mr-1" /> Invite Customer
          </Button>
          <Button size="sm" onClick={() => setShowNewThreadDialog(true)} data-testid="button-new-thread">
            <Plus className="h-4 w-4 mr-1" /> New Thread
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r flex flex-col bg-card">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'active' | 'closed')} className="w-full">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="active" className="flex-1" data-testid="tab-active-threads">
                Active
              </TabsTrigger>
              <TabsTrigger value="closed" className="flex-1" data-testid="tab-closed-threads">
                Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <ScrollArea className="flex-1">
            {threadsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No {statusFilter} threads
              </div>
            ) : (
              threads.map(thread => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isSelected={thread.id === selectedThreadId}
                  onClick={() => setSelectedThreadId(thread.id)}
                />
              ))
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {!selectedThreadId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a thread to view messages</p>
              </div>
            </div>
          ) : messagesLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading messages...
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedThreadId(null)}
                    className="md:hidden"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <div className="font-medium">
                      {selectedThread?.subject || (threadDetail?.job ? `Job: ${threadDetail.job.customerName}` : 'Thread')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {threadDetail?.participants.length} participants
                    </div>
                  </div>
                </div>
                {selectedThread?.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeThreadMutation.mutate()}
                    disabled={closeThreadMutation.isPending}
                    data-testid="button-close-thread"
                  >
                    <Archive className="h-4 w-4 mr-1" /> Close
                  </Button>
                )}
              </div>

              {threadDetail?.job && (
                <div className="p-3 bg-muted/50 border-b">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {threadDetail.job.customerName}
                    </div>
                    {threadDetail.job.customerPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {threadDetail.job.customerPhone}
                      </div>
                    )}
                    {threadDetail.job.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{threadDetail.job.address}</span>
                      </div>
                    )}
                    <Badge variant="outline">{threadDetail.job.status}</Badge>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 p-4">
                {threadDetail?.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <>
                    {threadDetail?.messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={msg.senderId === currentUser?.id}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              {selectedThread?.status === 'active' && (
                <div className="p-3 border-t bg-card">
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      disabled={sendMutation.isPending}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!messageInput.trim() || sendMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NewThreadDialog
        open={showNewThreadDialog}
        onOpenChange={setShowNewThreadDialog}
        onSuccess={(threadId) => setSelectedThreadId(threadId)}
        userId={userId}
      />

      <CustomerInviteDialog
        open={showCustomerInviteDialog}
        onOpenChange={setShowCustomerInviteDialog}
        userId={userId}
      />
    </div>
  );
}
