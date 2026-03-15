import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Download,
  CreditCard,
  Send,
  RotateCcw,
  Camera,
  X,
  ClipboardCheck,
  Clock,
  Timer,
  Users,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
const cseLogo = "/cse-logo.png";
import JobTimeline from "@/components/JobTimeline";
import type { Job } from "@shared/schema";

interface ChecklistItemState {
  completed: boolean;
  issue: boolean;
  notes: string;
  completedAt?: string;
  issueFlaggedAt?: string;
}

interface QuoteLineItem {
  id: string;
  serviceId: string;
  description: string;
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

interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  subtitle: string;
  chip: string;
  items: ChecklistItem[];
}

const SERVICE_CATALOG = [
  { id: "svc_main_rodding", label: "Main sewer line rodding (cleanout access)", section: "Exterior & main line", defaultPrice: 275 },
  { id: "svc_main_hydrojet", label: "Hydro-jetting main sewer line", section: "Exterior & main line", defaultPrice: 850 },
  { id: "svc_main_camera", label: "Camera inspection of main sewer line", section: "Exterior & main line", defaultPrice: 275 },
  { id: "svc_hose_bib_replace", label: "Replace exterior hose bib / sillcock", section: "Exterior & main line", defaultPrice: 350 },
  { id: "svc_main_shutoff", label: "Replace interior main water shutoff valve", section: "Exterior & main line", defaultPrice: 550 },
  { id: "svc_toilet_clog", label: "Toilet auger / unclog", section: "Interior fixtures", defaultPrice: 175 },
  { id: "svc_toilet_rebuild", label: "Toilet tank rebuild (fill valve, flapper, etc.)", section: "Interior fixtures", defaultPrice: 250 },
  { id: "svc_toilet_replace", label: "Standard toilet replacement (excl. premium fixture)", section: "Interior fixtures", defaultPrice: 600 },
  { id: "svc_sink_drain_clean", label: "Bathroom sink drain cleaning", section: "Interior fixtures", defaultPrice: 180 },
  { id: "svc_shower_drain_clean", label: "Tub / shower drain cleaning", section: "Interior fixtures", defaultPrice: 190 },
  { id: "svc_kitchen_drain_clean", label: "Kitchen line / sink drain cleaning", section: "Interior fixtures", defaultPrice: 225 },
  { id: "svc_disposal_replace", label: "Garbage disposal replacement", section: "Interior fixtures", defaultPrice: 450 },
  { id: "svc_laundry_drain_clean", label: "Laundry standpipe / drain cleaning", section: "Interior fixtures", defaultPrice: 225 },
  { id: "svc_supply_leak", label: "Minor supply line leak repair (accessible)", section: "Supply side", defaultPrice: 375 },
  { id: "svc_angle_stops", label: "Replace fixture angle stop valves (pair)", section: "Supply side", defaultPrice: 225 },
  { id: "svc_prv_install", label: "Install / replace pressure-reducing valve (PRV)", section: "Supply side", defaultPrice: 650 },
  { id: "svc_water_heater_replace", label: "Standard 40-50 gal water heater replacement", section: "Supply side", defaultPrice: 1600 },
  { id: "svc_trap_rework", label: "Under-sink trap and drain rework", section: "Drainage side", defaultPrice: 300 },
  { id: "svc_floor_drain_clean", label: "Floor drain cleaning (per drain)", section: "Drainage side", defaultPrice: 225 },
  { id: "svc_whole_home_drain_clean", label: "Whole-home drain cleaning (multi-fixture)", section: "Drainage side", defaultPrice: 450 },
  { id: "svc_ejector_pump_replace", label: "Sewer / ejector pump replacement", section: "Drainage side", defaultPrice: 1150 },
  { id: "svc_exposed_line_repair", label: "Exposed drain/supply line repair", section: "Basement / mechanical", defaultPrice: 450 },
  { id: "svc_sump_pump_replace", label: "Sump pump replacement", section: "Basement / mechanical", defaultPrice: 1200 },
  { id: "svc_sump_backup_install", label: "Battery backup sump pump installation", section: "Basement / mechanical", defaultPrice: 1600 },
];

