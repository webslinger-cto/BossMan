import {
  type User, type InsertUser,
  type Company, type InsertCompany,
  type Technician, type InsertTechnician,
  type Job, type InsertJob,
  type JobTimelineEvent, type InsertJobTimelineEvent,
  type Quote, type InsertQuote,
  type Notification, type InsertNotification,
  type ShiftLog, type InsertShiftLog,
  type QuoteTemplate, type InsertQuoteTemplate,
  type JobAttachment, type InsertJobAttachment,
  type JobChecklist, type InsertJobChecklist,
  type ChecklistTemplate, type InsertChecklistTemplate,
  type PricebookItem, type InsertPricebookItem,
  type PricebookCategory, type InsertPricebookCategory,
  type TimeEntry, type InsertTimeEntry,
  type PayrollPeriod, type InsertPayrollPeriod,
  type PayrollRecord, type InsertPayrollRecord,
  type EmployeePayRate, type InsertEmployeePayRate,
  type JobLeadFee, type InsertJobLeadFee,
  type JobRevenueEvent, type InsertJobRevenueEvent,
  type QuoteLineItem, type InsertQuoteLineItem,
  type JobMessage, type InsertJobMessage,
  type ChatThread, type InsertChatThread,
  type ChatThreadParticipant, type InsertChatThreadParticipant,
  type ChatMessage, type InsertChatMessage,
  users, companies, technicians,
  jobs, jobTimelineEvents, quotes, notifications, shiftLogs, quoteTemplates,
  jobAttachments, jobChecklists, checklistTemplates,
  pricebookItems, pricebookCategories,
  timeEntries, payrollPeriods, payrollRecords, employeePayRates, jobLeadFees, jobRevenueEvents, quoteLineItems,
  jobMessages,
  chatThreads, chatThreadParticipants, chatMessages,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, lte, asc, sql } from "drizzle-orm";

export interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalJobs: number;
    completedJobs: number;
    netProfit: number;
    revenueChange: number;
    jobsChange: number;
    profitChange: number;
  };
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    jobs: number;
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
}

export interface IStorage {
  // Initialization (optional - used by DatabaseStorage to seed data)
  initialize?(): Promise<void>;

  // Companies
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined>;

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

  // Job Attachments (photos, videos)
  getJobAttachments(jobId: string): Promise<JobAttachment[]>;
  createJobAttachment(attachment: InsertJobAttachment): Promise<JobAttachment>;
  deleteJobAttachment(id: string): Promise<boolean>;

  // Job Checklists
  getJobChecklists(jobId: string): Promise<JobChecklist[]>;
  getJobChecklist(id: string): Promise<JobChecklist | undefined>;
  createJobChecklist(checklist: InsertJobChecklist): Promise<JobChecklist>;
  updateJobChecklist(id: string, updates: Partial<JobChecklist>): Promise<JobChecklist | undefined>;

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

  // Quote Line Items
  getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]>;
  createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem>;
  updateQuoteLineItem(id: string, updates: Partial<QuoteLineItem>): Promise<QuoteLineItem | undefined>;
  deleteQuoteLineItem(id: string): Promise<boolean>;
  deleteQuoteLineItemsByQuote(quoteId: string): Promise<boolean>;

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

    // Ensure a default company exists
    let defaultCompanyId: string;
    const existingCompanies = await this.getCompanies();
    if (existingCompanies.length > 0) {
      defaultCompanyId = existingCompanies[0].id;
    } else {
      const company = await this.createCompany({
        name: "Chicago Sewer Experts",
        slug: "chicago-sewer-experts",
        businessType: "plumbing",
        phone: "(708) 555-0100",
        email: "info@chicagosewerexperts.com",
        plan: "professional",
      });
      defaultCompanyId = company.id;
    }

    // Seed users
    const userData = [
      { id: "user-admin", username: "admin", password: "demo123", role: "admin" as const, fullName: "Admin User" },
      { id: "user-dispatcher", username: "dispatcher", password: "demo123", role: "dispatcher" as const, fullName: "Dispatch Manager" },
      { id: "user-tech-1", username: "mike", password: "demo123", role: "technician" as const, fullName: "Mike Johnson" },
      { id: "user-tech-2", username: "carlos", password: "demo123", role: "technician" as const, fullName: "Carlos Rodriguez" },
      { id: "user-tech-3", username: "james", password: "demo123", role: "technician" as const, fullName: "James Williams" },
    ];

    for (const u of userData) {
      try {
        await db.insert(users).values({
          id: u.id,
          companyId: defaultCompanyId,
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
          companyId: defaultCompanyId,
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

    console.log("Database seeding complete");
  }

  // Companies
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set({ ...updates, updatedAt: new Date() }).where(eq(companies.id, id)).returning();
    return company;
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
    await db.delete(users).where(eq(users.id, id));
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
      companyId: job.companyId,
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

  // Analytics (based on jobs, quotes, and technicians)
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

    const allJobs = await db.select().from(jobs);
    const allQuotes = await db.select().from(quotes);
    const allTechs = await db.select().from(technicians);

    const currentJobs = allJobs.filter(j => new Date(j.createdAt) >= startDate);
    const prevJobs = allJobs.filter(j => new Date(j.createdAt) >= prevStartDate && new Date(j.createdAt) <= prevEndDate);
    const currentQuotes = allQuotes.filter(q => new Date(q.createdAt) >= startDate);

    const totalRevenue = currentQuotes.reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);
    const prevRevenue = allQuotes.filter(q => new Date(q.createdAt) >= prevStartDate && new Date(q.createdAt) <= prevEndDate)
      .reduce((sum, q) => sum + (parseFloat(q.total || "0")), 0);

    const totalJobs = currentJobs.length;
    const completedJobs = currentJobs.filter(j => j.status === "completed").length;
    const prevTotalJobs = prevJobs.length;

    const expenseRate = 0.4;
    const netProfit = totalRevenue * (1 - expenseRate);
    const prevProfit = prevRevenue * (1 - expenseRate);

    // Service breakdown from jobs
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

    // Tech performance
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

    // Monthly revenue
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = new Map<string, { revenue: number; jobs: number; expenses: number }>();
    months.forEach(m => monthlyData.set(m, { revenue: 0, jobs: 0, expenses: 0 }));

    currentJobs.forEach(j => {
      const month = months[new Date(j.createdAt).getMonth()];
      const data = monthlyData.get(month)!;
      data.jobs++;
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
        jobs: data.jobs,
        expenses: Math.round(data.expenses),
        profit: Math.round(data.revenue - data.expenses),
      };
    });

    const calcChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return {
      summary: {
        totalRevenue,
        totalJobs,
        completedJobs,
        netProfit,
        revenueChange: Math.round(calcChange(totalRevenue, prevRevenue) * 10) / 10,
        jobsChange: Math.round(calcChange(totalJobs, prevTotalJobs) * 10) / 10,
        profitChange: Math.round(calcChange(netProfit, prevProfit) * 10) / 10,
      },
      monthlyRevenue,
      serviceBreakdown,
      techPerformance,
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
    await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id));
    return true;
  }

  async resetJobBoard(): Promise<void> {
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

    await db.update(technicians)
      .set({ 
        status: "off_duty", 
        currentJobId: null, 
        completedJobsToday: 0 
      });
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
    
    const query = db.select().from(chatThreads)
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
    const query = db.select().from(chatMessages)
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
}

export const storage = new DatabaseStorage();
