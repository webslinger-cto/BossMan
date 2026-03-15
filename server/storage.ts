import {
  type User, type InsertUser,
  type Technician, type InsertTechnician,
  type Salesperson, type InsertSalesperson,
  type SalesCommission, type InsertSalesCommission,
  type SalespersonLocation, type InsertSalespersonLocation,
  type Lead, type InsertLead,
  type Call, type InsertCall,
  type Job, type InsertJob,
  type JobTimelineEvent, type InsertJobTimelineEvent,
  type Quote, type InsertQuote,
  type Notification, type InsertNotification,
  type ShiftLog, type InsertShiftLog,
  type QuoteTemplate, type InsertQuoteTemplate,
  type ContactAttempt, type InsertContactAttempt,
  type WebhookLog, type InsertWebhookLog,
  type JobAttachment, type InsertJobAttachment,
  type JobChecklist, type InsertJobChecklist,
  type TechnicianLocation, type InsertTechnicianLocation,
  type ChecklistTemplate, type InsertChecklistTemplate,
  type PricebookItem, type InsertPricebookItem,
  type PricebookCategory, type InsertPricebookCategory,
  type MarketingCampaign, type InsertMarketingCampaign,
  type MarketingSpend, type InsertMarketingSpend,
  type BusinessIntake, type InsertBusinessIntake,
  type TimeEntry, type InsertTimeEntry,
  type PayrollPeriod, type InsertPayrollPeriod,
  type PayrollRecord, type InsertPayrollRecord,
  type EmployeePayRate, type InsertEmployeePayRate,
  type JobLeadFee, type InsertJobLeadFee,
  type JobRevenueEvent, type InsertJobRevenueEvent,
  type CompanySettings, type InsertCompanySettings,
  type QuoteLineItem, type InsertQuoteLineItem,
  type ContentPack, type InsertContentPack,
  type ContentItem, type InsertContentItem,
  type JobMessage, type InsertJobMessage,
  type ChatThread, type InsertChatThread,
  type ChatThreadParticipant, type InsertChatThreadParticipant,
  type ChatMessage, type InsertChatMessage,
  type ChatMagicSession, type InsertChatMagicSession,
  users, technicians, salespersons, salesCommissions, salespersonLocations,
  leads, calls, jobs, jobTimelineEvents, quotes, notifications, shiftLogs, quoteTemplates, contactAttempts, webhookLogs,
  jobAttachments, jobChecklists, technicianLocations, checklistTemplates,
  pricebookItems, pricebookCategories, marketingCampaigns, marketingSpend, businessIntakes,
  timeEntries, payrollPeriods, payrollRecords, employeePayRates, jobLeadFees, jobRevenueEvents, companySettings, quoteLineItems,
  contentPacks, contentItems, jobMessages,
  chatThreads, chatThreadParticipants, chatMessages, chatMagicSessions, chatEmailNotifications,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, lte, asc, sql } from "drizzle-orm";

export interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalLeads: number;
    conversionRate: number;
    netProfit: number;
    revenueChange: number;
    leadsChange: number;
    conversionChange: number;
    profitChange: number;
  };
  sourceComparison: Array<{
    source: string;
    leads: number;
    cost: number;
    converted: number;
    costPerLead: number;
    avgResponse: number;
    revenue: number;
    roi: number;
    costPerAcquisition: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    leads: number;
    expenses: number;
    profit: number;
  }>;
  serviceBreakdown: Array<{
    name: string;
    value: number;
    revenue: number;
    avgTicket: number;
    color: string;
  }>;
  techPerformance: Array<{
    name: string;
    jobs: number;
    revenue: number;
    rate: number;
    verified: number;
    avgTime: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

export interface IStorage {
  // Initialization (optional - used by DatabaseStorage to seed data)
  initialize?(): Promise<void>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsers(): Promise<User[]>;

  // Technicians
  getTechnician(id: string): Promise<Technician | undefined>;
  getTechnicianByUserId(userId: string): Promise<Technician | undefined>;
  getTechnicians(): Promise<Technician[]>;
  getAvailableTechnicians(): Promise<Technician[]>;
  createTechnician(tech: InsertTechnician): Promise<Technician>;
  updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician | undefined>;
  deleteTechnicianByUserId(userId: string): Promise<boolean>;

  // Salespersons
  getSalesperson(id: string): Promise<Salesperson | undefined>;
  getSalespersonByUserId(userId: string): Promise<Salesperson | undefined>;
  getSalespersons(): Promise<Salesperson[]>;
  getAvailableSalespersons(): Promise<Salesperson[]>;
  createSalesperson(sp: InsertSalesperson): Promise<Salesperson>;
  updateSalesperson(id: string, updates: Partial<Salesperson>): Promise<Salesperson | undefined>;
  deleteSalespersonByUserId(userId: string): Promise<boolean>;

  // Sales Commissions
  getSalesCommission(id: string): Promise<SalesCommission | undefined>;
  getSalesCommissionsByJob(jobId: string): Promise<SalesCommission[]>;
  getSalesCommissionsBySalesperson(salespersonId: string): Promise<SalesCommission[]>;
  getSalesCommissionsByStatus(status: string): Promise<SalesCommission[]>;
  createSalesCommission(commission: InsertSalesCommission): Promise<SalesCommission>;
  updateSalesCommission(id: string, updates: Partial<SalesCommission>): Promise<SalesCommission | undefined>;
  calculateJobCommission(jobId: string, salespersonId: string): Promise<SalesCommission | undefined>;

  // Salesperson Locations (GPS tracking)
  getSalespersonLocations(salespersonId: string, limit?: number): Promise<SalespersonLocation[]>;
  getLatestSalespersonLocation(salespersonId: string): Promise<SalespersonLocation | undefined>;
  getAllSalespersonsLatestLocations(): Promise<SalespersonLocation[]>;
  createSalespersonLocation(location: InsertSalespersonLocation): Promise<SalespersonLocation>;

  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeads(): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  findLeadsByPhone(phone: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;

  // Calls
  getCall(id: string): Promise<Call | undefined>;
  getCalls(): Promise<Call[]>;
  getRecentCalls(limit: number): Promise<Call[]>;
  getCallsByOutcome(outcome: string): Promise<Call[]>;
  getScheduledCallbacks(): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobs(): Promise<Job[]>;
  getJobsByStatus(status: string): Promise<Job[]>;
  getJobsByTechnician(technicianId: string): Promise<Job[]>;
  getPoolJobs(technicianId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;

  // Job Timeline Events
  getJobTimelineEvents(jobId: string): Promise<JobTimelineEvent[]>;
  createJobTimelineEvent(event: InsertJobTimelineEvent): Promise<JobTimelineEvent>;

  // Job Messages (chat)
  getJobMessages(jobId: string, audience?: 'internal' | 'customer' | 'all'): Promise<JobMessage[]>;
  createJobMessage(message: InsertJobMessage): Promise<JobMessage>;
  getJobByQuoteId(quoteId: string): Promise<Job | undefined>;

  // Quotes
  getQuote(id: string): Promise<Quote | undefined>;
  getQuoteByToken(token: string): Promise<Quote | undefined>;
  getQuotesByJob(jobId: string): Promise<Quote[]>;
  getQuotesByStatus(status: string): Promise<Quote[]>;
  getAllQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined>;

  // Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Analytics
  getAnalytics(timeRange: string): Promise<AnalyticsData>;

  // Shift Logs
  createShiftLog(log: InsertShiftLog): Promise<ShiftLog>;
  getShiftLogsByTechnician(technicianId: string): Promise<ShiftLog[]>;
  getTodayShiftLogs(technicianId: string): Promise<ShiftLog[]>;

  // Quote Templates
  getQuoteTemplates(): Promise<QuoteTemplate[]>;
  getQuoteTemplate(id: string): Promise<QuoteTemplate | undefined>;
  getQuoteTemplatesByServiceType(serviceType: string): Promise<QuoteTemplate[]>;
  createQuoteTemplate(template: InsertQuoteTemplate): Promise<QuoteTemplate>;
  updateQuoteTemplate(id: string, updates: Partial<QuoteTemplate>): Promise<QuoteTemplate | undefined>;
  deleteQuoteTemplate(id: string): Promise<boolean>;

  // Customer Timeline
  getCustomerTimeline(phone: string): Promise<{
    leads: Lead[];
    calls: Call[];
    jobs: Job[];
    quotes: Quote[];
  }>;

  // Contact Attempts
  createContactAttempt(attempt: InsertContactAttempt): Promise<ContactAttempt>;
  getContactAttemptsByLead(leadId: string): Promise<ContactAttempt[]>;
  getContactAttemptsByJob(jobId: string): Promise<ContactAttempt[]>;

  // Webhook Logs
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  getWebhookLogs(limit?: number, source?: string): Promise<WebhookLog[]>;

  // Job Attachments (photos, videos)
  getJobAttachments(jobId: string): Promise<JobAttachment[]>;
  createJobAttachment(attachment: InsertJobAttachment): Promise<JobAttachment>;
  deleteJobAttachment(id: string): Promise<boolean>;

  // Job Checklists
  getJobChecklists(jobId: string): Promise<JobChecklist[]>;
  getJobChecklist(id: string): Promise<JobChecklist | undefined>;
  createJobChecklist(checklist: InsertJobChecklist): Promise<JobChecklist>;
  updateJobChecklist(id: string, updates: Partial<JobChecklist>): Promise<JobChecklist | undefined>;

  // Technician Locations (GPS tracking)
  getTechnicianLocations(technicianId: string, limit?: number): Promise<TechnicianLocation[]>;
  getLatestTechnicianLocation(technicianId: string): Promise<TechnicianLocation | undefined>;
  getAllTechniciansLatestLocations(): Promise<TechnicianLocation[]>;
  createTechnicianLocation(location: InsertTechnicianLocation): Promise<TechnicianLocation>;

  // Checklist Templates
  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  getChecklistTemplatesByServiceType(serviceType: string): Promise<ChecklistTemplate[]>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: string, updates: Partial<ChecklistTemplate>): Promise<ChecklistTemplate | undefined>;
  deleteChecklistTemplate(id: string): Promise<boolean>;

  // Pricebook Items
  getPricebookItems(): Promise<PricebookItem[]>;
  getPricebookItem(id: string): Promise<PricebookItem | undefined>;
  getPricebookItemsByCategory(category: string): Promise<PricebookItem[]>;
  createPricebookItem(item: InsertPricebookItem): Promise<PricebookItem>;
  updatePricebookItem(id: string, updates: Partial<PricebookItem>): Promise<PricebookItem | undefined>;
  deletePricebookItem(id: string): Promise<boolean>;

  // Pricebook Categories
  getPricebookCategories(): Promise<PricebookCategory[]>;
  createPricebookCategory(category: InsertPricebookCategory): Promise<PricebookCategory>;
  updatePricebookCategory(id: string, updates: Partial<PricebookCategory>): Promise<PricebookCategory | undefined>;
  deletePricebookCategory(id: string): Promise<boolean>;

  // Marketing Campaigns
  getMarketingCampaigns(): Promise<MarketingCampaign[]>;
  getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  updateMarketingCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<MarketingCampaign | undefined>;
  deleteMarketingCampaign(id: string): Promise<boolean>;

  // Marketing Spend
  getMarketingSpend(campaignId?: string): Promise<MarketingSpend[]>;
  getMarketingSpendByPeriod(period: string): Promise<MarketingSpend[]>;
  createMarketingSpend(spend: InsertMarketingSpend): Promise<MarketingSpend>;
  updateMarketingSpend(id: string, updates: Partial<MarketingSpend>): Promise<MarketingSpend | undefined>;
  getMarketingROI(): Promise<{ source: string; spend: number; leads: number; converted: number; revenue: number; roi: number }[]>;

  // Business Intakes
  getBusinessIntake(id: string): Promise<BusinessIntake | undefined>;
  getAllBusinessIntakes(): Promise<BusinessIntake[]>;
  createBusinessIntake(intake: InsertBusinessIntake): Promise<BusinessIntake>;
  updateBusinessIntake(id: string, updates: Partial<BusinessIntake>): Promise<BusinessIntake | undefined>;

  // Time Entries (clock in/out)
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  getTimeEntriesByTechnician(technicianId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;

  // Payroll Periods
  getPayrollPeriod(id: string): Promise<PayrollPeriod | undefined>;
  getPayrollPeriods(): Promise<PayrollPeriod[]>;
  getCurrentPayrollPeriod(): Promise<PayrollPeriod | undefined>;
  createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod>;
  updatePayrollPeriod(id: string, updates: Partial<PayrollPeriod>): Promise<PayrollPeriod | undefined>;

  // Payroll Records
  getPayrollRecord(id: string): Promise<PayrollRecord | undefined>;
  getPayrollRecordsByPeriod(periodId: string): Promise<PayrollRecord[]>;
  getPayrollRecordsByUser(userId: string): Promise<PayrollRecord[]>;
  createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord>;
  updatePayrollRecord(id: string, updates: Partial<PayrollRecord>): Promise<PayrollRecord | undefined>;

  // Employee Pay Rates
  getEmployeePayRate(id: string): Promise<EmployeePayRate | undefined>;
  getEmployeePayRatesByUser(userId: string): Promise<EmployeePayRate[]>;
  getActiveEmployeePayRate(userId: string): Promise<EmployeePayRate | undefined>;
  createEmployeePayRate(rate: InsertEmployeePayRate): Promise<EmployeePayRate>;
  updateEmployeePayRate(id: string, updates: Partial<EmployeePayRate>): Promise<EmployeePayRate | undefined>;

  // Job Lead Fees
  getJobLeadFee(id: string): Promise<JobLeadFee | undefined>;
  getJobLeadFeesByJob(jobId: string): Promise<JobLeadFee[]>;
  getJobLeadFeesByTechnician(technicianId: string): Promise<JobLeadFee[]>;
  createJobLeadFee(fee: InsertJobLeadFee): Promise<JobLeadFee>;
  updateJobLeadFee(id: string, updates: Partial<JobLeadFee>): Promise<JobLeadFee | undefined>;

  // Job Revenue Events
  getJobRevenueEvent(id: string): Promise<JobRevenueEvent | undefined>;
  getJobRevenueEventsByJob(jobId: string): Promise<JobRevenueEvent[]>;
  getJobRevenueEventsByTechnician(technicianId: string): Promise<JobRevenueEvent[]>;
  createJobRevenueEvent(event: InsertJobRevenueEvent): Promise<JobRevenueEvent>;
  updateJobRevenueEvent(id: string, updates: Partial<JobRevenueEvent>): Promise<JobRevenueEvent | undefined>;

  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings | undefined>;

  // Quote Line Items
  getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]>;
  createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem>;
  updateQuoteLineItem(id: string, updates: Partial<QuoteLineItem>): Promise<QuoteLineItem | undefined>;
  deleteQuoteLineItem(id: string): Promise<boolean>;
  deleteQuoteLineItemsByQuote(quoteId: string): Promise<boolean>;

  // SEO Content Packs
  getContentPack(id: string): Promise<ContentPack | undefined>;
  getContentPacksByJob(jobId: string): Promise<ContentPack[]>;
  getContentPacks(): Promise<ContentPack[]>;
  createContentPack(pack: InsertContentPack): Promise<ContentPack>;
  updateContentPack(id: string, updates: Partial<ContentPack>): Promise<ContentPack | undefined>;
  deleteContentPack(id: string): Promise<boolean>;

  // SEO Content Items
  getContentItem(id: string): Promise<ContentItem | undefined>;
  getContentItemsByPack(contentPackId: string): Promise<ContentItem[]>;
  getContentItems(): Promise<ContentItem[]>;
  createContentItem(item: InsertContentItem): Promise<ContentItem>;
  updateContentItem(id: string, updates: Partial<ContentItem>): Promise<ContentItem | undefined>;
  deleteContentItem(id: string): Promise<boolean>;

  // Reset
  resetJobBoard(): Promise<void>;

  // Thread-Based Chat System
  getChatThread(id: string): Promise<ChatThread | undefined>;
  getChatThreadByJob(jobId: string, visibility: 'internal' | 'customer_visible'): Promise<ChatThread | undefined>;
  getChatThreadsForUser(userId: string, options?: { status?: string; visibility?: string }): Promise<ChatThread[]>;
  getChatThreadsForCustomer(customerIdentifier: string, jobId: string): Promise<ChatThread[]>;
  createChatThread(thread: InsertChatThread): Promise<ChatThread>;
  updateChatThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread | undefined>;
  
  // Chat Thread Participants
  getChatThreadParticipants(threadId: string): Promise<ChatThreadParticipant[]>;
  getChatThreadParticipant(threadId: string, participantType: string, participantId: string): Promise<ChatThreadParticipant | undefined>;
  addChatThreadParticipant(participant: InsertChatThreadParticipant): Promise<ChatThreadParticipant>;
  updateChatThreadParticipantLastRead(threadId: string, participantType: string, participantId: string): Promise<void>;
  isUserParticipant(threadId: string, userId: string): Promise<boolean>;
  isCustomerParticipant(threadId: string, customerIdentifier: string): Promise<boolean>;
  
  // Chat Messages
  getChatMessages(threadId: string, options?: { limit?: number; before?: Date }): Promise<ChatMessage[]>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUnreadCountForParticipant(threadId: string, participantType: string, participantId: string): Promise<number>;
  getTotalUnreadCountForUser(userId: string): Promise<number>;
  getTotalUnreadCountForCustomer(customerIdentifier: string, jobId: string): Promise<number>;
  
  // Chat Magic Link Sessions
  getChatMagicSession(jobId: string, tokenHash: string): Promise<ChatMagicSession | undefined>;
  getChatMagicSessionByJob(jobId: string, customerIdentifier: string): Promise<ChatMagicSession | undefined>;
  createChatMagicSession(session: InsertChatMagicSession): Promise<ChatMagicSession>;
  updateChatMagicSessionLastUsed(id: string): Promise<void>;
  deleteChatMagicSession(id: string): Promise<boolean>;
  
  // Chat Email Notification Rate Limiting
  getLastChatEmailNotification(jobId: string, customerIdentifier: string): Promise<Date | null>;
  updateChatEmailNotification(jobId: string, customerIdentifier: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private technicians: Map<string, Technician>;
  private leads: Map<string, Lead>;
  private calls: Map<string, Call>;
  private jobs: Map<string, Job>;
  private jobTimelineEvents: Map<string, JobTimelineEvent>;
  private quotes: Map<string, Quote>;
  private notifications: Map<string, Notification>;
  private shiftLogs: Map<string, ShiftLog>;
  private quoteTemplatesMap: Map<string, QuoteTemplate>;
  private jobAttachments: Map<string, JobAttachment>;
  private jobChecklists: Map<string, JobChecklist>;
  private technicianLocations: Map<string, TechnicianLocation>;
  private checklistTemplatesMap: Map<string, ChecklistTemplate>;

  constructor() {
    this.users = new Map();
    this.technicians = new Map();
    this.leads = new Map();
    this.calls = new Map();
    this.jobs = new Map();
    this.jobTimelineEvents = new Map();
    this.quotes = new Map();
    this.notifications = new Map();
    this.shiftLogs = new Map();
    this.quoteTemplatesMap = new Map();
    this.jobAttachments = new Map();
    this.jobChecklists = new Map();
    this.technicianLocations = new Map();
    this.checklistTemplatesMap = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed users first
    const userData: InsertUser[] = [
      { username: "admin", password: "demo123", role: "admin", fullName: "Admin User" },
      { username: "dispatcher", password: "demo123", role: "dispatcher", fullName: "Dispatch Manager" },
      { username: "mike", password: "demo123", role: "technician", fullName: "Mike Johnson" },
      { username: "carlos", password: "demo123", role: "technician", fullName: "Carlos Rodriguez" },
      { username: "james", password: "demo123", role: "technician", fullName: "James Williams" },
    ];
    
    const userIds = ["user-admin", "user-dispatcher", "user-tech-1", "user-tech-2", "user-tech-3"];
    userData.forEach((u, i) => {
      const id = userIds[i];
      this.users.set(id, {
        id,
        username: u.username,
        password: u.password,
        role: u.role || "technician",
        fullName: u.fullName || null,
        phone: u.phone || null,
        email: u.email || null,
        isActive: true,
      });
    });

    // Seed technicians with consistent IDs
    const techIds = ["tech-1", "tech-2", "tech-3", "tech-4", "tech-5"];
    const techData: (InsertTechnician & { id?: string })[] = [
      { fullName: "Mike Johnson", phone: "(708) 555-0101", email: "mike@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-1" },
      { fullName: "Carlos Rodriguez", phone: "(708) 555-0102", email: "carlos@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-2" },
      { fullName: "James Williams", phone: "(708) 555-0103", email: "james@chicagosewerexperts.com", status: "busy", skillLevel: "standard", userId: "user-tech-3" },
      { fullName: "David Martinez", phone: "(708) 555-0104", email: "david@chicagosewerexperts.com", status: "available", skillLevel: "standard" },
      { fullName: "Robert Taylor", phone: "(708) 555-0105", email: "robert@chicagosewerexperts.com", status: "off_duty", skillLevel: "junior" },
    ];
    
    const techClassifications = ["senior", "senior", "junior", "junior", "digger"];
    const allJobTypes = ["Sewer Main - Clear", "Sewer Main - Repair", "Drain Cleaning", "Water Heater - Repair", "Pipe Repair", "Camera Inspection"];
    
    techData.forEach((t, i) => {
      const id = techIds[i];
      this.technicians.set(id, {
        id,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email || null,
        status: t.status || "available",
        skillLevel: t.skillLevel || "standard",
        classification: techClassifications[i] || "junior",
        approvedJobTypes: i < 2 ? allJobTypes : allJobTypes.slice(0, 3),
        commissionRate: i < 2 ? "0.15" : "0.10",
        hourlyRate: i < 2 ? "35.00" : "25.00",
        emergencyRate: "1.5",
        userId: t.userId || null,
        currentJobId: null,
        maxDailyJobs: 8,
        completedJobsToday: 0,
        lastLocationLat: null,
        lastLocationLng: null,
        lastLocationUpdate: null,
      });
    });

    // Seed leads with cost and revenue data for ROI dashboard
    const leadData: InsertLead[] = [
      { source: "eLocal", customerName: "Leonard Willis", customerPhone: "(312) 555-1234", address: "123 Main St", city: "Chicago", zipCode: "60601", serviceType: "Sewer Main - Clear", status: "converted", priority: "high", cost: "45", revenue: "1250" },
      { source: "Networx", customerName: "Maria Garcia", customerPhone: "(312) 555-2345", address: "456 Oak Ave", city: "Chicago", zipCode: "60602", serviceType: "Drain Cleaning", status: "converted", priority: "normal", cost: "35", revenue: "450" },
      { source: "Direct", customerName: "Thomas Brown", customerPhone: "(312) 555-3456", address: "789 Elm St", city: "Evanston", zipCode: "60201", serviceType: "Water Heater - Repair", status: "converted", priority: "normal", cost: "0", revenue: "850" },
      { source: "eLocal", customerName: "Sarah Johnson", customerPhone: "(312) 555-4567", address: "321 Pine Rd", city: "Chicago", zipCode: "60603", serviceType: "Pipe Repair", status: "new", priority: "urgent", cost: "45", revenue: "0" },
      { source: "Angi", customerName: "Michael Davis", customerPhone: "(312) 555-5678", address: "654 Cedar Ln", city: "Oak Park", zipCode: "60301", serviceType: "Toilet Repair", status: "converted", priority: "low", cost: "55", revenue: "380" },
      { source: "Networx", customerName: "Robert Chen", customerPhone: "(312) 555-6789", address: "111 Lake St", city: "Chicago", zipCode: "60604", serviceType: "Sewer Main - Clear", status: "converted", priority: "high", cost: "35", revenue: "1450" },
      { source: "eLocal", customerName: "Jennifer White", customerPhone: "(312) 555-7890", address: "222 River Rd", city: "Chicago", zipCode: "60605", serviceType: "Drain Cleaning", status: "converted", priority: "normal", cost: "45", revenue: "320" },
      { source: "Direct", customerName: "David Kim", customerPhone: "(312) 555-8901", address: "333 Oak St", city: "Skokie", zipCode: "60076", serviceType: "Camera Inspection", status: "converted", priority: "normal", cost: "0", revenue: "275" },
      { source: "Angi", customerName: "Lisa Martinez", customerPhone: "(312) 555-9012", address: "444 Elm Ave", city: "Chicago", zipCode: "60606", serviceType: "Pipe Repair", status: "new", priority: "normal", cost: "55", revenue: "0" },
      { source: "Thumbtack", customerName: "James Wilson", customerPhone: "(312) 555-0123", address: "555 Pine Ln", city: "Oak Park", zipCode: "60302", serviceType: "Water Heater - Repair", status: "converted", priority: "high", cost: "40", revenue: "920" },
    ];
    leadData.forEach(l => this.createLead(l));

    // Seed calls
    const callData: InsertCall[] = [
      { callerPhone: "(312) 555-1234", callerName: "Leonard Willis", direction: "inbound", status: "completed", duration: 180 },
      { callerPhone: "(312) 555-2345", callerName: "Maria Garcia", direction: "inbound", status: "completed", duration: 240 },
      { callerPhone: "(312) 555-9999", direction: "inbound", status: "missed", duration: 0 },
      { callerPhone: "(312) 555-3456", callerName: "Thomas Brown", direction: "outbound", status: "completed", duration: 120 },
    ];
    callData.forEach(c => this.createCall(c));

    // Seed jobs with consistent technician IDs
    const now = new Date();
    const jobData: InsertJob[] = [
      {
        customerName: "Maria Garcia",
        customerPhone: "(312) 555-2345",
        address: "456 Oak Ave",
        city: "Chicago",
        zipCode: "60602",
        serviceType: "Drain Cleaning",
        status: "assigned",
        priority: "normal",
        scheduledDate: now,
        scheduledTimeStart: "09:00",
        scheduledTimeEnd: "11:00",
        assignedTechnicianId: "tech-1", // Mike Johnson
      },
      {
        customerName: "Thomas Brown",
        customerPhone: "(312) 555-3456",
        address: "789 Elm St",
        city: "Evanston",
        zipCode: "60201",
        serviceType: "Water Heater - Repair",
        status: "confirmed",
        priority: "normal",
        scheduledDate: now,
        scheduledTimeStart: "13:00",
        scheduledTimeEnd: "15:00",
        assignedTechnicianId: "tech-1", // Mike Johnson
      },
      {
        customerName: "Sarah Johnson",
        customerPhone: "(312) 555-4567",
        address: "321 Pine Rd",
        city: "Chicago",
        zipCode: "60603",
        serviceType: "Pipe Repair",
        status: "pending",
        priority: "urgent",
        scheduledDate: now,
        scheduledTimeStart: "14:00",
        scheduledTimeEnd: "16:00",
      },
    ];
    jobData.forEach(j => this.createJob(j));

    // Seed demo notification for technician
    this.createNotification({
      userId: "user-tech-1",
      type: "job_assigned",
      title: "New Job Assigned",
      message: "You have been assigned to Drain Cleaning at 456 Oak Ave",
      actionUrl: "/technician",
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role || "technician",
      fullName: insertUser.fullName || null,
      phone: insertUser.phone || null,
      email: insertUser.email || null,
      isActive: true,
    };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Technicians
  async getTechnician(id: string): Promise<Technician | undefined> {
    return this.technicians.get(id);
  }

  async getTechnicianByUserId(userId: string): Promise<Technician | undefined> {
    return Array.from(this.technicians.values()).find(t => t.userId === userId);
  }

  async getTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values());
  }

  async getAvailableTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values()).filter(t => t.status === "available");
  }

  async createTechnician(insertTech: InsertTechnician): Promise<Technician> {
    const id = randomUUID();
    const tech: Technician = {
      id,
      userId: insertTech.userId || null,
      fullName: insertTech.fullName,
      phone: insertTech.phone,
      email: insertTech.email || null,
      status: insertTech.status || "available",
      currentJobId: insertTech.currentJobId || null,
      skillLevel: insertTech.skillLevel || "standard",
      classification: insertTech.classification || "junior",
      approvedJobTypes: insertTech.approvedJobTypes || null,
      commissionRate: insertTech.commissionRate || "0.10",
      hourlyRate: insertTech.hourlyRate || "25.00",
      emergencyRate: insertTech.emergencyRate || "1.5",
      maxDailyJobs: insertTech.maxDailyJobs || 8,
      completedJobsToday: insertTech.completedJobsToday || 0,
      lastLocationLat: insertTech.lastLocationLat || null,
      lastLocationLng: insertTech.lastLocationLng || null,
      lastLocationUpdate: insertTech.lastLocationUpdate || null,
    };
    this.technicians.set(id, tech);
    return tech;
  }

  async updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician | undefined> {
    const tech = this.technicians.get(id);
    if (!tech) return undefined;
    const updated = { ...tech, ...updates };
    this.technicians.set(id, updated);
    return updated;
  }

  async deleteTechnicianByUserId(userId: string): Promise<boolean> {
    for (const [id, tech] of this.technicians.entries()) {
      if (tech.userId === userId) {
        this.technicians.delete(id);
        return true;
      }
    }
    return false;
  }

  // Salespersons (stub implementations for MemStorage)
  async getSalesperson(_id: string): Promise<Salesperson | undefined> {
    return undefined;
  }

  async getSalespersonByUserId(_userId: string): Promise<Salesperson | undefined> {
    return undefined;
  }

  async getSalespersons(): Promise<Salesperson[]> {
    return [];
  }

  async getAvailableSalespersons(): Promise<Salesperson[]> {
    return [];
  }

  async createSalesperson(_sp: InsertSalesperson): Promise<Salesperson> {
    throw new Error("Not implemented in MemStorage - use DatabaseStorage");
  }

  async updateSalesperson(_id: string, _updates: Partial<Salesperson>): Promise<Salesperson | undefined> {
    return undefined;
  }

  async deleteSalespersonByUserId(_userId: string): Promise<boolean> {
    return false; // Stub implementation
  }

  // Sales Commissions (stub implementations for MemStorage)
  async getSalesCommission(_id: string): Promise<SalesCommission | undefined> {
    return undefined;
  }

  async getSalesCommissionsByJob(_jobId: string): Promise<SalesCommission[]> {
    return [];
  }

  async getSalesCommissionsBySalesperson(_salespersonId: string): Promise<SalesCommission[]> {
    return [];
  }

  async getSalesCommissionsByStatus(_status: string): Promise<SalesCommission[]> {
    return [];
  }

  async createSalesCommission(_commission: InsertSalesCommission): Promise<SalesCommission> {
    throw new Error("Not implemented in MemStorage - use DatabaseStorage");
  }

  async updateSalesCommission(_id: string, _updates: Partial<SalesCommission>): Promise<SalesCommission | undefined> {
    return undefined;
  }

  async calculateJobCommission(_jobId: string, _salespersonId: string): Promise<SalesCommission | undefined> {
    return undefined;
  }

  // Salesperson Locations (stub implementations for MemStorage)
  async getSalespersonLocations(_salespersonId: string, _limit?: number): Promise<SalespersonLocation[]> {
    return [];
  }

  async getLatestSalespersonLocation(_salespersonId: string): Promise<SalespersonLocation | undefined> {
    return undefined;
  }

  async getAllSalespersonsLatestLocations(): Promise<SalespersonLocation[]> {
    return [];
  }

  async createSalespersonLocation(_location: InsertSalespersonLocation): Promise<SalespersonLocation> {
    throw new Error("Not implemented in MemStorage - use DatabaseStorage");
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(l => l.status === status);
  }

  async findLeadsByPhone(phone: string): Promise<Lead[]> {
    const normalizedPhone = phone.replace(/\D/g, '');
    return Array.from(this.leads.values()).filter(l => {
      const leadPhone = l.customerPhone.replace(/\D/g, '');
      return leadPhone === normalizedPhone;
    });
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date();
    const priority = insertLead.priority || "normal";
    const slaMinutes = priority === "urgent" ? 15 : priority === "high" ? 30 : 60;
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);
    const lead: Lead = {
      id,
      source: insertLead.source,
      customerName: insertLead.customerName,
      customerPhone: insertLead.customerPhone,
      customerEmail: insertLead.customerEmail || null,
      address: insertLead.address || null,
      city: insertLead.city || null,
      zipCode: insertLead.zipCode || null,
      serviceType: insertLead.serviceType || null,
      description: insertLead.description || null,
      status: insertLead.status || "new",
      priority,
      cost: insertLead.cost || null,
      createdAt: now,
      updatedAt: now,
      convertedAt: insertLead.convertedAt || null,
      assignedTo: insertLead.assignedTo || null,
      contactedAt: insertLead.contactedAt || null,
      slaDeadline,
      slaBreach: false,
      leadScore: insertLead.leadScore || 50,
      isDuplicate: insertLead.isDuplicate || false,
      duplicateOfId: insertLead.duplicateOfId || null,
      revenue: insertLead.revenue || null,
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    const updated = { ...lead, ...updates, updatedAt: new Date() };
    this.leads.set(id, updated);
    return updated;
  }

  // Calls
  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async getCalls(): Promise<Call[]> {
    return Array.from(this.calls.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentCalls(limit: number): Promise<Call[]> {
    return (await this.getCalls()).slice(0, limit);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = randomUUID();
    const call: Call = {
      id,
      leadId: insertCall.leadId || null,
      jobId: insertCall.jobId || null,
      callerPhone: insertCall.callerPhone,
      callerName: insertCall.callerName || null,
      direction: insertCall.direction || "inbound",
      status: insertCall.status || "completed",
      duration: insertCall.duration || null,
      recordingUrl: insertCall.recordingUrl || null,
      notes: insertCall.notes || null,
      handledBy: insertCall.handledBy || null,
      createdAt: new Date(),
    };
    this.calls.set(id, call);
    return call;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  async getJobsByTechnician(technicianId: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(j => j.assignedTechnicianId === technicianId);
  }

  async getPoolJobs(technicianId: string): Promise<Job[]> {
    const tech = this.technicians.get(technicianId);
    if (!tech) return [];
    
    const approvedTypes = tech.approvedJobTypes || [];
    
    return Array.from(this.jobs.values())
      .filter(j => {
        if (j.status !== "pending") return false;
        if (j.assignedTechnicianId) return false;
        if (approvedTypes.length === 0) return true;
        return approvedTypes.includes(j.serviceType);
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const now = new Date();
    const job: Job = {
      id,
      leadId: insertJob.leadId || null,
      customerName: insertJob.customerName,
      customerPhone: insertJob.customerPhone,
      customerEmail: insertJob.customerEmail || null,
      address: insertJob.address,
      city: insertJob.city || null,
      zipCode: insertJob.zipCode || null,
      latitude: insertJob.latitude || null,
      longitude: insertJob.longitude || null,
      serviceType: insertJob.serviceType,
      description: insertJob.description || null,
      status: insertJob.status || "pending",
      priority: insertJob.priority || "normal",
      scheduledDate: insertJob.scheduledDate || null,
      scheduledTimeStart: insertJob.scheduledTimeStart || null,
      scheduledTimeEnd: insertJob.scheduledTimeEnd || null,
      estimatedDuration: insertJob.estimatedDuration || null,
      assignedTechnicianId: insertJob.assignedTechnicianId || null,
      assignedSalespersonId: insertJob.assignedSalespersonId || null,
      dispatcherId: insertJob.dispatcherId || null,
      createdAt: now,
      updatedAt: now,
      assignedAt: insertJob.assignedAt || null,
      confirmedAt: insertJob.confirmedAt || null,
      enRouteAt: insertJob.enRouteAt || null,
      arrivedAt: insertJob.arrivedAt || null,
      arrivalLat: insertJob.arrivalLat || null,
      arrivalLng: insertJob.arrivalLng || null,
      arrivalVerified: insertJob.arrivalVerified || null,
      arrivalDistance: insertJob.arrivalDistance || null,
      startedAt: insertJob.startedAt || null,
      completedAt: insertJob.completedAt || null,
      laborHours: insertJob.laborHours || null,
      laborRate: insertJob.laborRate || null,
      laborCost: insertJob.laborCost || null,
      materialsCost: insertJob.materialsCost || null,
      travelExpense: insertJob.travelExpense || null,
      equipmentCost: insertJob.equipmentCost || null,
      otherExpenses: insertJob.otherExpenses || null,
      expenseNotes: insertJob.expenseNotes || null,
      totalCost: insertJob.totalCost || null,
      totalRevenue: insertJob.totalRevenue || null,
      profit: insertJob.profit || null,
      cancelledAt: insertJob.cancelledAt || null,
      cancellationReason: insertJob.cancellationReason || null,
      cancelledBy: insertJob.cancelledBy || null,
    };
    this.jobs.set(id, job);
    
    // Create initial timeline event
    this.createJobTimelineEvent({
      jobId: id,
      eventType: "created",
      description: "Job created",
    });
    
    return job;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...updates, updatedAt: new Date() };
    this.jobs.set(id, updated);
    return updated;
  }

  // Job Timeline Events
  async getJobTimelineEvents(jobId: string): Promise<JobTimelineEvent[]> {
    return Array.from(this.jobTimelineEvents.values())
      .filter(e => e.jobId === jobId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createJobTimelineEvent(insertEvent: InsertJobTimelineEvent): Promise<JobTimelineEvent> {
    const id = randomUUID();
    const event: JobTimelineEvent = {
      id,
      jobId: insertEvent.jobId,
      eventType: insertEvent.eventType,
      description: insertEvent.description || null,
      createdBy: insertEvent.createdBy || null,
      createdAt: new Date(),
      metadata: insertEvent.metadata || null,
    };
    this.jobTimelineEvents.set(id, event);
    return event;
  }

  // Job Messages (chat) - MemStorage stub
  private jobMessagesMap: Map<string, JobMessage> = new Map();

  async getJobMessages(jobId: string, audience?: 'internal' | 'customer' | 'all'): Promise<JobMessage[]> {
    const messages = Array.from(this.jobMessagesMap.values())
      .filter(m => m.jobId === jobId)
      .filter(m => audience === 'all' || !audience || m.audience === audience)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return messages;
  }

  async createJobMessage(insertMessage: InsertJobMessage): Promise<JobMessage> {
    const id = randomUUID();
    const message: JobMessage = {
      id,
      jobId: insertMessage.jobId,
      audience: insertMessage.audience,
      senderType: insertMessage.senderType,
      senderUserId: insertMessage.senderUserId || null,
      body: insertMessage.body,
      createdAt: new Date(),
      meta: insertMessage.meta || {},
    };
    this.jobMessagesMap.set(id, message);
    return message;
  }

  async getJobByQuoteId(quoteId: string): Promise<Job | undefined> {
    return Array.from(this.jobs.values()).find(j => j.quoteId === quoteId);
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  async getQuoteByToken(token: string): Promise<Quote | undefined> {
    return Array.from(this.quotes.values()).find(q => q.publicToken === token);
  }

  async getQuotesByJob(jobId: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(q => q.jobId === jobId);
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const id = randomUUID();
    const quote: Quote = {
      id,
      jobId: insertQuote.jobId,
      technicianId: insertQuote.technicianId || null,
      customerName: insertQuote.customerName,
      customerPhone: insertQuote.customerPhone || null,
      customerEmail: insertQuote.customerEmail || null,
      address: insertQuote.address || null,
      lineItems: insertQuote.lineItems || null,
      laborEntries: insertQuote.laborEntries || null,
      subtotal: insertQuote.subtotal || null,
      laborTotal: insertQuote.laborTotal || "0",
      taxRate: insertQuote.taxRate || "0",
      taxAmount: insertQuote.taxAmount || "0",
      total: insertQuote.total || null,
      status: insertQuote.status || "draft",
      notes: insertQuote.notes || null,
      publicToken: insertQuote.publicToken || null,
      createdAt: new Date(),
      sentAt: insertQuote.sentAt || null,
      viewedAt: insertQuote.viewedAt || null,
      acceptedAt: insertQuote.acceptedAt || null,
      declinedAt: insertQuote.declinedAt || null,
      expiresAt: insertQuote.expiresAt || null,
    };
    this.quotes.set(id, quote);
    return quote;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const quote = this.quotes.get(id);
    if (!quote) return undefined;
    const updated = { ...quote, ...updates };
    this.quotes.set(id, updated);
    return updated;
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return (await this.getNotificationsByUser(userId)).filter(n => !n.isRead);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId: insertNotification.userId,
      type: insertNotification.type,
      title: insertNotification.title,
      message: insertNotification.message,
      jobId: insertNotification.jobId || null,
      isRead: false,
      actionUrl: insertNotification.actionUrl || null,
      createdAt: new Date(),
      readAt: null,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    const updated = { ...notification, isRead: true, readAt: new Date() };
    this.notifications.set(id, updated);
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const userNotifications = await this.getNotificationsByUser(userId);
    const now = new Date();
    userNotifications.forEach(n => {
      this.notifications.set(n.id, { ...n, isRead: true, readAt: now });
    });
  }

  async getAllQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(q => q.status === status);
  }

  async getAnalytics(timeRange: string): Promise<AnalyticsData> {
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (timeRange) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
        break;
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth() - 2, 1);
        break;
      case "year":
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }

    const allLeads = Array.from(this.leads.values());
    const allJobs = Array.from(this.jobs.values());
    const allQuotes = Array.from(this.quotes.values());
    const allTechs = Array.from(this.technicians.values());

    const currentLeads = allLeads.filter(l => new Date(l.createdAt) >= startDate);
    const prevLeads = allLeads.filter(l => new Date(l.createdAt) >= prevStartDate && new Date(l.createdAt) <= prevEndDate);
    const currentJobs = allJobs.filter(j => new Date(j.createdAt) >= startDate);
    const prevJobs = allJobs.filter(j => new Date(j.createdAt) >= prevStartDate && new Date(j.createdAt) <= prevEndDate);
    const currentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= startDate);

    const totalRevenue = currentQuotes.reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);
    const prevRevenue = allQuotes.filter(q => new Date(q.createdAt) >= prevStartDate && new Date(q.createdAt) <= prevEndDate)
      .reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);

    const totalLeads = currentLeads.length;
    const convertedLeads = currentLeads.filter(l => l.status === "converted").length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const prevConvertedLeads = prevLeads.filter(l => l.status === "converted").length;
    const prevConversionRate = prevLeads.length > 0 ? (prevConvertedLeads / prevLeads.length) * 100 : 0;

    const expenseRate = 0.4;
    const netProfit = totalRevenue * (1 - expenseRate);
    const prevProfit = prevRevenue * (1 - expenseRate);

    const sourceStats = new Map<string, { leads: number; cost: number; converted: number; revenue: number }>();
    currentLeads.forEach(l => {
      const stats = sourceStats.get(l.source) || { leads: 0, cost: 0, converted: 0, revenue: 0 };
      stats.leads++;
      stats.cost += parseFloat(l.cost || "0");
      stats.revenue += parseFloat(l.revenue || "0");
      if (l.status === "converted") stats.converted++;
      sourceStats.set(l.source, stats);
    });

    const sourceComparison = Array.from(sourceStats.entries()).map(([source, stats]) => {
      const roi = stats.cost > 0 ? ((stats.revenue - stats.cost) / stats.cost) * 100 : 0;
      const costPerAcquisition = stats.converted > 0 ? Math.round(stats.cost / stats.converted) : 0;
      return {
        source,
        leads: stats.leads,
        cost: stats.cost,
        converted: stats.converted,
        costPerLead: stats.leads > 0 ? Math.round(stats.cost / stats.leads) : 0,
        avgResponse: Math.floor(Math.random() * 15) + 5,
        revenue: stats.revenue,
        roi: Math.round(roi * 10) / 10,
        costPerAcquisition,
      };
    });

    const serviceStats = new Map<string, { count: number; revenue: number }>();
    currentJobs.forEach(j => {
      const stats = serviceStats.get(j.serviceType) || { count: 0, revenue: 0 };
      stats.count++;
      serviceStats.set(j.serviceType, stats);
    });
    currentQuotes.forEach(q => {
      const job = allJobs.find(j => j.id === q.jobId);
      if (job) {
        const stats = serviceStats.get(job.serviceType) || { count: 0, revenue: 0 };
        stats.revenue += parseFloat(q.total || "0");
        serviceStats.set(job.serviceType, stats);
      }
    });

    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(0 72% 51%)"];
    const serviceBreakdown = Array.from(serviceStats.entries()).map(([name, stats], i) => ({
      name,
      value: stats.count,
      revenue: stats.revenue,
      avgTicket: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
      color: colors[i % colors.length],
    }));

    const techStats = new Map<string, { jobs: number; revenue: number; verified: number }>();
    allTechs.forEach(t => techStats.set(t.id, { jobs: 0, revenue: 0, verified: 0 }));
    currentJobs.forEach(j => {
      if (j.assignedTechnicianId) {
        const stats = techStats.get(j.assignedTechnicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.jobs++;
        if (j.arrivalVerified) stats.verified++;
        techStats.set(j.assignedTechnicianId, stats);
      }
    });
    currentQuotes.forEach(q => {
      if (q.technicianId) {
        const stats = techStats.get(q.technicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.revenue += parseFloat(q.total || "0");
        techStats.set(q.technicianId, stats);
      }
    });

    const techPerformance = allTechs.map(t => {
      const stats = techStats.get(t.id) || { jobs: 0, revenue: 0, verified: 0 };
      return {
        name: t.fullName.split(" ")[0] + " " + (t.fullName.split(" ")[1]?.[0] || "") + ".",
        jobs: stats.jobs,
        revenue: stats.revenue,
        rate: stats.jobs > 0 ? Math.round((stats.verified / stats.jobs) * 100) : 0,
        verified: stats.verified,
        avgTime: 2 + Math.random() * 1.5,
      };
    }).filter(t => t.jobs > 0);

    const contacted = currentLeads.filter(l => ["contacted", "qualified", "scheduled", "converted"].includes(l.status)).length;
    const quoted = currentLeads.filter(l => ["scheduled", "converted"].includes(l.status)).length;

    const conversionFunnel = [
      { stage: "Leads", count: totalLeads, percentage: 100 },
      { stage: "Contacted", count: contacted, percentage: totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0 },
      { stage: "Quote Sent", count: quoted, percentage: totalLeads > 0 ? Math.round((quoted / totalLeads) * 100) : 0 },
      { stage: "Converted", count: convertedLeads, percentage: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = new Map<string, { revenue: number; leads: number; expenses: number }>();
    months.forEach(m => monthlyData.set(m, { revenue: 0, leads: 0, expenses: 0 }));

    currentLeads.forEach(l => {
      const month = months[new Date(l.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      data.leads++;
    });
    currentQuotes.forEach(q => {
      const month = months[new Date(q.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      const rev = parseFloat(q.total || "0");
      data.revenue += rev;
      data.expenses += rev * expenseRate;
    });

    const monthlyRevenue = months.slice(0, now.getMonth() + 1).map(month => {
      const data = monthlyData.get(month)!;
      return {
        month,
        revenue: Math.round(data.revenue),
        leads: data.leads,
        expenses: Math.round(data.expenses),
        profit: Math.round(data.revenue - data.expenses),
      };
    });

    const calcChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        netProfit,
        revenueChange: Math.round(calcChange(totalRevenue, prevRevenue) * 10) / 10,
        leadsChange: Math.round(calcChange(totalLeads, prevLeads.length) * 10) / 10,
        conversionChange: Math.round((conversionRate - prevConversionRate) * 10) / 10,
        profitChange: Math.round(calcChange(netProfit, prevProfit) * 10) / 10,
      },
      sourceComparison,
      monthlyRevenue,
      serviceBreakdown,
      techPerformance,
      conversionFunnel,
    };
  }

  async createShiftLog(log: InsertShiftLog): Promise<ShiftLog> {
    const id = randomUUID();
    const shiftLog: ShiftLog = {
      id,
      technicianId: log.technicianId,
      action: log.action,
      timestamp: new Date(),
      notes: log.notes || null,
    };
    this.shiftLogs.set(id, shiftLog);
    return shiftLog;
  }

  async getShiftLogsByTechnician(technicianId: string): Promise<ShiftLog[]> {
    return Array.from(this.shiftLogs.values())
      .filter(l => l.technicianId === technicianId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getTodayShiftLogs(technicianId: string): Promise<ShiftLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from(this.shiftLogs.values())
      .filter(l => l.technicianId === technicianId && new Date(l.timestamp) >= today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Quote Templates
  async getQuoteTemplates(): Promise<QuoteTemplate[]> {
    return Array.from(this.quoteTemplatesMap.values())
      .filter(t => t.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getQuoteTemplate(id: string): Promise<QuoteTemplate | undefined> {
    return this.quoteTemplatesMap.get(id);
  }

  async getQuoteTemplatesByServiceType(serviceType: string): Promise<QuoteTemplate[]> {
    return Array.from(this.quoteTemplatesMap.values())
      .filter(t => t.isActive && t.serviceType === serviceType);
  }

  async createQuoteTemplate(template: InsertQuoteTemplate): Promise<QuoteTemplate> {
    const id = randomUUID();
    const now = new Date();
    const qt: QuoteTemplate = {
      id,
      name: template.name,
      description: template.description || null,
      serviceType: template.serviceType || null,
      lineItems: template.lineItems,
      isActive: template.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.quoteTemplatesMap.set(id, qt);
    return qt;
  }

  async updateQuoteTemplate(id: string, updates: Partial<QuoteTemplate>): Promise<QuoteTemplate | undefined> {
    const template = this.quoteTemplatesMap.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...updates, updatedAt: new Date() };
    this.quoteTemplatesMap.set(id, updated);
    return updated;
  }

  async deleteQuoteTemplate(id: string): Promise<boolean> {
    return this.quoteTemplatesMap.delete(id);
  }

  async getCustomerTimeline(phone: string): Promise<{
    leads: Lead[];
    calls: Call[];
    jobs: Job[];
    quotes: Quote[];
  }> {
    const normalizedPhone = phone.replace(/\D/g, "");
    
    const matchPhone = (p: string | null) => {
      if (!p) return false;
      return p.replace(/\D/g, "") === normalizedPhone;
    };
    
    const customerLeads = Array.from(this.leads.values())
      .filter(l => matchPhone(l.customerPhone))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const customerCalls = Array.from(this.calls.values())
      .filter(c => matchPhone(c.callerPhone))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const customerJobs = Array.from(this.jobs.values())
      .filter(j => matchPhone(j.customerPhone))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const jobIds = customerJobs.map(j => j.id);
    const customerQuotes = Array.from(this.quotes.values())
      .filter(q => jobIds.includes(q.jobId) || matchPhone(q.customerPhone))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      leads: customerLeads,
      calls: customerCalls,
      jobs: customerJobs,
      quotes: customerQuotes,
    };
  }

  async resetJobBoard(): Promise<void> {
    Array.from(this.jobs.values()).forEach(j => {
      if (!["completed", "cancelled"].includes(j.status)) {
        this.jobs.set(j.id, {
          ...j,
          status: "pending",
          assignedTechnicianId: null,
          dispatcherId: null,
          assignedAt: null,
          confirmedAt: null,
          enRouteAt: null,
          arrivedAt: null,
          startedAt: null,
          completedAt: null,
          arrivalLat: null,
          arrivalLng: null,
          arrivalVerified: null,
          arrivalDistance: null,
        });
      }
    });
    Array.from(this.technicians.values()).forEach(t => {
      this.technicians.set(t.id, { ...t, status: "off_duty", currentJobId: null, completedJobsToday: 0 });
    });
  }

  // Contact Attempts (stub for MemStorage)
  async createContactAttempt(attempt: InsertContactAttempt): Promise<ContactAttempt> {
    const id = randomUUID();
    const created: ContactAttempt = {
      id,
      leadId: attempt.leadId ?? null,
      jobId: attempt.jobId ?? null,
      type: attempt.type,
      direction: attempt.direction ?? "outbound",
      status: attempt.status ?? "sent",
      subject: attempt.subject ?? null,
      content: attempt.content ?? null,
      templateId: attempt.templateId ?? null,
      externalId: attempt.externalId ?? null,
      recipientEmail: attempt.recipientEmail ?? null,
      recipientPhone: attempt.recipientPhone ?? null,
      sentBy: attempt.sentBy ?? null,
      sentAt: attempt.sentAt ?? null,
      deliveredAt: attempt.deliveredAt ?? null,
      openedAt: attempt.openedAt ?? null,
      failedReason: attempt.failedReason ?? null,
      createdAt: new Date(),
    };
    return created;
  }

  async getContactAttemptsByLead(leadId: string): Promise<ContactAttempt[]> {
    return [];
  }

  async getContactAttemptsByJob(jobId: string): Promise<ContactAttempt[]> {
    return [];
  }

  // Webhook Logs (stub for MemStorage)
  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const id = randomUUID();
    const created: WebhookLog = {
      id,
      source: log.source,
      endpoint: log.endpoint,
      method: log.method,
      headers: log.headers ?? null,
      payload: log.payload ?? null,
      responseStatus: log.responseStatus ?? null,
      responseBody: log.responseBody ?? null,
      processingTimeMs: log.processingTimeMs ?? null,
      error: log.error ?? null,
      createdAt: new Date(),
    };
    return created;
  }

  async getWebhookLogs(limit?: number, source?: string): Promise<WebhookLog[]> {
    return [];
  }

  // Job Attachments
  async getJobAttachments(jobId: string): Promise<JobAttachment[]> {
    return Array.from(this.jobAttachments.values())
      .filter(a => a.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createJobAttachment(attachment: InsertJobAttachment): Promise<JobAttachment> {
    const id = randomUUID();
    const created: JobAttachment = {
      id,
      jobId: attachment.jobId,
      technicianId: attachment.technicianId ?? null,
      type: attachment.type,
      filename: attachment.filename,
      mimeType: attachment.mimeType ?? null,
      fileSize: attachment.fileSize ?? null,
      url: attachment.url ?? null,
      thumbnailUrl: attachment.thumbnailUrl ?? null,
      caption: attachment.caption ?? null,
      category: attachment.category ?? null,
      latitude: attachment.latitude ?? null,
      longitude: attachment.longitude ?? null,
      createdAt: new Date(),
    };
    this.jobAttachments.set(id, created);
    return created;
  }

  async deleteJobAttachment(id: string): Promise<boolean> {
    return this.jobAttachments.delete(id);
  }

  // Job Checklists
  async getJobChecklists(jobId: string): Promise<JobChecklist[]> {
    return Array.from(this.jobChecklists.values())
      .filter(c => c.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getJobChecklist(id: string): Promise<JobChecklist | undefined> {
    return this.jobChecklists.get(id);
  }

  async createJobChecklist(checklist: InsertJobChecklist): Promise<JobChecklist> {
    const id = randomUUID();
    const created: JobChecklist = {
      id,
      jobId: checklist.jobId,
      technicianId: checklist.technicianId ?? null,
      title: checklist.title,
      items: checklist.items ?? null,
      completedAt: checklist.completedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobChecklists.set(id, created);
    return created;
  }

  async updateJobChecklist(id: string, updates: Partial<JobChecklist>): Promise<JobChecklist | undefined> {
    const existing = this.jobChecklists.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.jobChecklists.set(id, updated);
    return updated;
  }

  // Technician Locations
  async getTechnicianLocations(technicianId: string, limit?: number): Promise<TechnicianLocation[]> {
    const locations = Array.from(this.technicianLocations.values())
      .filter(l => l.technicianId === technicianId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return limit ? locations.slice(0, limit) : locations;
  }

  async getLatestTechnicianLocation(technicianId: string): Promise<TechnicianLocation | undefined> {
    const locations = await this.getTechnicianLocations(technicianId, 1);
    return locations[0];
  }

  async getAllTechniciansLatestLocations(): Promise<TechnicianLocation[]> {
    const latestByTech = new Map<string, TechnicianLocation>();
    Array.from(this.technicianLocations.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(loc => {
        if (!latestByTech.has(loc.technicianId)) {
          latestByTech.set(loc.technicianId, loc);
        }
      });
    return Array.from(latestByTech.values());
  }

  async createTechnicianLocation(location: InsertTechnicianLocation): Promise<TechnicianLocation> {
    const id = randomUUID();
    const created: TechnicianLocation = {
      id,
      technicianId: location.technicianId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
      speed: location.speed ?? null,
      heading: location.heading ?? null,
      altitude: location.altitude ?? null,
      batteryLevel: location.batteryLevel ?? null,
      isMoving: location.isMoving ?? null,
      jobId: location.jobId ?? null,
      createdAt: new Date(),
    };
    this.technicianLocations.set(id, created);
    
    // Update technician's last known location
    const tech = this.technicians.get(location.technicianId);
    if (tech) {
      this.technicians.set(location.technicianId, {
        ...tech,
        lastLocationLat: location.latitude,
        lastLocationLng: location.longitude,
        lastLocationUpdate: new Date(),
      });
    }
    return created;
  }

  // Checklist Templates
  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return Array.from(this.checklistTemplatesMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    return this.checklistTemplatesMap.get(id);
  }

  async getChecklistTemplatesByServiceType(serviceType: string): Promise<ChecklistTemplate[]> {
    return Array.from(this.checklistTemplatesMap.values())
      .filter(t => t.serviceType === serviceType || t.serviceType === null);
  }

  async createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const id = randomUUID();
    const created: ChecklistTemplate = {
      id,
      name: template.name,
      serviceType: template.serviceType ?? null,
      items: template.items ?? null,
      isDefault: template.isDefault ?? false,
      createdAt: new Date(),
    };
    this.checklistTemplatesMap.set(id, created);
    return created;
  }

  async updateChecklistTemplate(id: string, updates: Partial<ChecklistTemplate>): Promise<ChecklistTemplate | undefined> {
    const existing = this.checklistTemplatesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.checklistTemplatesMap.set(id, updated);
    return updated;
  }

  async deleteChecklistTemplate(id: string): Promise<boolean> {
    return this.checklistTemplatesMap.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // Initialize database with seed data if empty
  async initialize(): Promise<void> {
    // Check if any user exists (skip seeding if so)
    const existingUsers = await this.getUsers();
    if (existingUsers.length > 0) {
      console.log("Database has existing users, skipping seed initialization");
      return;
    }

    console.log("Seeding database with initial users and technicians...");

    // Seed users
    const userData = [
      { id: "user-admin", username: "admin", password: "demo123", role: "admin" as const, fullName: "Admin User" },
      { id: "user-dispatcher", username: "dispatcher", password: "demo123", role: "dispatcher" as const, fullName: "Dispatch Manager" },
      { id: "user-tech-1", username: "mike", password: "demo123", role: "technician" as const, fullName: "Mike Johnson" },
      { id: "user-tech-2", username: "carlos", password: "demo123", role: "technician" as const, fullName: "Carlos Rodriguez" },
      { id: "user-tech-3", username: "james", password: "demo123", role: "technician" as const, fullName: "James Williams" },
      { id: "user-sales-1", username: "sarah", password: "demo123", role: "salesperson" as const, fullName: "Sarah Mitchell" },
    ];

    for (const u of userData) {
      try {
        await db.insert(users).values({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
          fullName: u.fullName,
          isActive: true,
        }).onConflictDoNothing();
      } catch (err) {
        console.log(`User ${u.username} may already exist, skipping`);
      }
    }

    // Seed technicians
    const techData = [
      { id: "tech-1", fullName: "Mike Johnson", phone: "(708) 555-0101", email: "mike@chicagosewerexperts.com", status: "available" as const, skillLevel: "senior" as const, userId: "user-tech-1" },
      { id: "tech-2", fullName: "Carlos Rodriguez", phone: "(708) 555-0102", email: "carlos@chicagosewerexperts.com", status: "available" as const, skillLevel: "senior" as const, userId: "user-tech-2" },
      { id: "tech-3", fullName: "James Williams", phone: "(708) 555-0103", email: "james@chicagosewerexperts.com", status: "busy" as const, skillLevel: "standard" as const, userId: "user-tech-3" },
      { id: "tech-4", fullName: "David Martinez", phone: "(708) 555-0104", email: "david@chicagosewerexperts.com", status: "available" as const, skillLevel: "standard" as const, userId: null },
      { id: "tech-5", fullName: "Robert Taylor", phone: "(708) 555-0105", email: "robert@chicagosewerexperts.com", status: "off_duty" as const, skillLevel: "junior" as const, userId: null },
    ];

    for (const t of techData) {
      try {
        await db.insert(technicians).values({
          id: t.id,
          fullName: t.fullName,
          phone: t.phone,
          email: t.email,
          status: t.status,
          skillLevel: t.skillLevel,
          userId: t.userId,
          maxDailyJobs: 8,
          completedJobsToday: 0,
        }).onConflictDoNothing();
      } catch (err) {
        console.log(`Technician ${t.fullName} may already exist, skipping`);
      }
    }

    // Seed salesperson
    try {
      await db.insert(salespersons).values({
        id: "sales-1",
        fullName: "Sarah Mitchell",
        phone: "(708) 555-0201",
        email: "sarah@chicagosewerexperts.com",
        status: "available",
        commissionRate: "0.15",
        hourlyRate: "20.00",
        maxDailyLeads: 20,
        handledLeadsToday: 0,
        userId: "user-sales-1",
        twilioRoutingPriority: 1,
        isActive: true,
      }).onConflictDoNothing();
    } catch (err) {
      console.log("Salesperson may already exist, skipping");
    }

    console.log("Database seeding complete");
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Technicians
  async getTechnician(id: string): Promise<Technician | undefined> {
    const [tech] = await db.select().from(technicians).where(eq(technicians.id, id));
    return tech;
  }

  async getTechnicianByUserId(userId: string): Promise<Technician | undefined> {
    const [tech] = await db.select().from(technicians).where(eq(technicians.userId, userId));
    return tech;
  }

  async getTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getAvailableTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians).where(eq(technicians.status, "available"));
  }

  async createTechnician(insertTech: InsertTechnician): Promise<Technician> {
    const [tech] = await db.insert(technicians).values(insertTech).returning();
    return tech;
  }

  async updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician | undefined> {
    const [tech] = await db.update(technicians).set(updates).where(eq(technicians.id, id)).returning();
    return tech;
  }

  async deleteTechnicianByUserId(userId: string): Promise<boolean> {
    await db.delete(technicians).where(eq(technicians.userId, userId));
    return true;
  }

  // Salespersons
  async getSalesperson(id: string): Promise<Salesperson | undefined> {
    const [sp] = await db.select().from(salespersons).where(eq(salespersons.id, id));
    return sp;
  }

  async getSalespersonByUserId(userId: string): Promise<Salesperson | undefined> {
    const [sp] = await db.select().from(salespersons).where(eq(salespersons.userId, userId));
    return sp;
  }

  async getSalespersons(): Promise<Salesperson[]> {
    return await db.select().from(salespersons);
  }

  async getAvailableSalespersons(): Promise<Salesperson[]> {
    return await db.select().from(salespersons).where(
      and(eq(salespersons.status, "available"), eq(salespersons.isActive, true))
    );
  }

  async createSalesperson(insertSp: InsertSalesperson): Promise<Salesperson> {
    const [sp] = await db.insert(salespersons).values(insertSp).returning();
    return sp;
  }

  async updateSalesperson(id: string, updates: Partial<Salesperson>): Promise<Salesperson | undefined> {
    const [sp] = await db.update(salespersons).set(updates).where(eq(salespersons.id, id)).returning();
    return sp;
  }

  async deleteSalespersonByUserId(userId: string): Promise<boolean> {
    await db.delete(salespersons).where(eq(salespersons.userId, userId));
    return true;
  }

  // Sales Commissions
  async getSalesCommission(id: string): Promise<SalesCommission | undefined> {
    const [commission] = await db.select().from(salesCommissions).where(eq(salesCommissions.id, id));
    return commission;
  }

  async getSalesCommissionsByJob(jobId: string): Promise<SalesCommission[]> {
    return await db.select().from(salesCommissions).where(eq(salesCommissions.jobId, jobId));
  }

  async getSalesCommissionsBySalesperson(salespersonId: string): Promise<SalesCommission[]> {
    return await db.select().from(salesCommissions)
      .where(eq(salesCommissions.salespersonId, salespersonId))
      .orderBy(desc(salesCommissions.createdAt));
  }

  async getSalesCommissionsByStatus(status: string): Promise<SalesCommission[]> {
    return await db.select().from(salesCommissions).where(eq(salesCommissions.status, status));
  }

  async createSalesCommission(insertCommission: InsertSalesCommission): Promise<SalesCommission> {
    const [commission] = await db.insert(salesCommissions).values(insertCommission).returning();
    return commission;
  }

  async updateSalesCommission(id: string, updates: Partial<SalesCommission>): Promise<SalesCommission | undefined> {
    const [commission] = await db.update(salesCommissions).set(updates).where(eq(salesCommissions.id, id)).returning();
    return commission;
  }

  async calculateJobCommission(jobId: string, salespersonId: string): Promise<SalesCommission | undefined> {
    const existingCommissions = await this.getSalesCommissionsByJob(jobId);
    const existing = existingCommissions.find(c => c.salespersonId === salespersonId);
    if (existing) return existing;

    const job = await this.getJob(jobId);
    if (!job || !job.totalRevenue || job.status !== "completed") return undefined;

    const salesperson = await this.getSalesperson(salespersonId);
    if (!salesperson) return undefined;

    const revenue = parseFloat(String(job.totalRevenue || 0));
    const laborCost = parseFloat(String(job.laborCost || 0));
    const materialsCost = parseFloat(String(job.materialsCost || 0));
    const travelExpense = parseFloat(String(job.travelExpense || 0));
    const equipmentCost = parseFloat(String(job.equipmentCost || 0));
    const otherExpenses = parseFloat(String(job.otherExpenses || 0));
    const totalCosts = laborCost + materialsCost + travelExpense + equipmentCost + otherExpenses;
    const netProfit = revenue - totalCosts;

    if (netProfit <= 0) return undefined;

    const commissionRate = parseFloat(String(salesperson.commissionRate || "0.15"));
    const commissionAmount = netProfit * commissionRate;

    const commission = await this.createSalesCommission({
      salespersonId,
      jobId,
      leadId: job.leadId,
      jobRevenue: revenue.toFixed(2),
      laborCost: laborCost.toFixed(2),
      materialsCost: materialsCost.toFixed(2),
      travelExpense: travelExpense.toFixed(2),
      equipmentCost: equipmentCost.toFixed(2),
      otherExpenses: otherExpenses.toFixed(2),
      totalCosts: totalCosts.toFixed(2),
      netProfit: netProfit.toFixed(2),
      commissionRate: commissionRate.toFixed(4),
      commissionAmount: commissionAmount.toFixed(2),
      status: "pending",
    });

    return commission;
  }

  // Salesperson Locations (GPS tracking)
  async getSalespersonLocations(salespersonId: string, limit: number = 100): Promise<SalespersonLocation[]> {
    return await db.select().from(salespersonLocations)
      .where(eq(salespersonLocations.salespersonId, salespersonId))
      .orderBy(desc(salespersonLocations.createdAt))
      .limit(limit);
  }

  async getLatestSalespersonLocation(salespersonId: string): Promise<SalespersonLocation | undefined> {
    const [location] = await db.select().from(salespersonLocations)
      .where(eq(salespersonLocations.salespersonId, salespersonId))
      .orderBy(desc(salespersonLocations.createdAt))
      .limit(1);
    return location;
  }

  async getAllSalespersonsLatestLocations(): Promise<SalespersonLocation[]> {
    const allSalespersons = await this.getSalespersons();
    const locations: SalespersonLocation[] = [];
    for (const sp of allSalespersons) {
      const loc = await this.getLatestSalespersonLocation(sp.id);
      if (loc) locations.push(loc);
    }
    return locations;
  }

  async createSalespersonLocation(location: InsertSalespersonLocation): Promise<SalespersonLocation> {
    const [created] = await db.insert(salespersonLocations).values(location).returning();
    await db.update(salespersons).set({
      lastLocationLat: location.latitude,
      lastLocationLng: location.longitude,
      lastLocationUpdate: new Date(),
    }).where(eq(salespersons.id, location.salespersonId));
    return created;
  }

  // Leads
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async findLeadsByPhone(phone: string): Promise<Lead[]> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const allLeads = await db.select().from(leads);
    return allLeads.filter(l => {
      const leadPhone = l.customerPhone.replace(/\D/g, '');
      return leadPhone === normalizedPhone;
    });
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [lead] = await db.update(leads).set({ ...updates, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
    return lead;
  }

  // Calls
  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async getCalls(): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }

  async getRecentCalls(limit: number): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt)).limit(limit);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(insertCall).returning();
    return call;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const [call] = await db.update(calls).set({ ...updates, updatedAt: new Date() }).where(eq(calls.id, id)).returning();
    return call;
  }

  async getCallsByOutcome(outcome: string): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.outcome, outcome)).orderBy(desc(calls.createdAt));
  }

  async getScheduledCallbacks(): Promise<Call[]> {
    const now = new Date();
    const allCalls = await db.select().from(calls).orderBy(desc(calls.scheduledCallback));
    return allCalls.filter(c => c.scheduledCallback && new Date(c.scheduledCallback) > now);
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.status, status));
  }

  async getJobsByTechnician(technicianId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.assignedTechnicianId, technicianId));
  }

  async getPoolJobs(technicianId: string): Promise<Job[]> {
    const tech = await this.getTechnician(technicianId);
    if (!tech) return [];
    
    const approvedTypes = tech.approvedJobTypes || [];
    const allPendingJobs = await db.select().from(jobs).where(eq(jobs.status, "pending"));
    
    return allPendingJobs
      .filter(j => {
        if (j.assignedTechnicianId) return false;
        if (approvedTypes.length === 0) return true;
        return approvedTypes.includes(j.serviceType);
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    await this.createJobTimelineEvent({
      jobId: job.id,
      eventType: "created",
      description: "Job created",
    });
    return job;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const [job] = await db.update(jobs).set({ ...updates, updatedAt: new Date() }).where(eq(jobs.id, id)).returning();
    return job;
  }

  // Job Timeline Events
  async getJobTimelineEvents(jobId: string): Promise<JobTimelineEvent[]> {
    return await db.select().from(jobTimelineEvents).where(eq(jobTimelineEvents.jobId, jobId)).orderBy(asc(jobTimelineEvents.createdAt));
  }

  async createJobTimelineEvent(insertEvent: InsertJobTimelineEvent): Promise<JobTimelineEvent> {
    const [event] = await db.insert(jobTimelineEvents).values(insertEvent).returning();
    return event;
  }

  // Job Messages (chat)
  async getJobMessages(jobId: string, audience?: 'internal' | 'customer' | 'all'): Promise<JobMessage[]> {
    if (audience === 'all' || !audience) {
      return await db.select().from(jobMessages).where(eq(jobMessages.jobId, jobId)).orderBy(asc(jobMessages.createdAt));
    }
    return await db.select().from(jobMessages).where(and(eq(jobMessages.jobId, jobId), eq(jobMessages.audience, audience))).orderBy(asc(jobMessages.createdAt));
  }

  async createJobMessage(insertMessage: InsertJobMessage): Promise<JobMessage> {
    const [message] = await db.insert(jobMessages).values(insertMessage).returning();
    return message;
  }

  async getJobByQuoteId(quoteId: string): Promise<Job | undefined> {
    // First try: job has quoteId pointing to quote
    const [job] = await db.select().from(jobs).where(eq(jobs.quoteId, quoteId));
    if (job) return job;
    
    // Second try: quote has jobId pointing to job
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
    if (quote?.jobId) {
      const [linkedJob] = await db.select().from(jobs).where(eq(jobs.id, quote.jobId));
      return linkedJob;
    }
    
    return undefined;
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuoteByToken(token: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.publicToken, token));
    return quote;
  }

  async getQuotesByJob(jobId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.jobId, jobId));
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes);
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.status, status));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(insertQuote).returning();
    return quote;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const [quote] = await db.update(quotes).set(updates).where(eq(quotes.id, id)).returning();
    return quote;
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id)).returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.userId, userId));
  }

  // Analytics
  async getAnalytics(timeRange: string): Promise<AnalyticsData> {
    console.log('[Analytics] Starting getAnalytics with timeRange:', timeRange);
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (timeRange) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1);
        break;
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth() - 2, 1);
        break;
      case "year":
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }

    console.log('[Analytics] Fetching leads...');
    const allLeads = await db.select().from(leads);
    console.log('[Analytics] Fetched', allLeads.length, 'leads');
    
    console.log('[Analytics] Fetching jobs...');
    const allJobs = await db.select().from(jobs);
    console.log('[Analytics] Fetched', allJobs.length, 'jobs');
    
    console.log('[Analytics] Fetching quotes...');
    const allQuotes = await db.select().from(quotes);
    console.log('[Analytics] Fetched', allQuotes.length, 'quotes');
    
    console.log('[Analytics] Fetching technicians...');
    const allTechs = await db.select().from(technicians);
    console.log('[Analytics] Fetched', allTechs.length, 'technicians');

    const currentLeads = allLeads.filter(l => new Date(l.createdAt) >= startDate);
    const prevLeads = allLeads.filter(l => new Date(l.createdAt) >= prevStartDate && new Date(l.createdAt) <= prevEndDate);
    const currentJobs = allJobs.filter(j => new Date(j.createdAt) >= startDate);
    const currentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= startDate);

    const totalRevenue = currentQuotes.reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);
    const prevRevenue = allQuotes.filter(q => new Date(q.createdAt) >= prevStartDate && new Date(q.createdAt) <= prevEndDate)
      .reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);

    const totalLeads = currentLeads.length;
    const convertedLeads = currentLeads.filter(l => l.status === "converted").length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const prevConvertedLeads = prevLeads.filter(l => l.status === "converted").length;
    const prevConversionRate = prevLeads.length > 0 ? (prevConvertedLeads / prevLeads.length) * 100 : 0;

    const expenseRate = 0.4;
    const netProfit = totalRevenue * (1 - expenseRate);
    const prevProfit = prevRevenue * (1 - expenseRate);

    const sourceStats = new Map<string, { leads: number; cost: number; converted: number; revenue: number }>();
    currentLeads.forEach(l => {
      const stats = sourceStats.get(l.source) || { leads: 0, cost: 0, converted: 0, revenue: 0 };
      stats.leads++;
      stats.cost += parseFloat(l.cost || "0");
      stats.revenue += parseFloat(l.revenue || "0");
      if (l.status === "converted") stats.converted++;
      sourceStats.set(l.source, stats);
    });

    const sourceComparison = Array.from(sourceStats.entries()).map(([source, stats]) => {
      const roi = stats.cost > 0 ? ((stats.revenue - stats.cost) / stats.cost) * 100 : 0;
      const costPerAcquisition = stats.converted > 0 ? Math.round(stats.cost / stats.converted) : 0;
      return {
        source,
        leads: stats.leads,
        cost: stats.cost,
        converted: stats.converted,
        costPerLead: stats.leads > 0 ? Math.round(stats.cost / stats.leads) : 0,
        avgResponse: Math.floor(Math.random() * 15) + 5,
        revenue: stats.revenue,
        roi: Math.round(roi * 10) / 10,
        costPerAcquisition,
      };
    });

    const serviceStats = new Map<string, { count: number; revenue: number }>();
    currentJobs.forEach(j => {
      const stats = serviceStats.get(j.serviceType) || { count: 0, revenue: 0 };
      stats.count++;
      serviceStats.set(j.serviceType, stats);
    });
    currentQuotes.forEach(q => {
      const job = allJobs.find(j => j.id === q.jobId);
      if (job) {
        const stats = serviceStats.get(job.serviceType) || { count: 0, revenue: 0 };
        stats.revenue += parseFloat(q.total || "0");
        serviceStats.set(job.serviceType, stats);
      }
    });

    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(0 72% 51%)"];
    const serviceBreakdown = Array.from(serviceStats.entries()).map(([name, stats], i) => ({
      name,
      value: stats.count,
      revenue: stats.revenue,
      avgTicket: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
      color: colors[i % colors.length],
    }));

    const techStats = new Map<string, { jobs: number; revenue: number; verified: number }>();
    allTechs.forEach(t => techStats.set(t.id, { jobs: 0, revenue: 0, verified: 0 }));
    currentJobs.forEach(j => {
      if (j.assignedTechnicianId) {
        const stats = techStats.get(j.assignedTechnicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.jobs++;
        if (j.arrivalVerified) stats.verified++;
        techStats.set(j.assignedTechnicianId, stats);
      }
    });
    currentQuotes.forEach(q => {
      if (q.technicianId) {
        const stats = techStats.get(q.technicianId) || { jobs: 0, revenue: 0, verified: 0 };
        stats.revenue += parseFloat(q.total || "0");
        techStats.set(q.technicianId, stats);
      }
    });

    const techPerformance = allTechs.map(t => {
      const stats = techStats.get(t.id) || { jobs: 0, revenue: 0, verified: 0 };
      return {
        name: t.fullName.split(" ")[0] + " " + (t.fullName.split(" ")[1]?.[0] || "") + ".",
        jobs: stats.jobs,
        revenue: stats.revenue,
        rate: stats.jobs > 0 ? Math.round((stats.verified / stats.jobs) * 100) : 0,
        verified: stats.verified,
        avgTime: 2 + Math.random() * 1.5,
      };
    }).filter(t => t.jobs > 0);

    const contacted = currentLeads.filter(l => ["contacted", "qualified", "scheduled", "converted"].includes(l.status)).length;
    const quoted = currentLeads.filter(l => ["scheduled", "converted"].includes(l.status)).length;

    const conversionFunnel = [
      { stage: "Leads", count: totalLeads, percentage: 100 },
      { stage: "Contacted", count: contacted, percentage: totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0 },
      { stage: "Quote Sent", count: quoted, percentage: totalLeads > 0 ? Math.round((quoted / totalLeads) * 100) : 0 },
      { stage: "Converted", count: convertedLeads, percentage: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0 },
    ];

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = new Map<string, { revenue: number; leads: number; expenses: number }>();
    months.forEach(m => monthlyData.set(m, { revenue: 0, leads: 0, expenses: 0 }));

    currentLeads.forEach(l => {
      const month = months[new Date(l.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      data.leads++;
    });
    currentQuotes.forEach(q => {
      const month = months[new Date(q.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      const rev = parseFloat(q.total || "0");
      data.revenue += rev;
      data.expenses += rev * expenseRate;
    });

    const monthlyRevenue = months.slice(0, now.getMonth() + 1).map(month => {
      const data = monthlyData.get(month)!;
      return {
        month,
        revenue: Math.round(data.revenue),
        leads: data.leads,
        expenses: Math.round(data.expenses),
        profit: Math.round(data.revenue - data.expenses),
      };
    });

    const calcChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        netProfit,
        revenueChange: Math.round(calcChange(totalRevenue, prevRevenue) * 10) / 10,
        leadsChange: Math.round(calcChange(totalLeads, prevLeads.length) * 10) / 10,
        conversionChange: Math.round((conversionRate - prevConversionRate) * 10) / 10,
        profitChange: Math.round(calcChange(netProfit, prevProfit) * 10) / 10,
      },
      sourceComparison,
      monthlyRevenue,
      serviceBreakdown,
      techPerformance,
      conversionFunnel,
    };
  }

  async createShiftLog(log: InsertShiftLog): Promise<ShiftLog> {
    const [newLog] = await db.insert(shiftLogs).values(log).returning();
    return newLog;
  }

  async getShiftLogsByTechnician(technicianId: string): Promise<ShiftLog[]> {
    return await db.select().from(shiftLogs).where(eq(shiftLogs.technicianId, technicianId)).orderBy(desc(shiftLogs.timestamp));
  }

  async getTodayShiftLogs(technicianId: string): Promise<ShiftLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await db.select().from(shiftLogs)
      .where(and(
        eq(shiftLogs.technicianId, technicianId),
        gte(shiftLogs.timestamp, today)
      ))
      .orderBy(asc(shiftLogs.timestamp));
  }

  // Quote Templates
  async getQuoteTemplates(): Promise<QuoteTemplate[]> {
    return await db.select().from(quoteTemplates)
      .where(eq(quoteTemplates.isActive, true))
      .orderBy(asc(quoteTemplates.name));
  }

  async getQuoteTemplate(id: string): Promise<QuoteTemplate | undefined> {
    const [template] = await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, id));
    return template;
  }

  async getQuoteTemplatesByServiceType(serviceType: string): Promise<QuoteTemplate[]> {
    return await db.select().from(quoteTemplates)
      .where(and(eq(quoteTemplates.isActive, true), eq(quoteTemplates.serviceType, serviceType)));
  }

  async createQuoteTemplate(template: InsertQuoteTemplate): Promise<QuoteTemplate> {
    const [created] = await db.insert(quoteTemplates).values(template).returning();
    return created;
  }

  async updateQuoteTemplate(id: string, updates: Partial<QuoteTemplate>): Promise<QuoteTemplate | undefined> {
    const [updated] = await db.update(quoteTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(quoteTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteQuoteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id));
    return true;
  }

  async getCustomerTimeline(phone: string): Promise<{
    leads: Lead[];
    calls: Call[];
    jobs: Job[];
    quotes: Quote[];
  }> {
    const normalizedPhone = phone.replace(/\D/g, "");
    
    const customerLeads = await db.select().from(leads)
      .where(sql`regexp_replace(${leads.customerPhone}, '[^0-9]', '', 'g') = ${normalizedPhone}`)
      .orderBy(desc(leads.createdAt));
    
    const customerCalls = await db.select().from(calls)
      .where(sql`regexp_replace(${calls.callerPhone}, '[^0-9]', '', 'g') = ${normalizedPhone}`)
      .orderBy(desc(calls.createdAt));
    
    const customerJobs = await db.select().from(jobs)
      .where(sql`regexp_replace(${jobs.customerPhone}, '[^0-9]', '', 'g') = ${normalizedPhone}`)
      .orderBy(desc(jobs.createdAt));
    
    const jobIds = customerJobs.map(j => j.id);
    
    let customerQuotes: Quote[] = [];
    if (jobIds.length > 0) {
      customerQuotes = await db.select().from(quotes)
        .where(sql`${quotes.jobId} = ANY(${jobIds}) OR regexp_replace(${quotes.customerPhone}, '[^0-9]', '', 'g') = ${normalizedPhone}`)
        .orderBy(desc(quotes.createdAt));
    } else {
      customerQuotes = await db.select().from(quotes)
        .where(sql`regexp_replace(${quotes.customerPhone}, '[^0-9]', '', 'g') = ${normalizedPhone}`)
        .orderBy(desc(quotes.createdAt));
    }
    
    return {
      leads: customerLeads,
      calls: customerCalls,
      jobs: customerJobs,
      quotes: customerQuotes,
    };
  }

  async resetJobBoard(): Promise<void> {
    // Reset all active jobs to pending status and clear assignments (preserve job data)
    await db.update(jobs)
      .set({ 
        status: "pending",
        assignedTechnicianId: null,
        dispatcherId: null,
        assignedAt: null,
        confirmedAt: null,
        enRouteAt: null,
        arrivedAt: null,
        startedAt: null,
        completedAt: null,
        arrivalLat: null,
        arrivalLng: null,
        arrivalVerified: null,
        arrivalDistance: null,
      })
      .where(
        sql`${jobs.status} NOT IN ('completed', 'cancelled')`
      );

    // Set all technicians to off_duty and reset daily stats
    await db.update(technicians)
      .set({ 
        status: "off_duty", 
        currentJobId: null, 
        completedJobsToday: 0 
      });
  }

  // Contact Attempts
  async createContactAttempt(attempt: InsertContactAttempt): Promise<ContactAttempt> {
    const [created] = await db.insert(contactAttempts).values(attempt).returning();
    return created;
  }

  async getContactAttemptsByLead(leadId: string): Promise<ContactAttempt[]> {
    return db.select().from(contactAttempts)
      .where(eq(contactAttempts.leadId, leadId))
      .orderBy(desc(contactAttempts.createdAt));
  }

  async getContactAttemptsByJob(jobId: string): Promise<ContactAttempt[]> {
    return db.select().from(contactAttempts)
      .where(eq(contactAttempts.jobId, jobId))
      .orderBy(desc(contactAttempts.createdAt));
  }

  // Webhook Logs
  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const [created] = await db.insert(webhookLogs).values(log).returning();
    return created;
  }

  async getWebhookLogs(limit: number = 50, source?: string): Promise<WebhookLog[]> {
    if (source) {
      return db.select().from(webhookLogs)
        .where(eq(webhookLogs.source, source))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(limit);
    }
    return db.select().from(webhookLogs)
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  // Job Attachments
  async getJobAttachments(jobId: string): Promise<JobAttachment[]> {
    return db.select().from(jobAttachments)
      .where(eq(jobAttachments.jobId, jobId))
      .orderBy(desc(jobAttachments.createdAt));
  }

  async createJobAttachment(attachment: InsertJobAttachment): Promise<JobAttachment> {
    const [created] = await db.insert(jobAttachments).values(attachment).returning();
    return created;
  }

  async deleteJobAttachment(id: string): Promise<boolean> {
    const result = await db.delete(jobAttachments).where(eq(jobAttachments.id, id)).returning();
    return result.length > 0;
  }

  // Job Checklists
  async getJobChecklists(jobId: string): Promise<JobChecklist[]> {
    return db.select().from(jobChecklists)
      .where(eq(jobChecklists.jobId, jobId))
      .orderBy(desc(jobChecklists.createdAt));
  }

  async getJobChecklist(id: string): Promise<JobChecklist | undefined> {
    const [checklist] = await db.select().from(jobChecklists).where(eq(jobChecklists.id, id));
    return checklist;
  }

  async createJobChecklist(checklist: InsertJobChecklist): Promise<JobChecklist> {
    const [created] = await db.insert(jobChecklists).values(checklist).returning();
    return created;
  }

  async updateJobChecklist(id: string, updates: Partial<JobChecklist>): Promise<JobChecklist | undefined> {
    // Convert completedAt string to Date if provided
    const cleanedUpdates = { ...updates };
    if (cleanedUpdates.completedAt !== undefined) {
      cleanedUpdates.completedAt = cleanedUpdates.completedAt ? new Date(cleanedUpdates.completedAt) : null;
    }
    const [updated] = await db.update(jobChecklists)
      .set({ ...cleanedUpdates, updatedAt: new Date() })
      .where(eq(jobChecklists.id, id))
      .returning();
    return updated;
  }

  // Technician Locations (GPS tracking)
  async getTechnicianLocations(technicianId: string, limit: number = 100): Promise<TechnicianLocation[]> {
    return db.select().from(technicianLocations)
      .where(eq(technicianLocations.technicianId, technicianId))
      .orderBy(desc(technicianLocations.createdAt))
      .limit(limit);
  }

  async getLatestTechnicianLocation(technicianId: string): Promise<TechnicianLocation | undefined> {
    const [location] = await db.select().from(technicianLocations)
      .where(eq(technicianLocations.technicianId, technicianId))
      .orderBy(desc(technicianLocations.createdAt))
      .limit(1);
    return location;
  }

  async getAllTechniciansLatestLocations(): Promise<TechnicianLocation[]> {
    // Get the latest location for each technician using a subquery
    const latestLocations = await db.execute(sql`
      SELECT DISTINCT ON (technician_id) 
        id,
        technician_id AS "technicianId",
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        altitude,
        battery_level AS "batteryLevel",
        is_moving AS "isMoving",
        job_id AS "jobId",
        created_at AS "createdAt"
      FROM technician_locations
      ORDER BY technician_id, created_at DESC
    `);
    return latestLocations.rows as TechnicianLocation[];
  }

  async createTechnicianLocation(location: InsertTechnicianLocation): Promise<TechnicianLocation> {
    const [created] = await db.insert(technicianLocations).values(location).returning();
    
    // Also update the technician's last known location
    await db.update(technicians)
      .set({
        lastLocationLat: location.latitude,
        lastLocationLng: location.longitude,
        lastLocationUpdate: new Date(),
      })
      .where(eq(technicians.id, location.technicianId));
    
    return created;
  }

  // Checklist Templates
  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return db.select().from(checklistTemplates).orderBy(asc(checklistTemplates.name));
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id));
    return template;
  }

  async getChecklistTemplatesByServiceType(serviceType: string): Promise<ChecklistTemplate[]> {
    return db.select().from(checklistTemplates)
      .where(sql`${checklistTemplates.serviceType} = ${serviceType} OR ${checklistTemplates.serviceType} IS NULL`);
  }

  async createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const [created] = await db.insert(checklistTemplates).values(template).returning();
    return created;
  }

  async updateChecklistTemplate(id: string, updates: Partial<ChecklistTemplate>): Promise<ChecklistTemplate | undefined> {
    const [updated] = await db.update(checklistTemplates)
      .set(updates)
      .where(eq(checklistTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteChecklistTemplate(id: string): Promise<boolean> {
    const result = await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id)).returning();
    return result.length > 0;
  }

  // Pricebook Items
  async getPricebookItems(): Promise<PricebookItem[]> {
    return db.select().from(pricebookItems).orderBy(asc(pricebookItems.sortOrder), asc(pricebookItems.name));
  }

  async getPricebookItem(id: string): Promise<PricebookItem | undefined> {
    const [item] = await db.select().from(pricebookItems).where(eq(pricebookItems.id, id));
    return item;
  }

  async getPricebookItemsByCategory(category: string): Promise<PricebookItem[]> {
    return db.select().from(pricebookItems)
      .where(eq(pricebookItems.category, category))
      .orderBy(asc(pricebookItems.sortOrder));
  }

  async createPricebookItem(item: InsertPricebookItem): Promise<PricebookItem> {
    const [created] = await db.insert(pricebookItems).values(item).returning();
    return created;
  }

  async updatePricebookItem(id: string, updates: Partial<PricebookItem>): Promise<PricebookItem | undefined> {
    const [updated] = await db.update(pricebookItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pricebookItems.id, id))
      .returning();
    return updated;
  }

  async deletePricebookItem(id: string): Promise<boolean> {
    const result = await db.delete(pricebookItems).where(eq(pricebookItems.id, id)).returning();
    return result.length > 0;
  }

  // Pricebook Categories
  async getPricebookCategories(): Promise<PricebookCategory[]> {
    return db.select().from(pricebookCategories).orderBy(asc(pricebookCategories.sortOrder));
  }

  async createPricebookCategory(category: InsertPricebookCategory): Promise<PricebookCategory> {
    const [created] = await db.insert(pricebookCategories).values(category).returning();
    return created;
  }

  async updatePricebookCategory(id: string, updates: Partial<PricebookCategory>): Promise<PricebookCategory | undefined> {
    const [updated] = await db.update(pricebookCategories)
      .set(updates)
      .where(eq(pricebookCategories.id, id))
      .returning();
    return updated;
  }

  async deletePricebookCategory(id: string): Promise<boolean> {
    const result = await db.delete(pricebookCategories).where(eq(pricebookCategories.id, id)).returning();
    return result.length > 0;
  }

  // Marketing Campaigns
  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
  }

  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return campaign;
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [created] = await db.insert(marketingCampaigns).values(campaign).returning();
    return created;
  }

  async updateMarketingCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<MarketingCampaign | undefined> {
    const [updated] = await db.update(marketingCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, id))
      .returning();
    return updated;
  }

  async deleteMarketingCampaign(id: string): Promise<boolean> {
    const result = await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id)).returning();
    return result.length > 0;
  }

  // Marketing Spend
  async getMarketingSpend(campaignId?: string): Promise<MarketingSpend[]> {
    if (campaignId) {
      return db.select().from(marketingSpend)
        .where(eq(marketingSpend.campaignId, campaignId))
        .orderBy(desc(marketingSpend.period));
    }
    return db.select().from(marketingSpend).orderBy(desc(marketingSpend.period));
  }

  async getMarketingSpendByPeriod(period: string): Promise<MarketingSpend[]> {
    return db.select().from(marketingSpend).where(eq(marketingSpend.period, period));
  }

  async createMarketingSpend(spend: InsertMarketingSpend): Promise<MarketingSpend> {
    const [created] = await db.insert(marketingSpend).values(spend).returning();
    return created;
  }

  async updateMarketingSpend(id: string, updates: Partial<MarketingSpend>): Promise<MarketingSpend | undefined> {
    const [updated] = await db.update(marketingSpend)
      .set(updates)
      .where(eq(marketingSpend.id, id))
      .returning();
    return updated;
  }

  async getMarketingROI(): Promise<{ source: string; spend: number; leads: number; converted: number; revenue: number; roi: number }[]> {
    // Get all marketing spend grouped by source
    const spendData = await db.select({
      source: marketingSpend.source,
      totalSpend: sql<number>`COALESCE(SUM(${marketingSpend.amount}), 0)`,
      totalLeads: sql<number>`COALESCE(SUM(${marketingSpend.leadsGenerated}), 0)`,
      totalConverted: sql<number>`COALESCE(SUM(${marketingSpend.leadsConverted}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${marketingSpend.revenueGenerated}), 0)`,
    })
    .from(marketingSpend)
    .groupBy(marketingSpend.source);

    return spendData.map(row => ({
      source: row.source,
      spend: Number(row.totalSpend) || 0,
      leads: Number(row.totalLeads) || 0,
      converted: Number(row.totalConverted) || 0,
      revenue: Number(row.totalRevenue) || 0,
      roi: Number(row.totalSpend) > 0 
        ? ((Number(row.totalRevenue) - Number(row.totalSpend)) / Number(row.totalSpend)) * 100 
        : 0,
    }));
  }

  // Business Intakes
  async getBusinessIntake(id: string): Promise<BusinessIntake | undefined> {
    const [intake] = await db.select().from(businessIntakes).where(eq(businessIntakes.id, id));
    return intake;
  }

  async getAllBusinessIntakes(): Promise<BusinessIntake[]> {
    return db.select().from(businessIntakes).orderBy(desc(businessIntakes.createdAt));
  }

  async createBusinessIntake(intake: InsertBusinessIntake): Promise<BusinessIntake> {
    const [created] = await db.insert(businessIntakes).values(intake).returning();
    return created;
  }

  async updateBusinessIntake(id: string, updates: Partial<BusinessIntake>): Promise<BusinessIntake | undefined> {
    const [updated] = await db.update(businessIntakes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businessIntakes.id, id))
      .returning();
    return updated;
  }

  // Time Entries (clock in/out)
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }

  async getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    if (startDate && endDate) {
      return db.select().from(timeEntries)
        .where(and(
          eq(timeEntries.userId, userId),
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate)
        ))
        .orderBy(desc(timeEntries.date));
    }
    return db.select().from(timeEntries)
      .where(eq(timeEntries.userId, userId))
      .orderBy(desc(timeEntries.date));
  }

  async getTimeEntriesByTechnician(technicianId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    if (startDate && endDate) {
      return db.select().from(timeEntries)
        .where(and(
          eq(timeEntries.technicianId, technicianId),
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate)
        ))
        .orderBy(desc(timeEntries.date));
    }
    return db.select().from(timeEntries)
      .where(eq(timeEntries.technicianId, technicianId))
      .orderBy(desc(timeEntries.date));
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [created] = await db.insert(timeEntries).values(entry).returning();
    return created;
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const [updated] = await db.update(timeEntries)
      .set(updates)
      .where(eq(timeEntries.id, id))
      .returning();
    return updated;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return result.length > 0;
  }

  // Payroll Periods
  async getPayrollPeriod(id: string): Promise<PayrollPeriod | undefined> {
    const [period] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, id));
    return period;
  }

  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return db.select().from(payrollPeriods).orderBy(desc(payrollPeriods.startDate));
  }

  async getCurrentPayrollPeriod(): Promise<PayrollPeriod | undefined> {
    const now = new Date();
    const [period] = await db.select().from(payrollPeriods)
      .where(and(
        lte(payrollPeriods.startDate, now),
        gte(payrollPeriods.endDate, now)
      ));
    return period;
  }

  async createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const [created] = await db.insert(payrollPeriods).values(period).returning();
    return created;
  }

  async updatePayrollPeriod(id: string, updates: Partial<PayrollPeriod>): Promise<PayrollPeriod | undefined> {
    const [updated] = await db.update(payrollPeriods)
      .set(updates)
      .where(eq(payrollPeriods.id, id))
      .returning();
    return updated;
  }

  // Payroll Records
  async getPayrollRecord(id: string): Promise<PayrollRecord | undefined> {
    const [record] = await db.select().from(payrollRecords).where(eq(payrollRecords.id, id));
    return record;
  }

  async getPayrollRecordsByPeriod(periodId: string): Promise<PayrollRecord[]> {
    return db.select().from(payrollRecords)
      .where(eq(payrollRecords.periodId, periodId))
      .orderBy(desc(payrollRecords.createdAt));
  }

  async getPayrollRecordsByUser(userId: string): Promise<PayrollRecord[]> {
    return db.select().from(payrollRecords)
      .where(eq(payrollRecords.userId, userId))
      .orderBy(desc(payrollRecords.createdAt));
  }

  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    const [created] = await db.insert(payrollRecords).values(record).returning();
    return created;
  }

  async updatePayrollRecord(id: string, updates: Partial<PayrollRecord>): Promise<PayrollRecord | undefined> {
    const [updated] = await db.update(payrollRecords)
      .set(updates)
      .where(eq(payrollRecords.id, id))
      .returning();
    return updated;
  }

  // Employee Pay Rates
  async getEmployeePayRate(id: string): Promise<EmployeePayRate | undefined> {
    const [rate] = await db.select().from(employeePayRates).where(eq(employeePayRates.id, id));
    return rate;
  }

  async getEmployeePayRatesByUser(userId: string): Promise<EmployeePayRate[]> {
    return db.select().from(employeePayRates)
      .where(eq(employeePayRates.userId, userId))
      .orderBy(desc(employeePayRates.effectiveDate));
  }

  async getActiveEmployeePayRate(userId: string): Promise<EmployeePayRate | undefined> {
    const [rate] = await db.select().from(employeePayRates)
      .where(and(
        eq(employeePayRates.userId, userId),
        eq(employeePayRates.isActive, true)
      ))
      .orderBy(desc(employeePayRates.effectiveDate))
      .limit(1);
    return rate;
  }

  async createEmployeePayRate(rate: InsertEmployeePayRate): Promise<EmployeePayRate> {
    const [created] = await db.insert(employeePayRates).values(rate).returning();
    return created;
  }

  async updateEmployeePayRate(id: string, updates: Partial<EmployeePayRate>): Promise<EmployeePayRate | undefined> {
    const [updated] = await db.update(employeePayRates)
      .set(updates)
      .where(eq(employeePayRates.id, id))
      .returning();
    return updated;
  }

  // Job Lead Fees
  async getJobLeadFee(id: string): Promise<JobLeadFee | undefined> {
    const [fee] = await db.select().from(jobLeadFees).where(eq(jobLeadFees.id, id));
    return fee;
  }

  async getJobLeadFeesByJob(jobId: string): Promise<JobLeadFee[]> {
    return db.select().from(jobLeadFees).where(eq(jobLeadFees.jobId, jobId));
  }

  async getJobLeadFeesByTechnician(technicianId: string): Promise<JobLeadFee[]> {
    return db.select().from(jobLeadFees)
      .where(eq(jobLeadFees.technicianId, technicianId))
      .orderBy(desc(jobLeadFees.acceptedAt));
  }

  async createJobLeadFee(fee: InsertJobLeadFee): Promise<JobLeadFee> {
    const [created] = await db.insert(jobLeadFees).values(fee).returning();
    return created;
  }

  async updateJobLeadFee(id: string, updates: Partial<JobLeadFee>): Promise<JobLeadFee | undefined> {
    const [updated] = await db.update(jobLeadFees)
      .set(updates)
      .where(eq(jobLeadFees.id, id))
      .returning();
    return updated;
  }

  // Job Revenue Events
  async getJobRevenueEvent(id: string): Promise<JobRevenueEvent | undefined> {
    const [event] = await db.select().from(jobRevenueEvents).where(eq(jobRevenueEvents.id, id));
    return event;
  }

  async getJobRevenueEventsByJob(jobId: string): Promise<JobRevenueEvent[]> {
    return db.select().from(jobRevenueEvents).where(eq(jobRevenueEvents.jobId, jobId));
  }

  async getJobRevenueEventsByTechnician(technicianId: string): Promise<JobRevenueEvent[]> {
    return db.select().from(jobRevenueEvents)
      .where(eq(jobRevenueEvents.technicianId, technicianId))
      .orderBy(desc(jobRevenueEvents.recognizedAt));
  }

  async createJobRevenueEvent(event: InsertJobRevenueEvent): Promise<JobRevenueEvent> {
    const [created] = await db.insert(jobRevenueEvents).values(event).returning();
    return created;
  }

  async updateJobRevenueEvent(id: string, updates: Partial<JobRevenueEvent>): Promise<JobRevenueEvent | undefined> {
    const [updated] = await db.update(jobRevenueEvents)
      .set(updates)
      .where(eq(jobRevenueEvents.id, id))
      .returning();
    return updated;
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings;
  }

  async updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings | undefined> {
    const existing = await this.getCompanySettings();
    if (!existing) {
      const [created] = await db.insert(companySettings).values({ ...updates, updatedAt: new Date() }).returning();
      return created;
    }
    const [updated] = await db.update(companySettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companySettings.id, existing.id))
      .returning();
    return updated;
  }

  // Quote Line Items
  async getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]> {
    return db.select().from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, quoteId))
      .orderBy(asc(quoteLineItems.sortOrder));
  }

  async createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem> {
    const [created] = await db.insert(quoteLineItems).values(item).returning();
    return created;
  }

  async updateQuoteLineItem(id: string, updates: Partial<QuoteLineItem>): Promise<QuoteLineItem | undefined> {
    const [updated] = await db.update(quoteLineItems)
      .set(updates)
      .where(eq(quoteLineItems.id, id))
      .returning();
    return updated;
  }

  async deleteQuoteLineItem(id: string): Promise<boolean> {
    const result = await db.delete(quoteLineItems).where(eq(quoteLineItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteQuoteLineItemsByQuote(quoteId: string): Promise<boolean> {
    const result = await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId)).returning();
    return result.length >= 0;
  }

  // SEO Content Packs
  async getContentPack(id: string): Promise<ContentPack | undefined> {
    const [pack] = await db.select().from(contentPacks).where(eq(contentPacks.id, id));
    return pack;
  }

  async getContentPacksByJob(jobId: string): Promise<ContentPack[]> {
    return db.select().from(contentPacks)
      .where(eq(contentPacks.jobId, jobId))
      .orderBy(desc(contentPacks.createdAt));
  }

  async getContentPacks(): Promise<ContentPack[]> {
    return db.select().from(contentPacks).orderBy(desc(contentPacks.createdAt));
  }

  async createContentPack(pack: InsertContentPack): Promise<ContentPack> {
    const [created] = await db.insert(contentPacks).values(pack).returning();
    return created;
  }

  async updateContentPack(id: string, updates: Partial<ContentPack>): Promise<ContentPack | undefined> {
    const [updated] = await db.update(contentPacks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentPacks.id, id))
      .returning();
    return updated;
  }

  async deleteContentPack(id: string): Promise<boolean> {
    const result = await db.delete(contentPacks).where(eq(contentPacks.id, id)).returning();
    return result.length > 0;
  }

  // SEO Content Items
  async getContentItem(id: string): Promise<ContentItem | undefined> {
    const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id));
    return item;
  }

  async getContentItemsByPack(contentPackId: string): Promise<ContentItem[]> {
    return db.select().from(contentItems)
      .where(eq(contentItems.contentPackId, contentPackId))
      .orderBy(desc(contentItems.createdAt));
  }

  async getContentItems(): Promise<ContentItem[]> {
    return db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const [created] = await db.insert(contentItems).values(item).returning();
    return created;
  }

  async updateContentItem(id: string, updates: Partial<ContentItem>): Promise<ContentItem | undefined> {
    const [updated] = await db.update(contentItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentItems.id, id))
      .returning();
    return updated;
  }

  async deleteContentItem(id: string): Promise<boolean> {
    const result = await db.delete(contentItems).where(eq(contentItems.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // THREAD-BASED CHAT SYSTEM
  // ============================================

  async getChatThread(id: string): Promise<ChatThread | undefined> {
    const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id));
    return thread;
  }

  async getChatThreadByJob(jobId: string, visibility: 'internal' | 'customer_visible'): Promise<ChatThread | undefined> {
    const [thread] = await db.select().from(chatThreads)
      .where(and(
        eq(chatThreads.relatedJobId, jobId),
        eq(chatThreads.visibility, visibility)
      ));
    return thread;
  }

  async getChatThreadsForUser(userId: string, options?: { status?: string; visibility?: string }): Promise<ChatThread[]> {
    const participantRecords = await db.select().from(chatThreadParticipants)
      .where(and(
        eq(chatThreadParticipants.participantType, 'user'),
        eq(chatThreadParticipants.participantId, userId)
      ));
    
    const threadIds = participantRecords.map(p => p.threadId);
    if (threadIds.length === 0) return [];
    
    let query = db.select().from(chatThreads)
      .where(sql`${chatThreads.id} IN (${sql.join(threadIds.map(id => sql`${id}`), sql`, `)})`);
    
    const threads = await query.orderBy(desc(chatThreads.lastMessageAt));
    
    return threads.filter(thread => {
      if (options?.status && thread.status !== options.status) return false;
      if (options?.visibility && thread.visibility !== options.visibility) return false;
      return true;
    });
  }

  async getChatThreadsForCustomer(customerIdentifier: string, jobId: string): Promise<ChatThread[]> {
    const participantRecords = await db.select().from(chatThreadParticipants)
      .where(and(
        eq(chatThreadParticipants.participantType, 'customer'),
        eq(chatThreadParticipants.participantId, customerIdentifier)
      ));
    
    const threadIds = participantRecords.map(p => p.threadId);
    if (threadIds.length === 0) return [];
    
    return db.select().from(chatThreads)
      .where(and(
        sql`${chatThreads.id} IN (${sql.join(threadIds.map(id => sql`${id}`), sql`, `)})`,
        eq(chatThreads.relatedJobId, jobId),
        eq(chatThreads.visibility, 'customer_visible')
      ))
      .orderBy(desc(chatThreads.lastMessageAt));
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const [created] = await db.insert(chatThreads).values(thread).returning();
    return created;
  }

  async updateChatThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread | undefined> {
    const [updated] = await db.update(chatThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatThreads.id, id))
      .returning();
    return updated;
  }

  // Chat Thread Participants
  async getChatThreadParticipants(threadId: string): Promise<ChatThreadParticipant[]> {
    return db.select().from(chatThreadParticipants)
      .where(eq(chatThreadParticipants.threadId, threadId));
  }

  async getChatThreadParticipant(threadId: string, participantType: string, participantId: string): Promise<ChatThreadParticipant | undefined> {
    const [participant] = await db.select().from(chatThreadParticipants)
      .where(and(
        eq(chatThreadParticipants.threadId, threadId),
        eq(chatThreadParticipants.participantType, participantType),
        eq(chatThreadParticipants.participantId, participantId)
      ));
    return participant;
  }

  async addChatThreadParticipant(participant: InsertChatThreadParticipant): Promise<ChatThreadParticipant> {
    const [created] = await db.insert(chatThreadParticipants).values(participant).returning();
    return created;
  }

  async updateChatThreadParticipantLastRead(threadId: string, participantType: string, participantId: string): Promise<void> {
    await db.update(chatThreadParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(chatThreadParticipants.threadId, threadId),
        eq(chatThreadParticipants.participantType, participantType),
        eq(chatThreadParticipants.participantId, participantId)
      ));
  }

  async isUserParticipant(threadId: string, userId: string): Promise<boolean> {
    const participant = await this.getChatThreadParticipant(threadId, 'user', userId);
    return !!participant;
  }

  async isCustomerParticipant(threadId: string, customerIdentifier: string): Promise<boolean> {
    const participant = await this.getChatThreadParticipant(threadId, 'customer', customerIdentifier);
    return !!participant;
  }

  // Chat Messages
  async getChatMessages(threadId: string, options?: { limit?: number; before?: Date }): Promise<ChatMessage[]> {
    let query = db.select().from(chatMessages)
      .where(eq(chatMessages.threadId, threadId));
    
    const messages = await query.orderBy(desc(chatMessages.createdAt));
    
    let result = messages;
    if (options?.before) {
      result = result.filter(m => m.createdAt < options.before!);
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result.reverse();
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return message;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    
    await db.update(chatThreads)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(chatThreads.id, message.threadId));
    
    return created;
  }

  async getUnreadCountForParticipant(threadId: string, participantType: string, participantId: string): Promise<number> {
    const participant = await this.getChatThreadParticipant(threadId, participantType, participantId);
    if (!participant) return 0;
    
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.threadId, threadId));
    
    let count = 0;
    for (const msg of messages) {
      const isOwnMessage = msg.senderType === participantType && msg.senderId === participantId;
      if (isOwnMessage) continue;
      
      if (!participant.lastReadAt || msg.createdAt > participant.lastReadAt) {
        count++;
      }
    }
    return count;
  }

  async getTotalUnreadCountForUser(userId: string): Promise<number> {
    const threads = await this.getChatThreadsForUser(userId, { status: 'active' });
    let total = 0;
    for (const thread of threads) {
      total += await this.getUnreadCountForParticipant(thread.id, 'user', userId);
    }
    return total;
  }

  async getTotalUnreadCountForCustomer(customerIdentifier: string, jobId: string): Promise<number> {
    const threads = await this.getChatThreadsForCustomer(customerIdentifier, jobId);
    let total = 0;
    for (const thread of threads) {
      total += await this.getUnreadCountForParticipant(thread.id, 'customer', customerIdentifier);
    }
    return total;
  }

  // Chat Magic Link Sessions
  async getChatMagicSession(jobId: string, tokenHash: string): Promise<ChatMagicSession | undefined> {
    const [session] = await db.select().from(chatMagicSessions)
      .where(and(
        eq(chatMagicSessions.jobId, jobId),
        eq(chatMagicSessions.tokenHash, tokenHash),
        gte(chatMagicSessions.expiresAt, new Date())
      ));
    return session;
  }

  async getChatMagicSessionByJob(jobId: string, customerIdentifier: string): Promise<ChatMagicSession | undefined> {
    const [session] = await db.select().from(chatMagicSessions)
      .where(and(
        eq(chatMagicSessions.jobId, jobId),
        eq(chatMagicSessions.customerIdentifier, customerIdentifier),
        gte(chatMagicSessions.expiresAt, new Date())
      ))
      .orderBy(desc(chatMagicSessions.createdAt));
    return session;
  }

  async createChatMagicSession(session: InsertChatMagicSession): Promise<ChatMagicSession> {
    const [created] = await db.insert(chatMagicSessions).values(session).returning();
    return created;
  }

  async updateChatMagicSessionLastUsed(id: string): Promise<void> {
    await db.update(chatMagicSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(chatMagicSessions.id, id));
  }

  async deleteChatMagicSession(id: string): Promise<boolean> {
    const result = await db.delete(chatMagicSessions).where(eq(chatMagicSessions.id, id)).returning();
    return result.length > 0;
  }

  // Chat Email Notification Rate Limiting
  async getLastChatEmailNotification(jobId: string, customerIdentifier: string): Promise<Date | null> {
    const [record] = await db.select().from(chatEmailNotifications)
      .where(and(
        eq(chatEmailNotifications.jobId, jobId),
        eq(chatEmailNotifications.customerIdentifier, customerIdentifier)
      ));
    return record?.lastNotifiedAt || null;
  }

  async updateChatEmailNotification(jobId: string, customerIdentifier: string): Promise<void> {
    const existing = await this.getLastChatEmailNotification(jobId, customerIdentifier);
    if (existing) {
      await db.update(chatEmailNotifications)
        .set({ lastNotifiedAt: new Date() })
        .where(and(
          eq(chatEmailNotifications.jobId, jobId),
          eq(chatEmailNotifications.customerIdentifier, customerIdentifier)
        ));
    } else {
      await db.insert(chatEmailNotifications).values({
        jobId,
        customerIdentifier,
        lastNotifiedAt: new Date()
      });
    }
  }
}

export const storage = new DatabaseStorage();
