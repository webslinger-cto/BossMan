import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// COMPANIES (multi-tenancy root)
// ============================================

// Business types — configurable per company, not hardcoded
export const businessTypes = ["plumbing", "hvac", "electrical", "general_contractor", "roofing", "landscaping", "cleaning", "pest_control", "other"] as const;
export type BusinessType = typeof businessTypes[number];

// Subscription plans
export const planTypes = ["free", "starter", "professional", "enterprise"] as const;
export type PlanType = typeof planTypes[number];

// Companies table — the tenant root. Merges former company_settings.
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-safe identifier
  businessType: text("business_type").notNull().default("other"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  licenseNumber: text("license_number"),
  serviceAreas: text("service_areas"), // comma-separated or JSON
  logoUrl: text("logo_url"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Settings (merged from former company_settings)
  defaultTaxRate: decimal("default_tax_rate", { precision: 5, scale: 2 }).default("0"),
  defaultCommissionRate: decimal("default_commission_rate", { precision: 5, scale: 2 }).default("10"),
  defaultHourlyRate: decimal("default_hourly_rate", { precision: 10, scale: 2 }).default("25"),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  leadFeeAmount: decimal("lead_fee_amount", { precision: 10, scale: 2 }).default("125"),
  quoteValidDays: integer("quote_valid_days").default(30),
  // Configurable service types per company (JSON array of strings)
  serviceTypes: jsonb("service_types").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// ============================================
// USER ROLES
// ============================================

export const userRoles = ["admin", "dispatcher", "technician"] as const;
export type UserRole = typeof userRoles[number];

// ============================================
// USERS
// ============================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  viewablePassword: text("viewable_password"),
  role: text("role").notNull().default("technician"),
  fullName: text("full_name"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  isSuperAdmin: boolean("is_super_admin").default(false),
  requiresPasswordSetup: boolean("requires_password_setup").default(true),
  setupToken: text("setup_token"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  companyId: true,
  username: true,
  password: true,
  viewablePassword: true,
  role: true,
  fullName: true,
  phone: true,
  email: true,
  isActive: true,
  isSuperAdmin: true,
  requiresPasswordSetup: true,
  setupToken: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================
// TECHNICIANS (crew members)
// ============================================

// Crew member classifications
export const technicianClassifications = ["senior", "junior", "digger"] as const;
export type TechnicianClassification = typeof technicianClassifications[number];

// Technicians table — represents crew members assigned to jobs.
// NOTE: "technician" is the DB name; conceptually these are "crew members" in the UI.
export const technicians = pgTable("technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  status: text("status").notNull().default("available"), // available, busy, off_duty, on_break
  currentJobId: varchar("current_job_id"),
  skillLevel: text("skill_level").default("standard"), // junior, standard, senior (legacy)
  classification: text("classification").default("junior"), // senior, junior, digger
  approvedJobTypes: text("approved_job_types").array(), // service types this crew member can work
  commissionRate: decimal("commission_rate").default("0.10"),
  hourlyRate: decimal("hourly_rate").default("25.00"),
  emergencyRate: decimal("emergency_rate").default("1.5"),
  maxDailyJobs: integer("max_daily_jobs").default(8),
  completedJobsToday: integer("completed_jobs_today").default(0),
  lastLocationLat: decimal("last_location_lat"),
  lastLocationLng: decimal("last_location_lng"),
  lastLocationUpdate: timestamp("last_location_update"),
});

export const insertTechnicianSchema = createInsertSchema(technicians).omit({ id: true });
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

// ============================================
// JOBS
// ============================================

export const jobStatuses = ["pending", "assigned", "confirmed", "en_route", "on_site", "in_progress", "completed", "cancelled"] as const;
export type JobStatus = typeof jobStatuses[number];

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  address: text("address").notNull(),
  city: text("city"),
  zipCode: text("zip_code"),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  serviceType: text("service_type").notNull(), // company-configurable, not hardcoded
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("normal"),
  scheduledDate: timestamp("scheduled_date"),
  scheduledTimeStart: text("scheduled_time_start"),
  scheduledTimeEnd: text("scheduled_time_end"),
  estimatedDuration: integer("estimated_duration"), // minutes
  assignedTechnicianId: varchar("assigned_technician_id").references(() => technicians.id),
  dispatcherId: varchar("dispatcher_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  assignedAt: timestamp("assigned_at"),
  confirmedAt: timestamp("confirmed_at"),
  enRouteAt: timestamp("en_route_at"),
  arrivedAt: timestamp("arrived_at"),
  arrivalLat: decimal("arrival_lat"),
  arrivalLng: decimal("arrival_lng"),
  arrivalVerified: boolean("arrival_verified"),
  arrivalDistance: decimal("arrival_distance"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Labor tracking
  laborHours: decimal("labor_hours"),
  laborRate: decimal("labor_rate"),
  laborCost: decimal("labor_cost"),
  // Expense tracking
  materialsCost: decimal("materials_cost"),
  permitCost: decimal("permit_cost"),
  travelExpense: decimal("travel_expense"),
  equipmentCost: decimal("equipment_cost"),
  otherExpenses: decimal("other_expenses"),
  expenseNotes: text("expense_notes"),
  // Revenue and ROI
  totalCost: decimal("total_cost"),
  totalRevenue: decimal("total_revenue"),
  profit: decimal("profit"),
  // Cancellation tracking
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by"),
  // Customer communication consent
  customerConsentSmsOptIn: boolean("customer_consent_sms_opt_in").default(false),
  customerConsentEmailOptIn: boolean("customer_consent_email_opt_in").default(false),
  customerConsentSmsOwnershipConfirmed: boolean("customer_consent_sms_ownership_confirmed").default(false),
  customerConsentEmailOwnershipConfirmed: boolean("customer_consent_email_ownership_confirmed").default(false),
  customerConsentAt: timestamp("customer_consent_at"),
  customerConsentIp: text("customer_consent_ip"),
  customerConsentUserAgent: text("customer_consent_user_agent"),
  customerConsentDisclosureVersion: text("customer_consent_disclosure_version"),
  customerConsentDisclosureText: text("customer_consent_disclosure_text"),
  customerConsentSource: text("customer_consent_source"),
  customerConsentInAppMessaging: boolean("customer_consent_in_app_messaging").default(false),
  // Quote linkage
  quoteId: varchar("quote_id"),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ============================================
// JOB TIMELINE EVENTS
// ============================================

export const jobTimelineEvents = pgTable("job_timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  eventType: text("event_type").notNull(), // created, assigned, confirmed, en_route, arrived, started, quote_sent, completed, note
  description: text("description"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  metadata: text("metadata"),
});

export const insertJobTimelineEventSchema = createInsertSchema(jobTimelineEvents).omit({ id: true, createdAt: true });
export type InsertJobTimelineEvent = z.infer<typeof insertJobTimelineEventSchema>;
export type JobTimelineEvent = typeof jobTimelineEvents.$inferSelect;

// ============================================
// QUOTES
// ============================================

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").references(() => jobs.id),
  technicianId: varchar("technician_id").references(() => technicians.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  address: text("address"),
  preferredContactMethod: text("preferred_contact_method"),
  lineItems: text("line_items"), // JSON string
  laborEntries: text("labor_entries"), // JSON string
  subtotal: decimal("subtotal"),
  laborTotal: decimal("labor_total").default("0"),
  taxRate: decimal("tax_rate").default("0"),
  taxAmount: decimal("tax_amount").default("0"),
  total: decimal("total"),
  status: text("status").notNull().default("draft"), // draft, sent, viewed, accepted, declined, expired
  notes: text("notes"),
  publicToken: varchar("public_token").unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// ============================================
// QUOTE LINE ITEMS
// ============================================

export const quoteLineItems = pgTable("quote_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  quoteId: varchar("quote_id").references(() => quotes.id).notNull(),
  pricebookItemId: varchar("pricebook_item_id").references(() => pricebookItems.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const insertQuoteLineItemSchema = createInsertSchema(quoteLineItems).omit({ id: true });
export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;

// ============================================
// QUOTE TEMPLATES
// ============================================

export const quoteTemplates = pgTable("quote_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  serviceType: text("service_type"),
  lineItems: text("line_items").notNull(), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertQuoteTemplateSchema = createInsertSchema(quoteTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuoteTemplate = z.infer<typeof insertQuoteTemplateSchema>;
export type QuoteTemplate = typeof quoteTemplates.$inferSelect;

// ============================================
// NOTIFICATIONS
// ============================================

export const notificationTypes = ["job_assigned", "job_confirmed", "job_arrived", "job_completed", "quote_sent", "quote_accepted", "message", "alert"] as const;
export type NotificationType = typeof notificationTypes[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  jobId: varchar("job_id"),
  isRead: boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  readAt: timestamp("read_at"),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================
// JOB MESSAGES (internal & customer chat per job)
// ============================================

export const jobMessageAudiences = ["internal", "customer"] as const;
export type JobMessageAudience = typeof jobMessageAudiences[number];

export const jobMessageSenderTypes = ["dispatcher", "technician", "admin", "customer", "system"] as const;
export type JobMessageSenderType = typeof jobMessageSenderTypes[number];

export const jobMessages = pgTable("job_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  audience: text("audience").notNull(), // 'internal' or 'customer'
  senderType: text("sender_type").notNull(),
  senderUserId: varchar("sender_user_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  meta: jsonb("meta").notNull().default({}),
});

export const insertJobMessageSchema = createInsertSchema(jobMessages).omit({ id: true, createdAt: true });
export type InsertJobMessage = z.infer<typeof insertJobMessageSchema>;
export type JobMessage = typeof jobMessages.$inferSelect;

// ============================================
// JOB ATTACHMENTS
// ============================================

export const jobAttachments = pgTable("job_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  technicianId: varchar("technician_id").references(() => technicians.id),
  type: text("type").notNull(), // photo, video, document
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  url: text("url"),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  category: text("category"), // before, during, after, damage, parts, signature
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertJobAttachmentSchema = createInsertSchema(jobAttachments).omit({ id: true, createdAt: true });
export type InsertJobAttachment = z.infer<typeof insertJobAttachmentSchema>;
export type JobAttachment = typeof jobAttachments.$inferSelect;

// ============================================
// JOB CHECKLISTS
// ============================================

export const jobChecklists = pgTable("job_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  technicianId: varchar("technician_id").references(() => technicians.id),
  title: text("title").notNull(),
  items: text("items"), // JSON array of {id, text, checked, notes}
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertJobChecklistSchema = createInsertSchema(jobChecklists).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobChecklist = z.infer<typeof insertJobChecklistSchema>;
export type JobChecklist = typeof jobChecklists.$inferSelect;

// ============================================
// CHECKLIST TEMPLATES
// ============================================

export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  serviceType: text("service_type"),
  items: text("items"), // JSON array of {id, text, required}
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({ id: true, createdAt: true });
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

// ============================================
// PRICEBOOK
// ============================================

export const pricebookItems = pgTable("pricebook_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // company-configurable categories
  serviceCode: text("service_code"),
  basePrice: decimal("base_price").notNull(),
  laborHours: decimal("labor_hours"),
  materialsCost: decimal("materials_cost"),
  unit: text("unit").default("each"), // each, per_foot, per_hour, flat_rate
  isActive: boolean("is_active").notNull().default(true),
  isTaxable: boolean("is_taxable").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertPricebookItemSchema = createInsertSchema(pricebookItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPricebookItem = z.infer<typeof insertPricebookItemSchema>;
export type PricebookItem = typeof pricebookItems.$inferSelect;

export const pricebookCategories = pgTable("pricebook_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPricebookCategorySchema = createInsertSchema(pricebookCategories).omit({ id: true, createdAt: true });
export type InsertPricebookCategory = z.infer<typeof insertPricebookCategorySchema>;
export type PricebookCategory = typeof pricebookCategories.$inferSelect;

// ============================================
// SHIFT LOGS (crew member availability)
// ============================================

export const shiftLogs = pgTable("shift_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  technicianId: varchar("technician_id").notNull().references(() => technicians.id),
  action: text("action").notNull(), // clock_in, clock_out
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  notes: text("notes"),
});

export const insertShiftLogSchema = createInsertSchema(shiftLogs).omit({ id: true, timestamp: true });
export type InsertShiftLog = z.infer<typeof insertShiftLogSchema>;
export type ShiftLog = typeof shiftLogs.$inferSelect;

// ============================================
// PAYROLL & TIME TRACKING
// ============================================

export const employmentTypes = ["hourly", "salary"] as const;
export type EmploymentType = (typeof employmentTypes)[number];

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  technicianId: varchar("technician_id").references(() => technicians.id),
  jobId: varchar("job_id").references(() => jobs.id),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  breakMinutes: integer("break_minutes").default(0),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  entryType: text("entry_type").notNull().default("regular"), // regular, overtime, holiday
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, createdAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export const payrollPeriods = pgTable("payroll_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("open"), // open, processing, closed
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).omit({ id: true, createdAt: true });
export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodSchema>;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;

export const payrollRecords = pgTable("payroll_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  technicianId: varchar("technician_id").references(() => technicians.id),
  periodId: varchar("period_id").references(() => payrollPeriods.id).notNull(),
  employmentType: text("employment_type").notNull().default("hourly"),
  regularHours: decimal("regular_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }).notNull(),
  salaryPay: decimal("salary_pay", { precision: 10, scale: 2 }).default("0"),
  regularPay: decimal("regular_pay", { precision: 10, scale: 2 }).default("0"),
  overtimePay: decimal("overtime_pay", { precision: 10, scale: 2 }).default("0"),
  commissionPay: decimal("commission_pay", { precision: 10, scale: 2 }).default("0"),
  bonusPay: decimal("bonus_pay", { precision: 10, scale: 2 }).default("0"),
  leadFeeDeductions: decimal("lead_fee_deductions", { precision: 10, scale: 2 }).default("0"),
  materialDeductions: decimal("material_deductions", { precision: 10, scale: 2 }).default("0"),
  permitDeductions: decimal("permit_deductions", { precision: 10, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  federalTax: decimal("federal_tax", { precision: 10, scale: 2 }).default("0"),
  stateTax: decimal("state_tax", { precision: 10, scale: 2 }).default("0"),
  socialSecurity: decimal("social_security", { precision: 10, scale: 2 }).default("0"),
  medicare: decimal("medicare", { precision: 10, scale: 2 }).default("0"),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({ id: true, createdAt: true });
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

export const employeePayRates = pgTable("employee_pay_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  technicianId: varchar("technician_id").references(() => technicians.id),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  salaryAmount: decimal("salary_amount", { precision: 10, scale: 2 }),
  payFrequency: text("pay_frequency").default("weekly"),
  residenceState: text("residence_state"),
  filingStatus: text("filing_status").default("single"),
  federalAllowances: integer("federal_allowances").default(1),
  stateAllowances: integer("state_allowances").default(1),
  effectiveDate: timestamp("effective_date").notNull().default(sql`now()`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertEmployeePayRateSchema = createInsertSchema(employeePayRates).omit({ id: true, createdAt: true });
export type InsertEmployeePayRate = z.infer<typeof insertEmployeePayRateSchema>;
export type EmployeePayRate = typeof employeePayRates.$inferSelect;

// ============================================
// JOB LEAD FEES
// ============================================

export const jobLeadFees = pgTable("job_lead_fees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  technicianId: varchar("technician_id").references(() => technicians.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("125"),
  acceptedAt: timestamp("accepted_at").notNull().default(sql`now()`),
  payrollPeriodId: varchar("payroll_period_id").references(() => payrollPeriods.id),
  deductedAt: timestamp("deducted_at"),
  notes: text("notes"),
});

export const insertJobLeadFeeSchema = createInsertSchema(jobLeadFees).omit({ id: true });
export type InsertJobLeadFee = z.infer<typeof insertJobLeadFeeSchema>;
export type JobLeadFee = typeof jobLeadFees.$inferSelect;

// ============================================
// JOB REVENUE EVENTS
// ============================================

export const jobRevenueEvents = pgTable("job_revenue_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  technicianId: varchar("technician_id").references(() => technicians.id).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull(),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  permitCost: decimal("permit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  marketingCost: decimal("marketing_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  companyLeadCost: decimal("company_lead_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  techLeadFee: decimal("tech_lead_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  netProfit: decimal("net_profit", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  payrollPeriodId: varchar("payroll_period_id").references(() => payrollPeriods.id),
  isPosted: boolean("is_posted").notNull().default(false),
  postedAt: timestamp("posted_at"),
  recognizedAt: timestamp("recognized_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertJobRevenueEventSchema = createInsertSchema(jobRevenueEvents).omit({ id: true, createdAt: true });
export type InsertJobRevenueEvent = z.infer<typeof insertJobRevenueEventSchema>;
export type JobRevenueEvent = typeof jobRevenueEvents.$inferSelect;

// ============================================
// THREAD-BASED CHAT SYSTEM
// ============================================

export const chatThreadVisibilities = ["internal", "customer_visible"] as const;
export type ChatThreadVisibility = typeof chatThreadVisibilities[number];

export const chatThreadStatuses = ["active", "closed"] as const;
export type ChatThreadStatus = typeof chatThreadStatuses[number];

export const chatParticipantTypes = ["user", "customer"] as const;
export type ChatParticipantType = typeof chatParticipantTypes[number];

export const chatThreads = pgTable("chat_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  relatedJobId: varchar("related_job_id").references(() => jobs.id),
  visibility: text("visibility").notNull().default("internal"),
  status: text("status").notNull().default("active"),
  subject: text("subject"),
  createdByType: text("created_by_type").notNull().default("user"),
  createdById: varchar("created_by_id").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreads.$inferSelect;

export const chatThreadParticipants = pgTable("chat_thread_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  threadId: varchar("thread_id").notNull().references(() => chatThreads.id),
  participantType: text("participant_type").notNull(),
  participantId: varchar("participant_id").notNull(),
  roleAtTime: text("role_at_time"),
  displayName: text("display_name"),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertChatThreadParticipantSchema = createInsertSchema(chatThreadParticipants).omit({ id: true, createdAt: true });
export type InsertChatThreadParticipant = z.infer<typeof insertChatThreadParticipantSchema>;
export type ChatThreadParticipant = typeof chatThreadParticipants.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  threadId: varchar("thread_id").notNull().references(() => chatThreads.id),
  senderType: text("sender_type").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderDisplayName: text("sender_display_name"),
  body: text("body").notNull(),
  clientMsgId: text("client_msg_id"),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============================================
// SESSION (express-session PostgreSQL store)
// ============================================

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
