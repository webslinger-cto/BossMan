import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Camera,
  Video,
  Upload,
  Image,
  Trash2,
  MapPin,
  Clock,
  Loader2,
  FileImage,
  FileVideo,
} from "lucide-react";
import type { JobAttachment } from "@shared/schema";
import { format } from "date-fns";

interface JobAttachmentsProps {
  jobId: string;
  technicianId: string;
}

export default function JobAttachments({ jobId, technicianId }: JobAttachmentsProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<string>("during");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], isLoading } = useQuery<JobAttachment[]>({
    queryKey: ["/api/jobs", jobId, "attachments"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/attachments`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { 
      type: string; 
      filename: string; 
      caption: string; 
      category: string;
      mimeType: string;
      fileSize: number;
      fileData: string;
      latitude?: string;
      longitude?: string;
    }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/attachments`, {
        ...data,
        technicianId,
      });
      if (!res.ok) throw new Error("Failed to upload attachment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "attachments"] });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setCategory("during");
      toast({ title: "Success", description: "Photo/video uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload attachment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await apiRequest("DELETE", `/api/attachments/${attachmentId}`);
      if (!res.ok) throw new Error("Failed to delete attachment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "attachments"] });
      toast({ title: "Deleted", description: "Attachment removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete attachment", variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowUploadDialog(true);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    let latitude: string | undefined;
    let longitude: string | undefined;

    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude.toString();
        longitude = position.coords.longitude.toString();
      } catch {
        // Continue without GPS
      }
    }

    const isVideo = selectedFile.type.startsWith("video/");
    const fileData = await fileToBase64(selectedFile);
    
    uploadMutation.mutate({
      type: isVideo ? "video" : "photo",
      filename: `${Date.now()}-${selectedFile.name}`,
      caption,
      category,
      mimeType: selectedFile.type,
      fileSize: selectedFile.size,
      fileData,
      latitude,
      longitude,
    });
  };

  const categoryColors: Record<string, string> = {
    before: "bg-blue-500/20 text-blue-400",
    during: "bg-amber-500/20 text-amber-400",
    after: "bg-green-500/20 text-green-400",
  };

  const groupedAttachments = {
    before: attachments.filter(a => a.category === "before"),
    during: attachments.filter(a => a.category === "during"),
    after: attachments.filter(a => a.category === "after"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Photos & Videos</h3>
          <Badge variant="secondary">{attachments.length}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-camera-capture"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-video-capture"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 sm:flex-none min-w-[80px]"
            data-testid="button-take-photo"
          >
            <Camera className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Photo</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
            className="flex-1 sm:flex-none min-w-[80px]"
            data-testid="button-record-video"
          >
            <Video className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Video</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none min-w-[80px]"
            data-testid="button-upload-file"
          >
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No photos or videos yet</p>
            <p className="text-sm">Take photos before, during, and after the job</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {(["before", "during", "after"] as const).map((cat) => {
              const items = groupedAttachments[cat];
              if (items.length === 0) return null;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={categoryColors[cat]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{items.length} items</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map((attachment) => (
                      <Card 
                        key={attachment.id} 
                        className="overflow-hidden"
                        data-testid={`attachment-${attachment.id}`}
                      >
                        <div className="aspect-video bg-muted relative flex items-center justify-center">
                          {attachment.url ? (
                            attachment.type === "video" ? (
                              <video 
                                src={attachment.url} 
                                className="w-full h-full object-cover"
                                controls
                              />
                            ) : (
                              <img 
                                src={attachment.url} 
                                alt={attachment.caption || "Job photo"}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : attachment.type === "photo" ? (
                            <FileImage className="w-12 h-12 text-muted-foreground" />
                          ) : (
                            <FileVideo className="w-12 h-12 text-muted-foreground" />
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => deleteMutation.mutate(attachment.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-attachment-${attachment.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <CardContent className="p-2 space-y-1">
                          {attachment.caption && (
                            <p className="text-xs font-medium truncate">{attachment.caption}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(attachment.createdAt), "MMM d, h:mm a")}
                          </div>
                          {attachment.latitude && attachment.longitude && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>GPS recorded</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo/Video</DialogTitle>
            <DialogDescription>
              Add details about this capture
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {previewUrl && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {selectedFile?.type.startsWith("video/") ? (
                  <video src={previewUrl} className="max-h-full" controls />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-full object-contain" />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before Work</SelectItem>
                  <SelectItem value="during">During Work</SelectItem>
                  <SelectItem value="after">After Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Caption (optional)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe what's shown..."
                data-testid="input-caption"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                data-testid="button-confirm-upload"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