const ISSUE_SERVICE_MAP: Record<string, string[]> = {
  "ext-history": ["svc_main_camera", "svc_main_rodding", "svc_whole_home_drain_clean"],
  "ext-cleanout": ["svc_main_camera", "svc_main_rodding", "svc_main_hydrojet"],
  "ext-yard": ["svc_main_camera", "svc_main_hydrojet"],
  "ext-hose-bibs": ["svc_hose_bib_replace"],
  "ext-main-shutoff": ["svc_main_shutoff"],
  "fx-toilets": ["svc_toilet_clog", "svc_toilet_rebuild", "svc_toilet_replace"],
  "fx-bath-sinks": ["svc_sink_drain_clean", "svc_trap_rework"],
  "fx-tubs-showers": ["svc_shower_drain_clean"],
  "fx-kitchen-sink": ["svc_kitchen_drain_clean", "svc_disposal_replace"],
  "fx-laundry": ["svc_laundry_drain_clean"],
  "sup-visible-lines": ["svc_supply_leak", "svc_exposed_line_repair"],
  "sup-fixture-shutoffs": ["svc_angle_stops"],
  "sup-pressure": ["svc_prv_install"],
  "sup-water-heater": ["svc_water_heater_replace"],
  "drn-traps": ["svc_trap_rework"],
  "drn-floor-drains": ["svc_floor_drain_clean", "svc_whole_home_drain_clean"],
  "drn-slow-drains": ["svc_kitchen_drain_clean", "svc_shower_drain_clean", "svc_sink_drain_clean", "svc_whole_home_drain_clean"],
  "drn-main-indicators": ["svc_main_rodding", "svc_main_hydrojet", "svc_main_camera"],
  "drn-ejector-pit": ["svc_ejector_pump_replace"],
  "mech-exposed-pipes": ["svc_exposed_line_repair"],
  "mech-sump": ["svc_sump_pump_replace", "svc_sump_backup_install"],
  "mech-water-damage": ["svc_main_camera", "svc_supply_leak", "svc_sump_pump_replace"],
};

