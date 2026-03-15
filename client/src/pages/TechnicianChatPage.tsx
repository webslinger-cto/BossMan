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
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  const RoleIcon = roleIcons[message.senderType === 'customer' ? 'customer' : 'technician'] || User;
  
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

interface TechnicianChatPageProps {
  technicianId: string;
  userId: string;
  fullName: string;
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

export default function TechnicianChatPage({ technicianId, userId, fullName }: TechnicianChatPageProps) {
  const { toast } = useToast();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed'>('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const authFetch = createAuthFetch(userId);

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
          <p className="text-sm text-muted-foreground">Team communication for {fullName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchThreads()} data-testid="button-refresh-threads">
          <RefreshCw className="h-4 w-4" />
        </Button>
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
                {selectedThread?.visibility === 'customer_visible' && (
                  <Badge className="bg-blue-500/20 text-blue-400">Customer Chat</Badge>
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
                        isOwn={msg.senderId === userId}
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
    </div>
  );
}
