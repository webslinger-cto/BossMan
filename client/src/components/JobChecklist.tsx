import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  Circle,
  Loader2,
  ListChecks,
  FileText,
} from "lucide-react";
import type { JobChecklist, ChecklistTemplate } from "@shared/schema";
import { format } from "date-fns";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required?: boolean;
}

interface JobChecklistProps {
  jobId: string;
  technicianId: string;
  serviceType?: string;
}

export default function JobChecklistComponent({ jobId, technicianId, serviceType }: JobChecklistProps) {
  const { toast } = useToast();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newItems, setNewItems] = useState<ChecklistItem[]>([]);

  const { data: checklists = [], isLoading } = useQuery<JobChecklist[]>({
    queryKey: ["/api/jobs", jobId, "checklists"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/checklists`);
      if (!res.ok) throw new Error("Failed to fetch checklists");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; items: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/checklists`, {
        ...data,
        technicianId,
      });
      if (!res.ok) throw new Error("Failed to create checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "checklists"] });
      setShowNewDialog(false);
      setNewTitle("");
      setNewItems([]);
      setSelectedTemplate("");
      toast({ title: "Success", description: "Checklist created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create checklist", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, items, completedAt }: { id: string; items: string; completedAt?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/checklists/${id}`, { items, completedAt });
      if (!res.ok) throw new Error("Failed to update checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "checklists"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist", variant: "destructive" });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewTitle(template.name);
      try {
        const items = JSON.parse(template.items || "[]") as ChecklistItem[];
        setNewItems(items.map(item => ({ ...item, completed: false })));
      } catch {
        setNewItems([]);
      }
    }
  };

  const handleCreateChecklist = () => {
    if (!newTitle.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (newItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one item", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: newTitle,
      items: JSON.stringify(newItems),
    });
  };

  const addNewItem = () => {
    const newId = `item-${Date.now()}`;
    setNewItems([...newItems, { id: newId, text: "", completed: false }]);
  };

  const updateNewItem = (id: string, text: string) => {
    setNewItems(newItems.map(item => item.id === id ? { ...item, text } : item));
  };

  const removeNewItem = (id: string) => {
    setNewItems(newItems.filter(item => item.id !== id));
  };

  const toggleChecklistItem = (checklist: JobChecklist, itemId: string) => {
    try {
      const items = JSON.parse(checklist.items || "[]") as ChecklistItem[];
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      const allCompleted = updatedItems.every(item => item.completed);
      updateMutation.mutate({
        id: checklist.id,
        items: JSON.stringify(updatedItems),
        completedAt: allCompleted ? new Date().toISOString() : null,
      });
    } catch {
      // Invalid JSON
    }
  };

  const parseItems = (itemsJson: string | null): ChecklistItem[] => {
    try {
      return JSON.parse(itemsJson || "[]");
    } catch {
      return [];
    }
  };

  const getCompletionStats = (checklist: JobChecklist) => {
    const items = parseItems(checklist.items);
    const completed = items.filter(i => i.completed).length;
    return { completed, total: items.length };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Job Checklists</h3>
          <Badge variant="secondary">{checklists.length}</Badge>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewDialog(true)}
          data-testid="button-new-checklist"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Checklist
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No checklists yet</p>
            <p className="text-sm">Create a checklist to track job tasks</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {checklists.map((checklist) => {
              const items = parseItems(checklist.items);
              const stats = getCompletionStats(checklist);
              const isComplete = stats.completed === stats.total && stats.total > 0;

              return (
                <Card key={checklist.id} data-testid={`checklist-${checklist.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
                        )}
                        {checklist.title}
                      </CardTitle>
                      <Badge className={isComplete ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>
                        {stats.completed}/{stats.total}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleChecklistItem(checklist, item.id)}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleChecklistItem(checklist, item.id)}
                          data-testid={`checkbox-${item.id}`}
                        />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.text}
                        </span>
                        {item.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                    ))}
                    {checklist.completedAt && (
                      <div className="pt-2 text-xs text-muted-foreground border-t">
                        Completed {format(new Date(checklist.completedAt), "MMM d, h:mm a")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Checklist</DialogTitle>
            <DialogDescription>
              Start from a template or create a custom checklist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Start from Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Pre-Job Safety Check"
                data-testid="input-checklist-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {newItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      value={item.text}
                      onChange={(e) => updateNewItem(item.id, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1"
                      data-testid={`input-item-${index}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNewItem(item.id)}
                      className="shrink-0"
                      data-testid={`button-remove-item-${index}`}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addNewItem}
                className="w-full"
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateChecklist}
                disabled={createMutation.isPending}
                data-testid="button-create-checklist"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
