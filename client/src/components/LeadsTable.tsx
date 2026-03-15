import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Phone, Mail, TrendingUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlaTimer } from "./SlaTimer";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  zipCode: string;
  source: string;
  service: string;
  status: "new" | "contacted" | "converted" | "lost" | "spam" | "duplicate" | "qualified" | "scheduled";
  cost: number;
  date: string;
  slaDeadline?: string | null;
  contactedAt?: string | null;
  priority?: string;
  slaBreach?: boolean;
  leadScore?: number;
  isDuplicate?: boolean;
  duplicateOfId?: string | null;
}

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

const statusStyles: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  qualified: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  scheduled: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  converted: "bg-green-500/10 text-green-400 border-green-500/30",
  lost: "bg-red-500/10 text-red-400 border-red-500/30",
  spam: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  duplicate: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-sky-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-yellow-500/10";
  if (score >= 40) return "bg-sky-500/10";
  return "bg-red-500/10";
}

export default function LeadsTable({ leads, onLeadClick }: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortByScore, setSortByScore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.city.toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });
  
  // Sort by score (highest first) if enabled
  const sortedLeads = sortByScore 
    ? [...filteredLeads].sort((a, b) => (b.leadScore || 50) - (a.leadScore || 50))
    : filteredLeads;

  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Lead Pipeline
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 w-[180px]"
                data-testid="input-search-leads"
              />
            </div>
            <Select
              value={sourceFilter}
              onValueChange={(v) => {
                setSourceFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]" data-testid="select-source-filter">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="eLocal">eLocal</SelectItem>
                <SelectItem value="Networx">Networx</SelectItem>
                <SelectItem value="Angi">Angi</SelectItem>
                <SelectItem value="HomeAdvisor">HomeAdvisor</SelectItem>
                <SelectItem value="Thumbtack">Thumbtack</SelectItem>
                <SelectItem value="Inquirly">Inquirly</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={sortByScore ? "default" : "outline"}
              size="sm"
              onClick={() => setSortByScore(!sortByScore)}
              data-testid="button-sort-by-score"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Score
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase">Score</TableHead>
                <TableHead className="text-xs uppercase">Name</TableHead>
                <TableHead className="text-xs uppercase">Contact</TableHead>
                <TableHead className="text-xs uppercase">Location</TableHead>
                <TableHead className="text-xs uppercase">Source</TableHead>
                <TableHead className="text-xs uppercase">Service</TableHead>
                <TableHead className="text-xs uppercase">Status</TableHead>
                <TableHead className="text-xs uppercase">SLA</TableHead>
                <TableHead className="text-xs uppercase text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => onLeadClick?.(lead)}
                  data-testid={`row-lead-${lead.id}`}
                >
                  <TableCell>
                    <div className={cn(
                      "inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold",
                      getScoreBg(lead.leadScore || 50),
                      getScoreColor(lead.leadScore || 50)
                    )} data-testid={`text-score-${lead.id}`}>
                      {lead.leadScore || 50}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{lead.phone}</span>
                      {lead.email && (
                        <Mail className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.city}, {lead.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">
                    {lead.service}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs capitalize", statusStyles[lead.status] || "")}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SlaTimer
                      slaDeadline={lead.slaDeadline || null}
                      contactedAt={lead.contactedAt || null}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${lead.cost}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No leads found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedLeads.length)} of{" "}
              {sortedLeads.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
