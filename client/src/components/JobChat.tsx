import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Send, MessageSquare, Users, User } from "lucide-react";
import type { JobMessage } from "@shared/schema";

interface JobChatProps {
  jobId: string;
  jobCustomerName?: string;
  userId?: string;
}

// Helper to create fetch with user ID header
const createAuthFetch = (userId?: string) => async (url: string, options?: RequestInit) => {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  const response = await fetch(url, { ...options, headers });
  return response;
};

export function JobChat({ jobId, jobCustomerName, userId }: JobChatProps) {
  const [audience, setAudience] = useState<"internal" | "customer">("internal");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const authFetch = createAuthFetch(userId);

  const { data: messages = [], isLoading } = useQuery<JobMessage[]>({
    queryKey: ["/api/jobs", jobId, "messages", userId],
    queryFn: async () => {
      const res = await authFetch(`/api/jobs/${jobId}/messages?audience=all`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { audience: string; body: string }) => {
      const res = await authFetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "messages"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({ audience, body: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const internalMessages = messages.filter((m) => m.audience === "internal");
  const customerMessages = messages.filter((m) => m.audience === "customer");

  const renderMessage = (msg: JobMessage) => {
    const isCustomer = msg.senderType === "customer";
    const isInternal = msg.audience === "internal";

    return (
      <div
        key={msg.id}
        className={`flex flex-col gap-1 p-3 rounded-lg ${
          isCustomer
            ? "bg-blue-50 dark:bg-blue-950/30 ml-4"
            : "bg-muted mr-4"
        }`}
        data-testid={`message-${msg.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isCustomer ? (
              <User className="w-4 h-4 text-blue-500" />
            ) : (
              <Users className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isCustomer
                ? jobCustomerName || "Customer"
                : msg.senderType.charAt(0).toUpperCase() + msg.senderType.slice(1)}
            </span>
            {isInternal && (
              <Badge variant="secondary" className="text-xs">
                Internal
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(msg.createdAt), "MMM d, h:mm a")}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      <Tabs value={audience} onValueChange={(v) => setAudience(v as "internal" | "customer")}>
        <TabsList className="mb-4">
          <TabsTrigger value="internal" data-testid="tab-chat-internal">
            <Users className="w-4 h-4 mr-2" />
            Internal ({internalMessages.length})
          </TabsTrigger>
          <TabsTrigger value="customer" data-testid="tab-chat-customer">
            <MessageSquare className="w-4 h-4 mr-2" />
            Customer ({customerMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="flex-1 m-0">
          <ScrollArea className="h-[280px] pr-4" ref={scrollRef}>
            <div className="space-y-3">
              {internalMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No internal messages yet. Send one to communicate with your team.
                </p>
              ) : (
                internalMessages.map(renderMessage)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="customer" className="flex-1 m-0">
          <ScrollArea className="h-[280px] pr-4" ref={scrollRef}>
            <div className="space-y-3">
              {customerMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No customer messages yet. Send one to communicate with {jobCustomerName || "the customer"}.
                </p>
              ) : (
                customerMessages.map(renderMessage)
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 mt-auto pt-4 border-t">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Send ${audience === "internal" ? "internal team" : "customer"} message...`}
          className="min-h-[60px] resize-none"
          data-testid="input-chat-message"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          size="icon"
          className="h-[60px] w-[60px]"
          data-testid="button-send-message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
