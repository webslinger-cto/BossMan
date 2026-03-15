import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Send, MessageSquare, User, Users } from "lucide-react";
import type { JobMessage } from "@shared/schema";

interface CustomerChatProps {
  token: string;
  customerName?: string;
}

export function CustomerChat({ token, customerName }: CustomerChatProps) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<JobMessage[]>({
    queryKey: ["/api/public/quote", token, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/public/quote/${token}/messages`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch messages");
      }
      return res.json();
    },
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/public/quote/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/public/quote", token, "messages"] });
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
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg: JobMessage) => {
    const isCustomer = msg.senderType === "customer";

    return (
      <div
        key={msg.id}
        className={`flex flex-col gap-1 p-3 rounded-lg ${
          isCustomer
            ? "bg-primary/10 ml-8"
            : "bg-muted mr-8"
        }`}
        data-testid={`customer-message-${msg.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isCustomer ? (
              <User className="w-4 h-4 text-primary" />
            ) : (
              <Users className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isCustomer
                ? customerName || "You"
                : "Emergency Chicago Sewer Experts"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(msg.createdAt), "MMM d, h:mm a")}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
          Message Our Team
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            Loading messages...
          </div>
        ) : (
          <>
            <ScrollArea className="h-[200px] pr-4 mb-4" ref={scrollRef}>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Have a question about your job? Send us a message and we'll respond as soon as possible.
                  </p>
                ) : (
                  messages.map(renderMessage)
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[60px] resize-none"
                data-testid="input-customer-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                size="icon"
                className="h-[60px] w-[60px]"
                data-testid="button-send-customer-message"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
