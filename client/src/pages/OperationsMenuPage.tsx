import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Users,
  Wrench,
  Briefcase,
  FileText,
  TrendingUp,
  AlertCircle,
  Zap,
  Download
} from "lucide-react";

interface OperationsMenuPageProps {
  role: "admin" | "dispatcher" | "technician" | "salesperson";
  username?: string;
}

export default function OperationsMenuPage({ role, username }: OperationsMenuPageProps) {
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-operations-title">Operations Guide</h1>
        <p className="text-muted-foreground mt-2">
          Your role-specific guide to Emergency Chicago Sewer Experts CRM
        </p>
        <Badge variant="outline" className="mt-3 text-sm">
          {role === "admin" ? "Administrator" : role === "dispatcher" ? "Dispatcher" : role === "salesperson" ? "Sales" : "Technician"} View
        </Badge>
      </div>

      {role === "admin" && <AdminOperationsContent />}
      {role === "dispatcher" && <DispatcherOperationsContent />}
      {role === "technician" && <TechnicianOperationsContent username={username} />}
      {role === "salesperson" && <SalespersonOperationsContent username={username} />}

      <WorkflowDiagram role={role} />
    </div>
  );
}

function AdminOperationsContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Your Role: System Administrator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            As an administrator, you have complete oversight of all CRM operations. You manage leads, 
            monitor job progress, analyze business performance, and configure system settings.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Lead Management
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>View all incoming leads from all sources</li>
                <li>Monitor lead conversion rates by source</li>
                <li>Track cost-per-lead and ROI by channel</li>
                <li>Configure webhook endpoints for lead sources</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Job Oversight
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Monitor all active and completed jobs</li>
                <li>Review job costs and profit margins</li>
                <li>Analyze technician performance</li>
                <li>Track cancelled jobs and expenses</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Technician Management
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Add and manage technician profiles</li>
                <li>Set hourly rates and skills</li>
                <li>View availability and workload</li>
                <li>Review earnings and performance</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Analytics & Reporting
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Revenue and profit dashboards</li>
                <li>Marketing ROI analysis</li>
                <li>Job cost breakdowns</li>
                <li>Export data for external reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Automation Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            The system automatically handles these tasks:
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Auto-Contact Leads</p>
                <p className="text-xs text-muted-foreground">Email sent automatically when leads arrive</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Job Creation</p>
                <p className="text-xs text-muted-foreground">Jobs created when customers confirm estimates</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Tech Assignment</p>
                <p className="text-xs text-muted-foreground">Available techs automatically assigned</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Cost Tracking</p>
                <p className="text-xs text-muted-foreground">Labor, materials, expenses auto-calculated</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead Sources & Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Source</th>
                  <th className="text-left py-2 px-3">Endpoint</th>
                  <th className="text-left py-2 px-3">Authentication</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="py-2 px-3">eLocal</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/elocal</td><td className="py-2 px-3">None</td></tr>
                <tr><td className="py-2 px-3">Networx</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/networx</td><td className="py-2 px-3">None</td></tr>
                <tr><td className="py-2 px-3">Angi</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/angi</td><td className="py-2 px-3">x-angi-key header</td></tr>
                <tr><td className="py-2 px-3">Thumbtack</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/thumbtack</td><td className="py-2 px-3">Basic Auth</td></tr>
                <tr><td className="py-2 px-3">Inquirly</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/inquirly</td><td className="py-2 px-3">None</td></tr>
                <tr><td className="py-2 px-3">Zapier</td><td className="py-2 px-3 font-mono text-xs">/api/webhooks/zapier/lead</td><td className="py-2 px-3">None</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Documentation Downloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Download PDF documentation for offline reference or sharing with stakeholders:
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <a href="/api/documentation/pdf" download>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-download-docs">
                <Download className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-medium">CRM Documentation</p>
                  <p className="text-xs text-muted-foreground">Complete system guide</p>
                </div>
              </Button>
            </a>
            <a href="/api/docs/three-way-comparison" download>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-download-three-way">
                <Download className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-medium">Competitor Comparison</p>
                  <p className="text-xs text-muted-foreground">CSE vs ServiceTitan vs HouseCall</p>
                </div>
              </Button>
            </a>
            <a href="/api/docs/test-results" download>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-download-test-results">
                <Download className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-medium">Test Results</p>
                  <p className="text-xs text-muted-foreground">QA checklist PDF</p>
                </div>
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DispatcherOperationsContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Your Role: Dispatcher
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            As a dispatcher, you are the communication hub between customers and technicians. 
            You coordinate schedules, manage job assignments, and ensure smooth operations.
          </p>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Your Position in the Workflow
            </h4>
            <p className="text-sm text-muted-foreground">
              You receive leads after initial auto-contact, schedule estimates, create jobs, 
              assign technicians, and monitor job progress until completion.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Lead Handling
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Follow up on auto-contacted leads</li>
                <li>Schedule estimate appointments</li>
                <li>Qualify leads and update status</li>
                <li>Convert leads to jobs</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Job Management
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Create jobs from qualified leads</li>
                <li>Assign available technicians</li>
                <li>Monitor job status in real-time</li>
                <li>Handle scheduling conflicts</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Technician Coordination
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>View technician availability</li>
                <li>Check daily job limits</li>
                <li>Match skills to job types</li>
                <li>Reassign jobs if needed</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" /> Communication
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Log all contact attempts</li>
                <li>Send appointment reminders</li>
                <li>Update customers on ETA</li>
                <li>Handle customer inquiries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Status Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Track jobs through each stage:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">pending</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="secondary">assigned</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="secondary">confirmed</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="secondary">en_route</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="secondary">on_site</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="secondary">in_progress</Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge className="bg-green-600">completed</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Morning</p>
                <p className="text-sm text-muted-foreground">Review new leads, check tech availability, confirm today's appointments</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Throughout Day</p>
                <p className="text-sm text-muted-foreground">Monitor job statuses, handle customer calls, coordinate techs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">End of Day</p>
                <p className="text-sm text-muted-foreground">Review completed jobs, follow up on pending leads, prep for tomorrow</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TechnicianOperationsContent({ username }: { username?: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Your Role: Field Technician
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            As a field technician, you are the face of Emergency Chicago Sewer Experts. 
            You perform on-site work, create quotes, and ensure customer satisfaction.
          </p>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Your Position in the Workflow
            </h4>
            <p className="text-sm text-muted-foreground">
              You receive job assignments from dispatch, travel to customer sites, 
              perform the work, and update job status. Your labor hours and job costs 
              are tracked for business analytics.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Job Execution
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>View assigned jobs on dashboard</li>
                <li>Mark status: en route, arrived, started</li>
                <li>Complete jobs with cost details</li>
                <li>Track labor hours worked</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Quote Builder
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Create on-site quotes for customers</li>
                <li>Use quote templates for consistency</li>
                <li>Add line items and materials</li>
                <li>Generate professional quotes</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" /> On-Site Tasks
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Verify arrival at job location</li>
                <li>Document work performed</li>
                <li>Track materials used</li>
                <li>Get customer signature</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Earnings
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>View completed job history</li>
                <li>Track hours worked</li>
                <li>See earnings calculations</li>
                <li>Review job performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Job Status Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Update job status as you progress:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Badge variant="outline" className="w-24 justify-center">en_route</Badge>
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">When you leave for the job site</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Badge variant="outline" className="w-24 justify-center">on_site</Badge>
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">When you arrive at customer location</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Badge variant="outline" className="w-24 justify-center">in_progress</Badge>
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">When you start working</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Badge className="bg-green-600 w-24 justify-center">completed</Badge>
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">When job is finished - add labor hours and costs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            When completing a job, record these expenses:
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="p-3 rounded-md border">
              <p className="font-medium">Labor Hours</p>
              <p className="text-sm text-muted-foreground">Time spent on the job</p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="font-medium">Materials Cost</p>
              <p className="text-sm text-muted-foreground">Parts and supplies used</p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="font-medium">Travel Expense</p>
              <p className="text-sm text-muted-foreground">Fuel and mileage</p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="font-medium">Equipment Cost</p>
              <p className="text-sm text-muted-foreground">Rental or specialized tools</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SalespersonOperationsContent({ username }: { username?: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Your Role: Sales Representative
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            As a sales representative, you generate and nurture leads, create quotes, 
            and close deals. Your commission is calculated from net profit on closed jobs.
          </p>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Commission Structure
            </h4>
            <p className="text-sm text-muted-foreground">
              You earn commission on the NET profit of completed jobs. Net profit = 
              Revenue minus all costs (labor, materials, travel, equipment, and other expenses).
              Your commission rate is shown on your dashboard.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Lead Management
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>View and manage incoming leads</li>
                <li>Follow up with potential customers</li>
                <li>Convert leads to jobs</li>
                <li>Track lead sources and conversions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Quote Creation
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Create professional quotes</li>
                <li>Use quote templates for consistency</li>
                <li>Send quotes to customers</li>
                <li>Track quote status</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Job Tracking
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>Monitor assigned jobs</li>
                <li>Track job completion</li>
                <li>View revenue and costs</li>
                <li>See commission calculations</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Commissions
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>View pending commissions</li>
                <li>Track paid commissions</li>
                <li>See commission history</li>
                <li>Monitor performance metrics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Your commission is calculated when a job is completed:
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-muted/50">
              <p className="font-medium">Step 1: Calculate Total Costs</p>
              <p className="text-sm text-muted-foreground">Labor + Materials + Travel + Equipment + Other Expenses</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <p className="font-medium">Step 2: Calculate Net Profit</p>
              <p className="text-sm text-muted-foreground">Job Revenue - Total Costs = Net Profit</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <p className="font-medium">Step 3: Apply Commission Rate</p>
              <p className="text-sm text-muted-foreground">Net Profit x Your Rate (e.g., 15%) = Your Commission</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowDiagram({ role }: { role: "admin" | "dispatcher" | "technician" | "salesperson" }) {
  const steps = [
    { 
      id: 1, 
      title: "Lead Arrives", 
      desc: "From eLocal, Networx, Angi, etc.",
      roles: ["admin"]
    },
    { 
      id: 2, 
      title: "Auto-Contact", 
      desc: "Email sent automatically",
      roles: ["admin"]
    },
    { 
      id: 3, 
      title: "Customer Follow-up", 
      desc: "Dispatcher confirms estimate",
      roles: ["admin", "dispatcher"]
    },
    { 
      id: 4, 
      title: "Job Created", 
      desc: "Converted from lead",
      roles: ["admin", "dispatcher"]
    },
    { 
      id: 5, 
      title: "Tech Assigned", 
      desc: "Available technician selected",
      roles: ["admin", "dispatcher", "technician"]
    },
    { 
      id: 6, 
      title: "Job Execution", 
      desc: "Tech travels and works on site",
      roles: ["admin", "dispatcher", "technician"]
    },
    { 
      id: 7, 
      title: "Completion", 
      desc: "Costs recorded, job closed",
      roles: ["admin", "dispatcher", "technician"]
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Workflow - Your Role Highlighted</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isInvolved = step.roles.includes(role);
            return (
              <div key={step.id}>
                <div 
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    isInvolved 
                      ? "bg-primary/10 border-2 border-primary" 
                      : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isInvolved 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.id}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${isInvolved ? "" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                  {isInvolved && (
                    <Badge variant="default" className="shrink-0">
                      You're Here
                    </Badge>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-0.5 h-4 ${isInvolved ? "bg-primary" : "bg-muted"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