const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "exterior",
    title: "Exterior & Main Line",
    subtitle: "Cleanouts, yard, shutoffs, hose bibs",
    chip: "Drain / sewer focus",
    items: [
      { id: "ext-history", title: "Ask backup / slow-drain history", desc: "Ask about prior backups, slow drains, sewer smells, or recent plumbing work. Note frequency, locations, and dates." },
      { id: "ext-cleanout", title: "Locate and inspect main sewer cleanout", desc: "Find exterior or interior cleanouts. Verify accessibility, cap condition, evidence of past overflow, and nearby grading." },
      { id: "ext-yard", title: "Scan yard / exterior for seepage or sewer odors", desc: "Look for wet spots, settlement, or odors over sewer path, especially near where line leaves the structure." },
      { id: "ext-hose-bibs", title: "Inspect exterior hose bibs / sillcocks", desc: "Check for leaks at handle, spout, and wall penetration. Confirm vacuum breaker present where required." },
      { id: "ext-main-shutoff", title: "Verify main water shutoff location and operation", desc: "Locate main valve. Confirm it turns fully and customer knows location for emergencies." },
    ],
  },
  {
    id: "fixtures",
    title: "Interior Fixtures - Baths & Kitchen",
    subtitle: "Toilets, sinks, tubs/showers, DW, laundry",
    chip: "High-touch points",
    items: [
      { id: "fx-toilets", title: "Toilets", desc: "Check for rocking, leaks at base or tank, tank internals, shutoff operation, refill performance, and visible staining." },
      { id: "fx-bath-sinks", title: "Bathroom sinks", desc: "Inspect faucets, pop-ups, traps, and supply lines. Check for leaks, corrosion, water damage inside vanity, and drain speed." },
      { id: "fx-tubs-showers", title: "Showers / tubs", desc: "Test hot/cold, diverter, and shower head flow. Check caulk/grout, escutcheons, and drain performance. Note flex in the base." },
      { id: "fx-kitchen-sink", title: "Kitchen sink & disposal", desc: "Run hot and cold, disposal (if present), and dishwasher drain cycle. Inspect trap, supply, DW hose, and cabinet floor." },
      { id: "fx-laundry", title: "Laundry area / standpipe", desc: "Inspect washer hoses, standpipe height, tray or floor drain (if any), and nearby walls/floor for past leaks." },
    ],
  },
  {
    id: "supply",
    title: "Supply Side - Water In",
    subtitle: "Supply lines, shutoffs, pressure, heater",
    chip: "Pressurized side",
    items: [
      { id: "sup-visible-lines", title: "Visible supply lines & fittings", desc: "Walk exposed lines. Look for active leaks, corrosion, green/white buildup, pinhole repairs, or mixed materials." },
      { id: "sup-fixture-shutoffs", title: "Fixture shutoff valves", desc: "Spot-check shutoffs at key fixtures (toilet, kitchen sink, washer). Confirm they turn and do not seep at stem." },
      { id: "sup-pressure", title: "Water pressure / flow", desc: "Subjective check at multiple fixtures and floors. Note low, high, or inconsistent pressure for follow-up testing." },
      { id: "sup-water-heater", title: "Water heater", desc: "Check age/label, leaks, corrosion, T&P valve discharge line, combustion air/clearances (if gas), and hot-water availability." },
      { id: "sup-treatment", title: "Softener / filtration (if present)", desc: "Inspect for leaks, bypass status, salt level (softener), and any homeowner-reported issues (taste, staining)." },
    ],
  },
  {
    id: "drainage",
    title: "Drainage Side - Water Out",
    subtitle: "Drains, vents, floor drains, ejector",
    chip: "Flow / venting",
    items: [
      { id: "drn-traps", title: "Under-sink traps & drains", desc: "Check traps for proper configuration, leaks, back-pitch, and signs of past repairs or tape/putty fixes." },
      { id: "drn-floor-drains", title: "Floor drains / low points", desc: "Inspect floor drains for debris, staining, rusted grates, or evidence of backup at low points." },
      { id: "drn-slow-drains", title: "Slow drains / gurgling", desc: "Run water at each major fixture. Note gurgling, air suck, or slow drainage that may indicate vent or mainline issues." },
      { id: "drn-main-indicators", title: "Mainline stress indicators", desc: "Look for multiple fixtures affected on same stack, sewage smells, or recurring clog points tied to main sewer path." },
      { id: "drn-ejector-pit", title: "Sewer / ejector pit (if present)", desc: "Visually check lid, seals, risers, and alarms. Note odors, corrosion, or signs of recent overflow." },
    ],
  },
  {
    id: "basement",
    title: "Basement / Crawl / Mechanical",
    subtitle: "Sump, exposed runs, past water damage",
    chip: "Risk & upsell",
    items: [
      { id: "mech-exposed-pipes", title: "Exposed drain & supply runs", desc: "Scan joist bays, drops, and wall penetrations for leaks, sweating, corrosion, and improper support or slope." },
      { id: "mech-sump", title: "Sump pump & discharge", desc: "Confirm float movement, pump operation (if testable), check valve orientation, and discharge routing away from foundation." },
      { id: "mech-water-damage", title: "Signs of past water damage", desc: "Look for staining, efflorescence, mold/mildew, damaged finishes, or dehumidifiers near plumbing penetrations." },
      { id: "mech-mech-room", title: "Mechanical room plumbing", desc: "Check around furnace, water heater, humidifier, and condensate lines for leaks, improper drains, or unsafe routing." },
    ],
  },
];

const TAX_RATE = 0.1025;
const TECH_FEE = 2.0;

const LABORER_ROLES = [
  { role: "Lead Technician", defaultRate: 75 },
  { role: "Assistant Technician", defaultRate: 45 },
  { role: "Apprentice", defaultRate: 30 },
  { role: "Digger/Excavator", defaultRate: 35 },
  { role: "General Labor", defaultRate: 25 },
];

export default function QuotePage() {
  const { toast } = useToast();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const jobId = params.get("jobId");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const [checklistState, setChecklistState] = useState<Record<string, ChecklistItemState>>({});
  const [customerName, setCustomerName] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [reportedIssue, setReportedIssue] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentNotesItem, setCurrentNotesItem] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [sessionId, setSessionId] = useState(() => Math.random().toString(16).slice(2, 10).toUpperCase());
  const [inspectionStartTime, setInspectionStartTime] = useState(() => new Date().toISOString());

  const { data: job, isLoading: jobLoading, isError: jobError } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  const allItems = CHECKLIST_SECTIONS.flatMap(s => s.items);
  const completedCount = Object.values(checklistState).filter(s => s.completed).length;
  const issueCount = Object.values(checklistState).filter(s => s.issue).length;
  const progressPercent = allItems.length > 0 ? (completedCount / allItems.length) * 100 : 0;

  const getItemState = (id: string): ChecklistItemState => {
    return checklistState[id] || { completed: false, issue: false, notes: "" };
  };

  const toggleCompleted = (id: string) => {
    const currentState = getItemState(id);
    const newCompleted = !currentState.completed;
    setChecklistState(prev => ({
      ...prev,
      [id]: { 
        ...currentState, 
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : undefined,
      },
    }));
  };

  const toggleIssue = (id: string) => {
    const currentState = getItemState(id);
    const newIssue = !currentState.issue;
    setChecklistState(prev => ({
      ...prev,
      [id]: { 
        ...currentState, 
        issue: newIssue,
        issueFlaggedAt: newIssue ? new Date().toISOString() : undefined,
      },
    }));
  };

  const openNotesModal = (id: string) => {
    setCurrentNotesItem(id);
    setTempNotes(getItemState(id).notes);
    setShowNotesModal(true);
  };

  const saveNotes = () => {
    if (currentNotesItem) {
      setChecklistState(prev => ({
        ...prev,
        [currentNotesItem]: { ...getItemState(currentNotesItem), notes: tempNotes },
      }));
    }
    setShowNotesModal(false);
    setCurrentNotesItem(null);
    toast({ title: "Notes saved", description: "Your notes have been saved." });
  };

  const getRecommendedServices = () => {
    const flaggedItems = Object.entries(checklistState)
      .filter(([_, state]) => state.issue)
      .map(([id]) => id);
    
    const serviceIds = new Set<string>();
    flaggedItems.forEach(itemId => {
      const services = ISSUE_SERVICE_MAP[itemId] || [];
      services.forEach(svc => serviceIds.add(svc));
    });
    
    return SERVICE_CATALOG.filter(svc => serviceIds.has(svc.id));
  };

  const addServiceToQuote = (serviceId: string) => {
    const service = SERVICE_CATALOG.find(s => s.id === serviceId);
    if (!service) return;
    
    const existing = lineItems.find(item => item.serviceId === serviceId);
    if (existing) {
      toast({ title: "Already added", description: "This service is already in the quote." });
      return;
    }
    
    setLineItems(prev => [...prev, {
      id: String(Date.now()),
      serviceId: service.id,
      description: service.label,
      quantity: 1,
      unitPrice: service.defaultPrice,
    }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: "quantity" | "unitPrice", value: number) => {
    const safeValue = isNaN(value) ? (field === "quantity" ? 1 : 0) : value;
    const clampedValue = field === "quantity" ? Math.max(1, safeValue) : Math.max(0, safeValue);
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: clampedValue } : item
    ));
  };

  const addLaborEntry = (rolePreset?: typeof LABORER_ROLES[0]) => {
    const newEntry: LaborEntry = {
      id: String(Date.now()),
      laborerName: "",
      role: rolePreset?.role || "General Labor",
      hoursWorked: 1,
      hourlyRate: rolePreset?.defaultRate || 25,
    };
    setLaborEntries(prev => [...prev, newEntry]);
  };

  const updateLaborEntry = (id: string, updates: Partial<LaborEntry>) => {
    setLaborEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  };

  const removeLaborEntry = (id: string) => {
    setLaborEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const laborTotal = laborEntries.reduce((sum, entry) => sum + entry.hoursWorked * entry.hourlyRate, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + laborTotal + tax + TECH_FEE;

  const resetChecklist = () => {
    setChecklistState({});
    setLineItems([]);
    setLaborEntries([]);
    setCustomerName("");
    setLeadSource("");
    setReportedIssue("");
    setSessionId(Math.random().toString(16).slice(2, 10).toUpperCase());
    setInspectionStartTime(new Date().toISOString());
    clearSignature();
    toast({ title: "Reset complete", description: "Checklist and quote have been reset." });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setLastPos(getCanvasPos(e));
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/quotes", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Quote submitted", description: "Quote has been saved to the database." });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmitQuote = () => {
    if (!customerName.trim()) {
      toast({ title: "Customer name required", variant: "destructive" });
      return;
    }
    if (lineItems.length === 0) {
      toast({ title: "No services added", description: "Add at least one service to the quote.", variant: "destructive" });
      return;
    }
    
    createQuoteMutation.mutate({
      jobId: jobId || undefined,
      customerName,
      customerPhone: job?.customerPhone || "",
      address: job?.address || "",
      lineItems: JSON.stringify(lineItems),
      laborEntries: JSON.stringify(laborEntries),
      subtotal: subtotal.toString(),
      laborTotal: laborTotal.toString(),
      taxRate: TAX_RATE.toString(),
      taxAmount: tax.toString(),
      total: total.toString(),
      status: "draft",
      notes: reportedIssue,
    });
  };

  const recommendedServices = getRecommendedServices();

  const currentItem = currentNotesItem ? allItems.find(i => i.id === currentNotesItem) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <img 
            src={cseLogo} 
            alt="Emergency Chicago Sewer Experts" 
            className="w-12 h-12 object-contain rounded"
            data-testid="img-quote-logo"
          />
          <div>
            <h1 className="text-lg font-bold tracking-wide uppercase">Emergency Chicago Sewer Experts</h1>
            <p className="text-xs text-muted-foreground">Field Checklist & Quote Tool</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="gap-1.5 text-xs border-primary/50 bg-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            FIELD CHECK - REQUIRED BEFORE QUOTE
          </Badge>
          <span className="text-xs text-muted-foreground">
            Inspection: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{completedCount}</strong>/{allItems.length} steps completed
              </span>
              <span className="text-muted-foreground">
                <strong className="text-red-400">{issueCount}</strong> items flagged
              </span>
              <span className="text-muted-foreground">
                Session: <strong className="text-foreground">{sessionId}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-40">
                <Progress value={progressPercent} className="h-1.5" />
              </div>
              <Button size="sm" variant="outline" onClick={resetChecklist} data-testid="button-reset-checklist">
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {CHECKLIST_SECTIONS.map(section => (
            <Card key={section.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                      {section.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{section.chip}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                {section.items.map(item => {
                  const state = getItemState(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-lg border p-3 transition-all ${
                        state.completed ? "border-green-500/30 bg-green-500/5" :
                        state.issue ? "border-red-500/30 bg-red-500/5" :
                        "border-border hover:border-muted-foreground/30"
                      }`}
                      data-testid={`checklist-item-${item.id}`}
                    >
                      <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${
                        state.completed ? "bg-gradient-to-b from-green-500 to-green-300" :
                        state.issue ? "bg-gradient-to-b from-red-500 to-red-400" :
                        "bg-muted"
                      }`} />
                      
                      <div className="pl-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${state.completed ? "border-green-500/50 text-green-400 bg-green-500/10" : "opacity-40"}`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${state.issue ? "border-red-500/50 text-red-400 bg-red-500/10" : "opacity-40"}`}
                            >
                              <AlertTriangle className="w-3 h-3 mr-0.5" /> Issue
                            </Badge>
                          </div>
                        </div>
                        
                        {state.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                            Notes: {state.notes}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant={state.completed ? "default" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => toggleCompleted(item.id)}
                            data-testid={`button-toggle-done-${item.id}`}
                          >
                            {state.completed ? "Mark not done" : "Mark done"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => toggleIssue(item.id)}
                            data-testid={`button-toggle-issue-${item.id}`}
                          >
                            {state.issue ? "Clear issue" : "Flag issue"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => openNotesModal(item.id)}
                            data-testid={`button-notes-${item.id}`}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            {state.notes ? "Edit notes" : "Add notes"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Quote Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer Name</Label>
                  <Input
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Source</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elocal">eLocal</SelectItem>
                      <SelectItem value="networx">Networx</SelectItem>
                      <SelectItem value="angi">Angi</SelectItem>
                      <SelectItem value="homeadvisor">HomeAdvisor</SelectItem>
                      <SelectItem value="direct">Direct / Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reported Issue</Label>
                  <Textarea
                    placeholder="Customer's description of the problem..."
                    value={reportedIssue}
                    onChange={(e) => setReportedIssue(e.target.value)}
                    className="min-h-[60px] text-sm"
                    data-testid="input-reported-issue"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Services</Label>
                  <Select onValueChange={addServiceToQuote}>
                    <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-add-service">
                      <SelectValue placeholder="+ Add service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATALOG.map(svc => (
                        <SelectItem key={svc.id} value={svc.id} className="text-xs">
                          {svc.label} - ${svc.defaultPrice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {lineItems.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[10px]">
                          <TableHead className="py-2">Service</TableHead>
                          <TableHead className="py-2 w-16">Qty</TableHead>
                          <TableHead className="py-2 w-20">Price</TableHead>
                          <TableHead className="py-2 w-20 text-right">Total</TableHead>
                          <TableHead className="py-2 w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map(item => (
                          <TableRow key={item.id} className="text-xs">
                            <TableCell className="py-1.5 text-xs">{item.description}</TableCell>
                            <TableCell className="py-1.5">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity === 0 ? "" : item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateLineItem(item.id, "quantity", val === "" ? 0 : parseInt(val) || 0);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === "" || parseInt(e.target.value) < 1) {
                                    updateLineItem(item.id, "quantity", 1);
                                  }
                                }}
                                className="h-7 w-14 text-xs"
                              />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input
                                type="number"
                                min={0}
                                value={item.unitPrice === 0 ? "" : item.unitPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateLineItem(item.id, "unitPrice", val === "" ? 0 : parseFloat(val) || 0);
                                }}
                                className="h-7 w-20 text-xs"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => removeLineItem(item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No services added yet. Select from the dropdown above.
                  </p>
                )}

              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Labor Tracking
                  </Label>
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      const preset = LABORER_ROLES.find(r => r.role === value);
                      addLaborEntry(preset);
                    }}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-add-laborer">
                      <SelectValue placeholder="+ Add laborer" />
                    </SelectTrigger>
                    <SelectContent>
                      {LABORER_ROLES.map(role => (
                        <SelectItem key={role.role} value={role.role} className="text-xs">
                          {role.role} - ${role.defaultRate}/hr
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {laborEntries.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[10px]">
                          <TableHead className="py-2">Name</TableHead>
                          <TableHead className="py-2">Role</TableHead>
                          <TableHead className="py-2 w-16">Hours</TableHead>
                          <TableHead className="py-2 w-16">Rate</TableHead>
                          <TableHead className="py-2 w-20 text-right">Total</TableHead>
                          <TableHead className="py-2 w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laborEntries.map(entry => (
                          <TableRow key={entry.id} className="text-xs" data-testid={`labor-entry-${entry.id}`}>
                            <TableCell className="py-1.5">
                              <Input
                                placeholder="Name"
                                value={entry.laborerName}
                                onChange={(e) => updateLaborEntry(entry.id, { laborerName: e.target.value })}
                                className="h-7 w-24 text-xs"
                                data-testid={`input-laborer-name-${entry.id}`}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-xs">{entry.role}</TableCell>
                            <TableCell className="py-1.5">
                              <Input
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={entry.hoursWorked === 0 ? "" : entry.hoursWorked}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateLaborEntry(entry.id, { hoursWorked: val === "" ? 0 : parseFloat(val) || 0 });
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === "" || parseFloat(e.target.value) < 0.5) {
                                    updateLaborEntry(entry.id, { hoursWorked: 1 });
                                  }
                                }}
                                className="h-7 w-14 text-xs"
                                data-testid={`input-laborer-hours-${entry.id}`}
                              />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input
                                type="number"
                                min={0}
                                value={entry.hourlyRate === 0 ? "" : entry.hourlyRate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateLaborEntry(entry.id, { hourlyRate: val === "" ? 0 : parseFloat(val) || 0 });
                                }}
                                className="h-7 w-14 text-xs"
                                data-testid={`input-laborer-rate-${entry.id}`}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              ${(entry.hoursWorked * entry.hourlyRate).toFixed(2)}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => removeLaborEntry(entry.id)}
                                data-testid={`button-remove-laborer-${entry.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No laborers added. Select a role to add.
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex flex-col items-end gap-0.5 text-sm pt-2">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Services Subtotal</span>
                  <span className="w-20 text-right">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Labor Total</span>
                  <span className="w-20 text-right">${laborTotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Tax (10.25%)</span>
                  <span className="w-20 text-right">${tax.toFixed(2)}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Tech fee</span>
                  <span className="w-20 text-right">${TECH_FEE.toFixed(2)}</span>
                </div>
                <Separator className="my-1 w-full" />
                <div className="flex gap-4 font-semibold">
                  <span>Total</span>
                  <span className="w-20 text-right" data-testid="text-quote-total">${total.toFixed(2)}</span>
                </div>
              </div>

              {recommendedServices.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Recommended based on flagged issues:</Label>
                    <div className="space-y-1">
                      {recommendedServices.slice(0, 5).map(svc => (
                        <div key={svc.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                          <span className="flex-1">{svc.label}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => addServiceToQuote(svc.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Customer Signature</Label>
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={100}
                  className="w-full rounded-lg border cursor-crosshair touch-none"
                  style={{ background: "#0a0a0f" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Sign with mouse or finger
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={clearSignature}>
                    Clear signature
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" data-testid="button-download-pdf">
                  <Download className="w-3 h-3 mr-1" /> Download PDF
                </Button>
                <Button size="sm" variant="outline" data-testid="button-take-payment">
                  <CreditCard className="w-3 h-3 mr-1" /> Take Payment
                </Button>
                <Button size="sm" onClick={handleSubmitQuote} data-testid="button-submit-quote">
                  <Send className="w-3 h-3 mr-1" /> Submit Quote
                </Button>
              </div>
            </CardContent>
          </Card>

          {jobId && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Job Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {jobLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading job timeline...</p>
                ) : jobError ? (
                  <p className="text-sm text-destructive text-center py-4">Failed to load job timeline</p>
                ) : job ? (
                  <JobTimeline job={job} showCountdown={true} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Job not found</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Activity Log
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  Started {formatDistanceToNow(new Date(inspectionStartTime), { addSuffix: true })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <ScrollArea className="h-[180px]">
                <div className="space-y-1.5 text-xs">
                  {Object.entries(checklistState)
                    .filter(([_, state]) => state.completed || state.issue || state.notes)
                    .sort((a, b) => {
                      const timeA = a[1].completedAt || a[1].issueFlaggedAt;
                      const timeB = b[1].completedAt || b[1].issueFlaggedAt;
                      if (!timeA && !timeB) return a[0].localeCompare(b[0]);
                      if (!timeA) return 1;
                      if (!timeB) return -1;
                      return timeB.localeCompare(timeA);
                    })
                    .map(([id, state]) => {
                      const item = allItems.find(i => i.id === id);
                      const timestamp = state.completedAt || state.issueFlaggedAt;
                      return (
                        <div key={id} className="p-2 rounded bg-muted/30 space-y-1" data-testid={`activity-${id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate flex-1 font-medium">{item?.title || id}</span>
                            <div className="flex items-center gap-1">
                              {state.completed && (
                                <Badge variant="outline" className="text-[9px] border-green-500/50 text-green-400 bg-green-500/10">
                                  Done
                                </Badge>
                              )}
                              {state.issue && (
                                <Badge variant="outline" className="text-[9px] border-red-500/50 text-red-400 bg-red-500/10">
                                  Issue
                                </Badge>
                              )}
                              {state.notes && (
                                <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-400 bg-yellow-500/10">
                                  Notes
                                </Badge>
                              )}
                            </div>
                          </div>
                          {timestamp && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{format(new Date(timestamp), "h:mm a")}</span>
                              <span>({formatDistanceToNow(new Date(timestamp), { addSuffix: true })})</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {Object.keys(checklistState).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No activity yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentItem?.title || "Notes"}</DialogTitle>
            <DialogDescription>
              Add findings, recommendations, or upsell opportunities for this line item.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={tempNotes}
            onChange={(e) => setTempNotes(e.target.value)}
            placeholder="Example: Found signs of past backup at floor drain; recommend camera inspection of main and hydro-jetting if roots are confirmed."
            className="min-h-[120px]"
            data-testid="textarea-notes"
          />
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNotes} data-testid="button-save-notes">
                Save notes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTempNotes("")}>
                Clear
              </Button>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Notes are stored locally
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
