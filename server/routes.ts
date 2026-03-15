import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertLeadSchema,
  insertCallSchema,
  insertJobSchema,
  insertJobTimelineEventSchema,
  insertQuoteSchema,
  insertNotificationSchema,
  insertTechnicianSchema,
  insertSalespersonSchema,
  insertShiftLogSchema,
  insertQuoteTemplateSchema,
  insertContactAttemptSchema,
  insertWebhookLogSchema,
  insertJobAttachmentSchema,
  insertJobChecklistSchema,
  insertTechnicianLocationSchema,
  insertChecklistTemplateSchema,
  insertPricebookItemSchema,
  insertPricebookCategorySchema,
  insertMarketingCampaignSchema,
  insertMarketingSpendSchema,
  insertBusinessIntakeSchema,
  insertTimeEntrySchema,
  insertPayrollPeriodSchema,
  insertPayrollRecordSchema,
  insertEmployeePayRateSchema,
  insertJobLeadFeeSchema,
  insertJobRevenueEventSchema,
  insertQuoteLineItemSchema,
  type InsertLead,
} from "@shared/schema";
import { sendEmail, generateLeadAcknowledgmentEmail } from "./services/email";
import { isWithinRadius } from "./geocoding";
import { 
  autoContactLead, 
  createJobFromLead, 
  autoAssignTechnician, 
  cancelJob, 
  updateJobCosts, 
  completeJob,
  sendAppointmentReminder,
  sendTechnicianEnRouteSMS,
  sendJobCompleteSMS,
  calculateJobROI,
  notifyLeadRecipients,
  notifyJobCreated,
  notifyJobAssigned,
  notifyJobApproved,
  notifyQuoteCreated,
} from "./services/automation";
import * as smsService from "./services/sms";
import { dispatchToClosestTechnician } from "./services/dispatch";
import { generateApplicationPDF, generateComparisonPDF, generateHouseCallProComparisonPDF, generateTestResultsPDF, generateThreeWayComparisonPDF, generateReadmePDF, generateChatSystemPDF } from "./services/pdf-generator";
import { pushJobToBuilder1 } from "./services/builder1-integration";

// Helper: Notify all dispatchers about technician status changes
async function notifyDispatchersOfStatusChange(
  jobId: string,
  job: { address?: string | null; dispatcherId?: string | null },
  techName: string,
  eventType: "en_route" | "arrived" | "completed"
) {
  try {
    const users = await storage.getUsers();
    let dispatcherIds: string[] = [];
    
    // If job has a specific dispatcher, notify them
    if (job.dispatcherId) {
      const dispatcher = users.find(u => u.id === job.dispatcherId);
      if (dispatcher) {
        dispatcherIds = [job.dispatcherId];
      }
    }
    
    // Fallback: notify all dispatchers and admins
    if (dispatcherIds.length === 0) {
      dispatcherIds = users
        .filter(u => u.role === "dispatcher" || u.role === "admin")
        .map(u => u.id);
    }
    
    const address = job.address || "the job location";
    const configs = {
      en_route: {
        title: "Technician En Route",
        message: `${techName} is en route to ${address}`,
        type: "job_confirmed"
      },
      arrived: {
        title: "Technician Arrived",
        message: `${techName} arrived on site at ${address}`,
        type: "job_arrived"
      },
      completed: {
        title: "Job Completed",
        message: `${techName} completed the job at ${address}`,
        type: "job_completed"
      }
    };
    
    const config = configs[eventType];
    
    // Create a notification for each dispatcher
    for (const dispatcherId of dispatcherIds) {
      await storage.createNotification({
        userId: dispatcherId,
        type: config.type,
        title: config.title,
        message: config.message,
        jobId: jobId,
        actionUrl: `/jobs?jobId=${jobId}`,
        isRead: false,
      });
    }
  } catch (error) {
    console.error(`Failed to notify dispatchers for job ${jobId}:`, error);
    // Don't throw - notification failure shouldn't break the main flow
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============================================
  // AUTHENTICATION HELPER
  // ============================================
  // This app stores auth state in frontend and passes userId via X-User-Id header
  type User = { id: string; username: string; role: string; fullName: string | null };
  
  const getChatUser = async (req: any): Promise<User | null> => {
    const userIdHeader = req.headers['x-user-id'] as string;
    if (!userIdHeader) return null;
    const user = await storage.getUser(userIdHeader);
    if (user) {
      req.user = user;
    }
    return user as User | null;
  };
  
  const isAuthenticatedUser = async (req: any): Promise<boolean> => {
    const user = await getChatUser(req);
    return user !== null;
  };
  
  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json({ status: "ok", userCount: users.length });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: "error", error: String(error) });
    }
  });

  // Clear ALL test/demo data - USE WITH EXTREME CAUTION
  app.get("/api/admin/clear-test-data", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      
      // Clear ALL tables using raw SQL in dependency order (keeping only godmode user)
      await db.execute(sql`DELETE FROM job_timeline_events`);
      await db.execute(sql`DELETE FROM contact_attempts`);
      await db.execute(sql`DELETE FROM notifications`);
      await db.execute(sql`DELETE FROM quote_line_items`);
      await db.execute(sql`DELETE FROM job_attachments`);
      await db.execute(sql`DELETE FROM job_checklists`);
      await db.execute(sql`DELETE FROM job_lead_fees`);
      await db.execute(sql`DELETE FROM job_revenue_events`);
      await db.execute(sql`DELETE FROM technician_locations`);
      await db.execute(sql`DELETE FROM shift_logs`);
      await db.execute(sql`DELETE FROM time_entries`);
      await db.execute(sql`DELETE FROM payroll_records`);
      await db.execute(sql`DELETE FROM payroll_periods`);
      await db.execute(sql`DELETE FROM employee_pay_rates`);
      await db.execute(sql`DELETE FROM marketing_spend`);
      await db.execute(sql`DELETE FROM marketing_campaigns`);
      await db.execute(sql`DELETE FROM webhook_logs`);
      await db.execute(sql`DELETE FROM content_items`);
      await db.execute(sql`DELETE FROM content_packs`);
      await db.execute(sql`DELETE FROM customer_interactions`);
      await db.execute(sql`DELETE FROM sales_commissions`);
      await db.execute(sql`DELETE FROM salesperson_locations`);
      
      // Main operational tables
      await db.execute(sql`DELETE FROM calls`);
      await db.execute(sql`DELETE FROM quotes`);
      await db.execute(sql`DELETE FROM jobs`);
      await db.execute(sql`DELETE FROM leads`);
      
      // Staff tables
      await db.execute(sql`DELETE FROM technicians`);
      await db.execute(sql`DELETE FROM salespersons`);
      
      // Delete all users EXCEPT godmode
      await db.execute(sql`DELETE FROM users WHERE username != 'godmode'`);
      
      res.json({ 
        success: true, 
        message: "ALL test data cleared! Only godmode admin account remains."
      });
    } catch (error) {
      console.error("Error clearing test data:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Force reset godmode super admin (special recovery endpoint)
  app.get("/api/admin/reset-godmode", async (req, res) => {
    try {
      // Check if godmode user exists
      const existingUser = await storage.getUserByUsername("godmode");
      
      if (existingUser) {
        // Update existing user
        await storage.updateUser(existingUser.id, {
          password: "CSE2024!",
          isSuperAdmin: true,
          role: "admin",
        });
        res.json({ success: true, message: "Godmode user password reset to CSE2024!", action: "updated" });
      } else {
        // Create godmode user
        await storage.createUser({
          id: "user-godmode",
          username: "godmode",
          password: "CSE2024!",
          role: "admin",
          fullName: "System Administrator",
          isSuperAdmin: true,
        });
        res.json({ success: true, message: "Godmode user created with password CSE2024!", action: "created" });
      }
    } catch (error) {
      console.error("Error resetting godmode user:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // If technician, get the technician record and verify linkage
      let technician = null;
      if (user.role === "technician") {
        technician = await storage.getTechnicianByUserId(user.id);
        if (!technician) {
          return res.status(400).json({ 
            error: "Technician account not properly configured. Please contact an administrator." 
          });
        }
      }

      // If salesperson, get the salesperson record and verify linkage
      let salesperson = null;
      if (user.role === "salesperson") {
        salesperson = await storage.getSalespersonByUserId(user.id);
        if (!salesperson) {
          return res.status(400).json({ 
            error: "Salesperson account not properly configured. Please contact an administrator." 
          });
        }
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        technicianId: technician?.id || null,
        salespersonId: salesperson?.id || null,
        requiresPasswordSetup: user.requiresPasswordSetup || false,
        isSuperAdmin: user.isSuperAdmin || false,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Password setup for first-time login
  app.post("/api/auth/setup-password", async (req, res) => {
    try {
      const { userId, password } = req.body;
      if (!userId || !password) {
        return res.status(400).json({ error: "User ID and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(userId, {
        password: password,
        viewablePassword: password,
        requiresPasswordSetup: false,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Password setup error:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  // Admin user management
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        viewablePassword: user.viewablePassword || null,
        requiresPasswordSetup: user.requiresPasswordSetup || false,
        isSuperAdmin: user.isSuperAdmin || false,
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const { username, fullName, role, email, phone, initialPassword, requiresPasswordSetup, isSuperAdmin } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const password = initialPassword || "temp123";
      const userRole = role || "technician";
      const newUser = await storage.createUser({
        username,
        password,
        role: userRole,
        fullName: fullName || null,
        email: email || null,
        phone: phone || null,
        isActive: true,
        viewablePassword: password,
        requiresPasswordSetup: requiresPasswordSetup !== false,
        isSuperAdmin: isSuperAdmin || false,
      });

      // If technician role, also create a technician record linked to this user
      if (userRole === "technician") {
        await storage.createTechnician({
          userId: newUser.id,
          fullName: fullName || username,
          phone: phone || "",
          email: email || null,
          status: "off_duty",
          skillLevel: "standard",
        });
      }

      // If salesperson role, also create a salesperson record linked to this user
      if (userRole === "salesperson") {
        await storage.createSalesperson({
          userId: newUser.id,
          fullName: fullName || username,
          phone: phone || "",
          email: email || null,
          status: "off_duty",
        });
      }

      res.json({
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        requiresPasswordSetup: newUser.requiresPasswordSetup,
        isSuperAdmin: newUser.isSuperAdmin,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/admin/users/:userId/reset-password", async (req, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(userId, {
        password,
        viewablePassword: password,
        requiresPasswordSetup: false,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent deletion of super admin
      if (user.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot delete super admin account" });
      }

      // Delete linked technician/salesperson record if exists
      if (user.role === "technician") {
        await storage.deleteTechnicianByUserId(userId);
      } else if (user.role === "salesperson") {
        await storage.deleteSalespersonByUserId(userId);
      }

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Technicians
  app.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });

  app.get("/api/technicians/available", async (req, res) => {
    const technicians = await storage.getAvailableTechnicians();
    res.json(technicians);
  });

  app.get("/api/technicians/:id", async (req, res) => {
    const tech = await storage.getTechnician(req.params.id);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    res.json(tech);
  });

  app.post("/api/technicians", async (req, res) => {
    const result = insertTechnicianSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const tech = await storage.createTechnician(result.data);
    res.status(201).json(tech);
  });

  app.patch("/api/technicians/:id", async (req, res) => {
    const tech = await storage.updateTechnician(req.params.id, req.body);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    res.json(tech);
  });

  // Salespersons
  app.get("/api/salespersons", async (req, res) => {
    try {
      const salespersons = await storage.getSalespersons();
      res.json(salespersons);
    } catch (error) {
      console.error("Error fetching salespersons:", error);
      res.status(500).json({ error: "Failed to fetch salespersons" });
    }
  });

  app.get("/api/salespersons/available", async (req, res) => {
    const salespersons = await storage.getAvailableSalespersons();
    res.json(salespersons);
  });

  app.get("/api/salespersons/:id", async (req, res) => {
    const sp = await storage.getSalesperson(req.params.id);
    if (!sp) return res.status(404).json({ error: "Salesperson not found" });
    res.json(sp);
  });

  app.get("/api/salespersons/:id/commissions", async (req, res) => {
    try {
      const commissions = await storage.getSalesCommissionsBySalesperson(req.params.id);
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching salesperson commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.post("/api/salespersons", async (req, res) => {
    const result = insertSalespersonSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    try {
      const sp = await storage.createSalesperson(result.data);
      res.status(201).json(sp);
    } catch (error) {
      console.error("Error creating salesperson:", error);
      res.status(500).json({ error: "Failed to create salesperson" });
    }
  });

  app.patch("/api/salespersons/:id", async (req, res) => {
    const sp = await storage.updateSalesperson(req.params.id, req.body);
    if (!sp) return res.status(404).json({ error: "Salesperson not found" });
    res.json(sp);
  });

  // Sales Commissions
  app.get("/api/sales-commissions", async (req, res) => {
    try {
      const { salespersonId, status } = req.query;
      let commissions;
      if (salespersonId) {
        commissions = await storage.getSalesCommissionsBySalesperson(salespersonId as string);
      } else if (status) {
        commissions = await storage.getSalesCommissionsByStatus(status as string);
      } else {
        commissions = await storage.getSalesCommissionsByStatus("pending");
      }
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/sales-commissions/:id", async (req, res) => {
    const commission = await storage.getSalesCommission(req.params.id);
    if (!commission) return res.status(404).json({ error: "Commission not found" });
    res.json(commission);
  });

  app.post("/api/sales-commissions/calculate/:jobId", async (req, res) => {
    try {
      const { salespersonId } = req.body;
      if (!salespersonId) {
        return res.status(400).json({ error: "salespersonId is required" });
      }
      const commission = await storage.calculateJobCommission(req.params.jobId, salespersonId);
      if (!commission) {
        return res.status(400).json({ error: "Could not calculate commission - job may not be completed or has no profit" });
      }
      res.status(201).json(commission);
    } catch (error) {
      console.error("Error calculating commission:", error);
      res.status(500).json({ error: "Failed to calculate commission" });
    }
  });

  app.patch("/api/sales-commissions/:id", async (req, res) => {
    const commission = await storage.updateSalesCommission(req.params.id, req.body);
    if (!commission) return res.status(404).json({ error: "Commission not found" });
    res.json(commission);
  });

  // Salesperson Location Tracking
  app.get("/api/salespersons/:id/locations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const locations = await storage.getSalespersonLocations(req.params.id, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching salesperson locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/salespersons/locations/all", async (req, res) => {
    try {
      const locations = await storage.getAllSalespersonsLatestLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching all salesperson locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post("/api/salespersons/:id/location", async (req, res) => {
    try {
      const { latitude, longitude, accuracy, speed, heading, altitude, batteryLevel, isMoving, leadId } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "latitude and longitude are required" });
      }
      
      const location = await storage.createSalespersonLocation({
        salespersonId: req.params.id,
        latitude: String(latitude),
        longitude: String(longitude),
        accuracy: accuracy ? String(accuracy) : null,
        speed: speed ? String(speed) : null,
        heading: heading ? String(heading) : null,
        altitude: altitude ? String(altitude) : null,
        batteryLevel: batteryLevel || null,
        isMoving: isMoving ?? null,
        leadId: leadId || null,
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating salesperson location:", error);
      res.status(500).json({ error: "Failed to save location" });
    }
  });

  // Sales Analytics
  app.get("/api/sales-analytics/:salespersonId", async (req, res) => {
    try {
      const { salespersonId } = req.params;
      const salesperson = await storage.getSalesperson(salespersonId);
      if (!salesperson) {
        return res.status(404).json({ error: "Salesperson not found" });
      }

      const commissions = await storage.getSalesCommissionsBySalesperson(salespersonId);
      const allJobs = await storage.getJobs();
      const jobs = allJobs.filter(j => j.assignedSalespersonId === salespersonId);
      const quotes = await storage.getAllQuotes();
      const salespersonQuotes = quotes.filter(q => {
        const job = allJobs.find(j => j.id === q.jobId);
        return job?.assignedSalespersonId === salespersonId;
      });

      const totalCommissionEarned = commissions
        .filter(c => c.status === "paid")
        .reduce((sum, c) => sum + parseFloat(String(c.commissionAmount || 0)), 0);
      
      const pendingCommission = commissions
        .filter(c => c.status === "pending" || c.status === "approved")
        .reduce((sum, c) => sum + parseFloat(String(c.commissionAmount || 0)), 0);
      
      const totalJobsHandled = jobs.length;
      const completedJobs = jobs.filter(j => j.status === "completed").length;
      const totalQuotesSent = salespersonQuotes.filter(q => q.status !== "draft").length;
      const acceptedQuotes = salespersonQuotes.filter(q => q.status === "accepted").length;
      const conversionRate = totalQuotesSent > 0 ? (acceptedQuotes / totalQuotesSent) * 100 : 0;
      
      const totalRevenue = jobs
        .filter(j => j.status === "completed")
        .reduce((sum, j) => sum + parseFloat(String(j.totalRevenue || 0)), 0);

      res.json({
        salesperson: {
          id: salesperson.id,
          fullName: salesperson.fullName,
          commissionRate: salesperson.commissionRate,
        },
        summary: {
          totalCommissionEarned,
          pendingCommission,
          totalJobsHandled,
          completedJobs,
          totalQuotesSent,
          acceptedQuotes,
          conversionRate: conversionRate.toFixed(1),
          totalRevenue,
        },
        recentCommissions: commissions.slice(0, 10),
        recentJobs: jobs.slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Dispatch to closest technician
  app.post("/api/dispatch/closest-technician", async (req, res) => {
    try {
      const { address, jobId, customerName, serviceType } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }
      
      const result = await dispatchToClosestTechnician(address, jobId, customerName, serviceType);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({
        success: true,
        technician: {
          id: result.technician?.technician.id,
          name: result.technician?.technician.fullName,
          phone: result.technician?.technician.phone,
          email: result.technician?.technician.email,
          distanceMiles: result.technician?.distanceMiles,
        },
        coordinates: result.coordinates,
        emailSent: result.emailSent,
      });
    } catch (error) {
      console.error("Dispatch error:", error);
      res.status(500).json({ error: "Dispatch failed" });
    }
  });

  // Leads
  app.get("/api/leads", async (req, res) => {
    try {
      const { status } = req.query;
      const leads = status 
        ? await storage.getLeadsByStatus(status as string)
        : await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  });

  // Lead scoring function
  function calculateLeadScore(lead: Partial<InsertLead>): number {
    let score = 50; // Base score
    
    // Service type scoring (emergency services = higher priority)
    const highValueServices = ["Sewer Main - Replace", "Sewer Main - Repair", "Water Heater - Replace", "Pipe Replacement"];
    const mediumValueServices = ["Sewer Main - Clear", "Water Heater - Repair", "Hydro Jetting", "Camera Inspection", "Ejector Pump", "Sump Pump"];
    const lowValueServices = ["Drain Cleaning", "Toilet Repair", "Faucet Repair"];
    
    if (lead.serviceType) {
      if (highValueServices.some(s => lead.serviceType?.includes(s))) {
        score += 25;
      } else if (mediumValueServices.some(s => lead.serviceType?.includes(s))) {
        score += 15;
      } else if (lowValueServices.some(s => lead.serviceType?.includes(s))) {
        score += 5;
      }
    }
    
    // Lead source quality scoring
    const highQualitySources = ["Direct", "Referral", "Website"];
    const mediumQualitySources = ["eLocal", "Networx"];
    const lowQualitySources = ["Thumbtack", "Angi", "HomeAdvisor", "Inquirly"];
    
    if (lead.source) {
      if (highQualitySources.includes(lead.source)) {
        score += 15;
      } else if (mediumQualitySources.includes(lead.source)) {
        score += 10;
      } else if (lowQualitySources.includes(lead.source)) {
        score += 5;
      }
    }
    
    // Priority scoring
    if (lead.priority === "urgent") {
      score += 20;
    } else if (lead.priority === "high") {
      score += 10;
    } else if (lead.priority === "low") {
      score -= 10;
    }
    
    // Chicago area zip codes get bonus (in-service area)
    const chicagoZips = ["60601", "60602", "60603", "60604", "60605", "60606", "60607", "60608", "60609", "60610", "60611", "60612", "60613", "60614", "60615", "60616", "60617", "60618", "60619", "60620", "60621", "60622", "60623", "60624", "60625", "60626", "60628", "60629", "60630", "60631", "60632", "60633", "60634", "60636", "60637", "60638", "60639", "60640", "60641", "60642", "60643", "60644", "60645", "60646", "60647", "60649", "60651", "60652", "60653", "60654", "60655", "60656", "60657", "60659", "60660", "60661"];
    
    if (lead.zipCode && chicagoZips.includes(lead.zipCode)) {
      score += 10;
    }
    
    // Cap score between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  app.post("/api/leads", async (req, res) => {
    const result = insertLeadSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    
    // Calculate lead score before creating
    const leadScore = calculateLeadScore(result.data);
    
    // Check for duplicate leads by phone number
    let isDuplicate = false;
    let duplicateOfId: string | null = null;
    
    if (result.data.customerPhone) {
      const existingLeads = await storage.findLeadsByPhone(result.data.customerPhone);
      if (existingLeads.length > 0) {
        // Find the oldest non-duplicate lead as the original
        const originalLead = existingLeads
          .filter(l => !l.isDuplicate)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        
        if (originalLead) {
          isDuplicate = true;
          duplicateOfId = originalLead.id;
        }
      }
    }
    
    const lead = await storage.createLead({ 
      ...result.data, 
      leadScore,
      isDuplicate,
      duplicateOfId,
      status: isDuplicate ? "duplicate" : (result.data.status || "new"),
    });
    
    // Notify team members about new lead (skip duplicates)
    if (!isDuplicate) {
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
    }
    
    res.status(201).json({ ...lead, wasDuplicateDetected: isDuplicate });
  });
  
  // Check for duplicate leads
  app.get("/api/leads/check-duplicate", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: "Phone number required" });
      }
      
      const existingLeads = await storage.findLeadsByPhone(phone);
      const nonDuplicates = existingLeads.filter(l => !l.isDuplicate);
      
      res.json({
        isDuplicate: nonDuplicates.length > 0,
        originalLead: nonDuplicates[0] || null,
        matchCount: existingLeads.length,
      });
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      res.status(500).json({ error: "Failed to check for duplicates" });
    }
  });
  
  // Get all duplicate leads
  app.get("/api/leads/duplicates", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const duplicates = leads.filter(l => l.isDuplicate);
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ error: "Failed to fetch duplicates" });
    }
  });

  // Customer Timeline - get all interactions by phone number
  app.get("/api/customer/timeline", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ error: "Phone number required" });
      }
      const timeline = await storage.getCustomerTimeline(phone);
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching customer timeline:", error);
      res.status(500).json({ error: "Failed to fetch customer timeline" });
    }
  });

  // Master Customer List - aggregates data from leads, jobs, quotes, calls
  app.get("/api/customers/master-list", async (req, res) => {
    try {
      // Get all data sources
      const [leads, jobs, quotes, calls] = await Promise.all([
        storage.getLeads(),
        storage.getJobs(),
        storage.getAllQuotes(),
        storage.getCalls()
      ]);

      // Build customer map keyed by normalized phone number
      const customerMap = new Map<string, {
        id: string;
        phone: string;
        name: string;
        email: string | null;
        address: string | null;
        city: string | null;
        zipCode: string | null;
        source: string | null;
        totalJobs: number;
        completedJobs: number;
        totalRevenue: number;
        totalQuotes: number;
        acceptedQuotes: number;
        totalCalls: number;
        lastServiceDate: Date | null;
        lastContactDate: Date | null;
        firstContactDate: Date | null;
        serviceTypes: string[];
        status: string;
        leadIds: string[];
        jobIds: string[];
        quoteIds: string[];
        tags: string[];
      }>();

      // Helper to normalize phone numbers for matching
      const normalizePhone = (phone: string | null | undefined): string => {
        if (!phone) return "";
        return phone.replace(/\D/g, "").slice(-10); // Last 10 digits
      };

      // Process leads
      for (const lead of leads) {
        const phone = normalizePhone(lead.customerPhone);
        if (!phone) continue;

        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            id: lead.id,
            phone: lead.customerPhone,
            name: lead.customerName,
            email: lead.customerEmail || null,
            address: lead.address || null,
            city: lead.city || null,
            zipCode: lead.zipCode || null,
            source: lead.source,
            totalJobs: 0,
            completedJobs: 0,
            totalRevenue: 0,
            totalQuotes: 0,
            acceptedQuotes: 0,
            totalCalls: 0,
            lastServiceDate: null,
            lastContactDate: lead.contactedAt ? new Date(lead.contactedAt) : null,
            firstContactDate: lead.createdAt ? new Date(lead.createdAt) : null,
            serviceTypes: lead.serviceType ? [lead.serviceType] : [],
            status: lead.status === "converted" ? "customer" : lead.status === "lost" ? "lost" : "lead",
            leadIds: [lead.id],
            jobIds: [],
            quoteIds: [],
            tags: [],
          });
        } else {
          const existing = customerMap.get(phone)!;
          existing.leadIds.push(lead.id);
          if (lead.serviceType && !existing.serviceTypes.includes(lead.serviceType)) {
            existing.serviceTypes.push(lead.serviceType);
          }
          if (lead.status === "converted") existing.status = "customer";
          if (!existing.source && lead.source) existing.source = lead.source;
          if (!existing.email && lead.customerEmail) existing.email = lead.customerEmail;
          if (!existing.address && lead.address) existing.address = lead.address;
          if (!existing.city && lead.city) existing.city = lead.city;
          const leadDate = lead.createdAt ? new Date(lead.createdAt) : null;
          if (leadDate && (!existing.firstContactDate || leadDate < existing.firstContactDate)) {
            existing.firstContactDate = leadDate;
          }
        }
      }

      // Process jobs
      for (const job of jobs) {
        const phone = normalizePhone(job.customerPhone);
        if (!phone) continue;

        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            id: job.id,
            phone: job.customerPhone,
            name: job.customerName,
            email: job.customerEmail || null,
            address: job.address,
            city: job.city || null,
            zipCode: job.zipCode || null,
            source: null,
            totalJobs: 1,
            completedJobs: job.status === "completed" ? 1 : 0,
            totalRevenue: Number(job.totalRevenue) || 0,
            totalQuotes: 0,
            acceptedQuotes: 0,
            totalCalls: 0,
            lastServiceDate: job.completedAt ? new Date(job.completedAt) : null,
            lastContactDate: job.createdAt ? new Date(job.createdAt) : null,
            firstContactDate: job.createdAt ? new Date(job.createdAt) : null,
            serviceTypes: job.serviceType ? [job.serviceType] : [],
            status: "customer",
            leadIds: [],
            jobIds: [job.id],
            quoteIds: [],
            tags: [],
          });
        } else {
          const existing = customerMap.get(phone)!;
          existing.totalJobs++;
          if (job.status === "completed") existing.completedJobs++;
          existing.totalRevenue += Number(job.totalRevenue) || 0;
          existing.jobIds.push(job.id);
          existing.status = "customer";
          if (job.serviceType && !existing.serviceTypes.includes(job.serviceType)) {
            existing.serviceTypes.push(job.serviceType);
          }
          if (!existing.email && job.customerEmail) existing.email = job.customerEmail;
          if (!existing.address && job.address) existing.address = job.address;
          if (!existing.city && job.city) existing.city = job.city;
          const completedDate = job.completedAt ? new Date(job.completedAt) : null;
          if (completedDate && (!existing.lastServiceDate || completedDate > existing.lastServiceDate)) {
            existing.lastServiceDate = completedDate;
          }
        }
      }

      // Process quotes
      for (const quote of quotes) {
        const phone = normalizePhone(quote.customerPhone);
        if (!phone) continue;

        if (customerMap.has(phone)) {
          const existing = customerMap.get(phone)!;
          existing.totalQuotes++;
          if (quote.status === "accepted") existing.acceptedQuotes++;
          existing.quoteIds.push(quote.id);
          if (!existing.email && quote.customerEmail) existing.email = quote.customerEmail;
        }
      }

      // Process calls
      for (const call of calls) {
        const phone = normalizePhone(call.callerPhone);
        if (!phone) continue;

        if (customerMap.has(phone)) {
          const existing = customerMap.get(phone)!;
          existing.totalCalls++;
          const callDate = call.createdAt ? new Date(call.createdAt) : null;
          if (callDate && (!existing.lastContactDate || callDate > existing.lastContactDate)) {
            existing.lastContactDate = callDate;
          }
        }
      }

      // Derive tags based on customer data
      for (const customer of customerMap.values()) {
        // High value customer
        if (customer.totalRevenue >= 5000) customer.tags.push("high-value");
        else if (customer.totalRevenue >= 1000) customer.tags.push("mid-value");
        
        // Repeat customer
        if (customer.completedJobs >= 2) customer.tags.push("repeat");
        
        // Recent customer (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        if (customer.lastServiceDate && customer.lastServiceDate > ninetyDaysAgo) {
          customer.tags.push("recent");
        }
        
        // Lapsed customer (no service in 1 year but was a customer)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (customer.status === "customer" && customer.lastServiceDate && customer.lastServiceDate < oneYearAgo) {
          customer.tags.push("lapsed");
        }
        
        // Has email for marketing
        if (customer.email) customer.tags.push("has-email");
      }

      // Convert to array and sort by most recent contact
      const customers = Array.from(customerMap.values())
        .sort((a, b) => {
          const dateA = a.lastContactDate?.getTime() || 0;
          const dateB = b.lastContactDate?.getTime() || 0;
          return dateB - dateA;
        });

      res.json({
        customers,
        summary: {
          totalCustomers: customers.length,
          activeCustomers: customers.filter(c => c.status === "customer").length,
          totalRevenue: customers.reduce((sum, c) => sum + c.totalRevenue, 0),
          avgRevenuePerCustomer: customers.length > 0 
            ? customers.reduce((sum, c) => sum + c.totalRevenue, 0) / customers.filter(c => c.totalRevenue > 0).length 
            : 0,
          withEmail: customers.filter(c => c.email).length,
          repeatCustomers: customers.filter(c => c.completedJobs >= 2).length,
        }
      });
    } catch (error) {
      console.error("Error fetching master customer list:", error);
      res.status(500).json({ error: "Failed to fetch master customer list" });
    }
  });
  
  // Recalculate scores for all leads
  app.post("/api/leads/recalculate-scores", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const updates = await Promise.all(
        leads.map(async (lead) => {
          const newScore = calculateLeadScore(lead);
          return storage.updateLead(lead.id, { leadScore: newScore });
        })
      );
      res.json({ message: "Scores recalculated", updated: updates.length });
    } catch (error) {
      console.error("Error recalculating scores:", error);
      res.status(500).json({ error: "Failed to recalculate scores" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const lead = await storage.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  });

  // Mark lead as contacted and check SLA
  app.post("/api/leads/:id/contact", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const now = new Date();
      const contactedAt = now;
      
      // Check if SLA was breached
      let slaBreach = false;
      if (lead.slaDeadline) {
        const deadline = new Date(lead.slaDeadline);
        slaBreach = now > deadline;
      }

      const updated = await storage.updateLead(req.params.id, {
        contactedAt,
        status: lead.status === "new" ? "contacted" : lead.status,
        slaBreach,
      });

      res.json({
        ...updated,
        slaBreached: slaBreach,
        responseTimeMinutes: lead.createdAt 
          ? Math.round((now.getTime() - new Date(lead.createdAt).getTime()) / 60000)
          : null,
      });
    } catch (error) {
      console.error("Error marking lead as contacted:", error);
      res.status(500).json({ error: "Failed to mark lead as contacted" });
    }
  });

  // Get SLA breach status for all leads
  app.get("/api/leads/sla-status", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const now = new Date();
      
      const slaStatus = leads.map(lead => {
        let status: "ok" | "warning" | "breached" | "contacted" = "ok";
        let remainingMinutes: number | null = null;
        
        if (lead.contactedAt) {
          status = "contacted";
        } else if (lead.slaDeadline) {
          const deadline = new Date(lead.slaDeadline);
          remainingMinutes = Math.round((deadline.getTime() - now.getTime()) / 60000);
          
          if (remainingMinutes <= 0) {
            status = "breached";
          } else if (remainingMinutes <= 5) {
            status = "warning";
          }
        }
        
        return {
          id: lead.id,
          status,
          remainingMinutes,
          slaDeadline: lead.slaDeadline,
          contactedAt: lead.contactedAt,
        };
      });
      
      res.json(slaStatus);
    } catch (error) {
      console.error("Error fetching SLA status:", error);
      res.status(500).json({ error: "Failed to fetch SLA status" });
    }
  });

  // Calls
  app.get("/api/calls", async (req, res) => {
    const { limit } = req.query;
    const calls = limit 
      ? await storage.getRecentCalls(parseInt(limit as string))
      : await storage.getCalls();
    res.json(calls);
  });

  app.get("/api/calls/:id", async (req, res) => {
    const call = await storage.getCall(req.params.id);
    if (!call) return res.status(404).json({ error: "Call not found" });
    res.json(call);
  });

  app.post("/api/calls", async (req, res) => {
    const result = insertCallSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const call = await storage.createCall(result.data);
    res.status(201).json(call);
  });

  app.patch("/api/calls/:id", async (req, res) => {
    try {
      // Validate and sanitize input
      const allowedFields = [
        'callerName', 'callerPhone', 'callerEmail', 'callerAddress', 'serviceType',
        'direction', 'status', 'outcome', 'duration', 'recordingUrl', 'transcription',
        'notes', 'handledBy', 'provider', 'externalId', 'scheduledCallback', 'priority',
        'leadId', 'jobId', 'quoteId'
      ];
      
      const updates: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          // Handle special types
          if (key === 'scheduledCallback' && req.body[key]) {
            updates[key] = new Date(req.body[key]);
          } else if (key === 'duration' && req.body[key]) {
            updates[key] = parseInt(req.body[key]);
          } else {
            updates[key] = req.body[key];
          }
        }
      }
      
      const call = await storage.updateCall(req.params.id, updates);
      if (!call) return res.status(404).json({ error: "Call not found" });
      res.json(call);
    } catch (error) {
      console.error("Error updating call:", error);
      res.status(500).json({ error: "Failed to update call" });
    }
  });

  app.get("/api/calls/scheduled", async (req, res) => {
    try {
      const calls = await storage.getScheduledCallbacks();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching scheduled callbacks:", error);
      res.status(500).json({ error: "Failed to fetch scheduled callbacks" });
    }
  });

  // Convert call to quote - creates a quote from call data
  app.post("/api/calls/:id/convert-to-quote", async (req, res) => {
    try {
      const call = await storage.getCall(req.params.id);
      if (!call) return res.status(404).json({ error: "Call not found" });

      // Check if already converted
      if (call.quoteId) {
        return res.status(400).json({ error: "Call already converted to quote", quoteId: call.quoteId });
      }

      // Try to extract city from address (format: "123 Main St, Chicago, IL 60601")
      let city = "";
      if (call.callerAddress) {
        const parts = call.callerAddress.split(",").map(p => p.trim());
        if (parts.length >= 2) {
          city = parts[1]; // Usually the second part is the city
        }
      }

      // Create a quote with the call's customer info
      const quote = await storage.createQuote({
        customerName: call.callerName || "Unknown Caller",
        customerPhone: call.callerPhone,
        customerEmail: call.callerEmail || undefined,
        address: call.callerAddress || "",
        city: city || undefined,
        serviceType: call.serviceType || "general",
        status: "draft",
        notes: call.notes ? `${call.notes}\n\nConverted from call ${call.id.slice(0, 8)}` : `Converted from call ${call.id.slice(0, 8)}`,
        lineItems: "[]",
        laborEntries: "[]",
        subtotal: "0",
        laborTotal: "0",
        taxRate: "0.1025",
        taxAmount: "0",
        total: "0",
      });

      // Link the quote to the call
      await storage.updateCall(call.id, { 
        quoteId: quote.id, 
        outcome: "quoted" 
      });

      res.status(201).json(quote);
    } catch (error) {
      console.error("Error converting call to quote:", error);
      res.status(500).json({ error: "Failed to convert call to quote" });
    }
  });

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      const { status, technicianId } = req.query;
      let jobs;
      if (technicianId) {
        jobs = await storage.getJobsByTechnician(technicianId as string);
      } else if (status) {
        jobs = await storage.getJobsByStatus(status as string);
      } else {
        jobs = await storage.getJobs();
      }
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/pool", async (req, res) => {
    try {
      const { technicianId } = req.query;
      if (!technicianId) {
        return res.status(400).json({ error: "technicianId required" });
      }
      const jobs = await storage.getPoolJobs(technicianId as string);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching pool jobs:", error);
      res.status(500).json({ error: "Failed to fetch pool jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      // Convert ISO date strings to Date objects for validation
      const body = { ...req.body };
      if (body.scheduledDate && typeof body.scheduledDate === 'string') {
        body.scheduledDate = new Date(body.scheduledDate);
      }
      // Handle timestamp fields that might come as strings
      const timestampFields = ['assignedAt', 'confirmedAt', 'enRouteAt', 'arrivedAt', 'startedAt', 'completedAt', 'cancelledAt'];
      timestampFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      });
      
      const result = insertJobSchema.safeParse(body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const job = await storage.createJob(result.data);
      
      // Notify office about new job
      notifyJobCreated(job).catch(err => 
        console.error(`Job creation notification failed for job ${job.id}:`, err)
      );
      
      // Push job to Builder 1 for SEO content tracking
      const lead = job.leadId ? await storage.getLead(job.leadId) : undefined;
      pushJobToBuilder1(job, lead, "job_created").catch(err => {
        console.error(`[Builder1] Failed to push job_created for job ${job.id}:`, err);
      });
      
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      // Convert timestamp strings to Date objects
      const body = { ...req.body };
      const timestampFields = ['assignedAt', 'confirmedAt', 'enRouteAt', 'arrivedAt', 'startedAt', 'completedAt', 'cancelledAt'];
      timestampFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      });
      if (body.scheduledDate && typeof body.scheduledDate === 'string') {
        body.scheduledDate = new Date(body.scheduledDate);
      }
      
      const job = await storage.updateJob(req.params.id, body);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  // Job claim (tech picks from pool)
  app.post("/api/jobs/:id/claim", async (req, res) => {
    try {
      const { technicianId } = req.body;
      if (!technicianId) {
        return res.status(400).json({ error: "technicianId required" });
      }
      
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      if (job.status !== "pending" || job.assignedTechnicianId) {
        return res.status(400).json({ error: "Job is no longer available" });
      }
      
      const tech = await storage.getTechnician(technicianId);
      if (!tech) return res.status(404).json({ error: "Technician not found" });
      
      const approvedTypes = tech.approvedJobTypes || [];
      if (approvedTypes.length > 0 && !approvedTypes.includes(job.serviceType)) {
        return res.status(403).json({ error: "You are not approved for this job type" });
      }
      
      const now = new Date();
      const updated = await storage.updateJob(req.params.id, {
        assignedTechnicianId: technicianId,
        status: "assigned",
        assignedAt: now,
      });
      
      await storage.createJobTimelineEvent({
        jobId: req.params.id,
        eventType: "assigned",
        description: `Claimed by ${tech.fullName}`,
        createdBy: technicianId,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error claiming job:", error);
      res.status(500).json({ error: "Failed to claim job" });
    }
  });

  // Job assignment workflow
  app.post("/api/jobs/:id/assign", async (req, res) => {
    const { technicianId, dispatcherId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const tech = await storage.getTechnician(technicianId);
    if (!tech) return res.status(404).json({ error: "Technician not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      assignedTechnicianId: technicianId,
      dispatcherId,
      status: "assigned",
      assignedAt: now,
    });
    
    // Create timeline event
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "assigned",
      description: `Assigned to ${tech.fullName}`,
      createdBy: dispatcherId,
    });
    
    // Create notification for technician
    if (tech.userId) {
      await storage.createNotification({
        userId: tech.userId,
        type: "job_assigned",
        title: "New Job Assigned",
        message: `You have been assigned to ${job.serviceType} at ${job.address}`,
        jobId: req.params.id,
        actionUrl: `/technician/jobs/${req.params.id}`,
      });
    }
    
    // Send email notification to technician
    notifyJobAssigned(updated!, tech.fullName).catch(err => 
      console.error(`Job assignment notification failed for job ${req.params.id}:`, err)
    );
    
    res.json(updated);
  });

  // Create job lead fee (technician accepts lead fee)
  app.post("/api/job-lead-fees", async (req, res) => {
    try {
      const { jobId, technicianId, amount } = req.body;
      
      if (!jobId || !technicianId) {
        return res.status(400).json({ error: "jobId and technicianId are required" });
      }
      
      const fee = await storage.createJobLeadFee({
        jobId,
        technicianId,
        amount: amount || "125",
        acceptedAt: new Date(),
      });
      
      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId,
        eventType: "note",
        description: `Technician accepted $${amount || "125"} lead fee`,
        createdBy: technicianId,
      });
      
      res.json(fee);
    } catch (error) {
      console.error("Error creating job lead fee:", error);
      res.status(500).json({ error: "Failed to create job lead fee" });
    }
  });

  app.post("/api/jobs/:id/confirm", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "confirmed",
      confirmedAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "confirmed",
      description: "Technician confirmed assignment",
      createdBy: technicianId,
    });
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/en-route", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "en_route",
      enRouteAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "en_route",
      description: "Technician en route to job",
      createdBy: technicianId,
    });
    
    // Update technician status
    if (technicianId) {
      await storage.updateTechnician(technicianId, { 
        status: "busy",
        currentJobId: req.params.id,
      });
    }
    
    // Notify dispatchers of tech status change
    let techName = "Technician";
    if (technicianId) {
      const tech = await storage.getTechnician(technicianId);
      if (tech) techName = tech.name || tech.fullName || "Technician";
    }
    notifyDispatchersOfStatusChange(req.params.id, job, techName, "en_route").catch(err =>
      console.error(`Dispatcher notification failed for job ${req.params.id} en_route:`, err)
    );
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/arrive", async (req, res) => {
    const { technicianId, latitude, longitude } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    let arrivalVerified: boolean | null = null;
    let arrivalDistance: number | null = null;
    
    const hasValidTechLocation = latitude !== undefined && latitude !== null;
    const hasValidJobLocation = job.latitude !== undefined && job.latitude !== null && 
                                job.longitude !== undefined && job.longitude !== null;
    
    if (hasValidTechLocation && hasValidJobLocation) {
      const result = isWithinRadius(
        latitude,
        longitude,
        parseFloat(job.latitude!),
        parseFloat(job.longitude!)
      );
      arrivalVerified = result.isWithin;
      arrivalDistance = result.distance;
    }
    
    const updated = await storage.updateJob(req.params.id, {
      status: "on_site",
      arrivedAt: now,
      arrivalLat: hasValidTechLocation ? String(latitude) : null,
      arrivalLng: hasValidTechLocation ? String(longitude) : null,
      arrivalVerified,
      arrivalDistance: arrivalDistance !== null ? String(arrivalDistance) : null,
    });
    
    const locationInfo = arrivalVerified !== null
      ? ` (${arrivalVerified ? "Location verified" : "Location not verified"} - ${arrivalDistance}m from job site)`
      : "";
    
    const metadata: Record<string, unknown> = {};
    if (hasValidTechLocation) {
      metadata.latitude = latitude;
      metadata.longitude = longitude;
    }
    if (arrivalVerified !== null) {
      metadata.arrivalVerified = arrivalVerified;
      metadata.arrivalDistance = arrivalDistance;
    }
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "arrived",
      description: `Technician arrived at job site${locationInfo}`,
      createdBy: technicianId,
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
    });
    
    // Notify dispatchers of tech status change
    let techName = "Technician";
    if (technicianId) {
      const tech = await storage.getTechnician(technicianId);
      if (tech) techName = tech.name || tech.fullName || "Technician";
    }
    notifyDispatchersOfStatusChange(req.params.id, job, techName, "arrived").catch(err =>
      console.error(`Dispatcher notification failed for job ${req.params.id} arrived:`, err)
    );
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/start", async (req, res) => {
    const { technicianId } = req.body;
    const job = await storage.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const now = new Date();
    const updated = await storage.updateJob(req.params.id, {
      status: "in_progress",
      startedAt: now,
    });
    
    await storage.createJobTimelineEvent({
      jobId: req.params.id,
      eventType: "started",
      description: "Work started",
      createdBy: technicianId,
    });
    
    // Notify technician email that job is now in progress
    if (technicianId) {
      const tech = await storage.getTechnician(technicianId);
      notifyJobApproved(updated!, tech?.fullName).catch(err => 
        console.error(`Job in-progress notification failed for job ${req.params.id}:`, err)
      );
    }
    
    res.json(updated);
  });

  app.post("/api/jobs/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { technicianId, laborHours, materialsCost, travelExpense, equipmentCost, otherExpenses, expenseNotes, totalRevenue } = req.body;

      // Use automation service to complete job with cost calculation
      const result = await completeJob(id, {
        laborHours,
        materialsCost,
        travelExpense,
        equipmentCost,
        otherExpenses,
        expenseNotes,
        totalRevenue,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: id,
        eventType: "completed",
        description: "Job completed",
        createdBy: technicianId,
      });

      // Update technician status and get tech name for notification
      let techName = "Technician";
      if (technicianId) {
        const tech = await storage.getTechnician(technicianId);
        if (tech) {
          techName = tech.name || tech.fullName || "Technician";
          await storage.updateTechnician(technicianId, { 
            status: "available",
            currentJobId: null,
            completedJobsToday: (tech.completedJobsToday || 0) + 1,
          });
        }
      }

      // Return updated job
      const job = await storage.getJob(id);
      
      // Notify dispatchers of job completion
      if (job) {
        notifyDispatchersOfStatusChange(id, job, techName, "completed").catch(err =>
          console.error(`Dispatcher notification failed for job ${id} completed:`, err)
        );
      }
      
      res.json(job);
    } catch (error) {
      console.error("Complete job error:", error);
      res.status(500).json({ error: "Failed to complete job" });
    }
  });

  // Job Timeline
  app.get("/api/jobs/:id/timeline", async (req, res) => {
    const events = await storage.getJobTimelineEvents(req.params.id);
    res.json(events);
  });

  app.post("/api/jobs/:id/timeline", async (req, res) => {
    const result = insertJobTimelineEventSchema.safeParse({
      ...req.body,
      jobId: req.params.id,
    });
    if (!result.success) return res.status(400).json({ error: result.error });
    const event = await storage.createJobTimelineEvent(result.data);
    res.status(201).json(event);
  });

  // Quotes
  app.get("/api/quotes", async (req, res) => {
    try {
      const { jobId, status } = req.query;
      if (jobId) {
        const quotes = await storage.getQuotesByJob(jobId as string);
        res.json(quotes);
      } else if (status) {
        const quotes = await storage.getQuotesByStatus(status as string);
        res.json(quotes);
      } else {
        const quotes = await storage.getAllQuotes();
        res.json(quotes);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    const quote = await storage.getQuote(req.params.id);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json(quote);
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      // Convert ISO date strings to Date objects
      const body = { ...req.body };
      const dateFields = ['sentAt', 'viewedAt', 'acceptedAt', 'declinedAt', 'expiresAt'];
      dateFields.forEach(field => {
        if (body[field] && typeof body[field] === 'string') {
          body[field] = new Date(body[field]);
        }
      });
      
      const result = insertQuoteSchema.safeParse(body);
      if (!result.success) return res.status(400).json({ error: result.error });
      
      // Generate public token if status is 'sent'
      if (result.data.status === 'sent') {
        result.data.publicToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      }
      
      const quote = await storage.createQuote(result.data);
      
      // Create timeline event only if linked to a job
      if (result.data.jobId) {
        await storage.createJobTimelineEvent({
          jobId: result.data.jobId,
          eventType: "quote_sent",
          description: `Quote created for $${result.data.total}`,
          createdBy: result.data.technicianId || undefined,
        });
      }
      
      // Notify office about new quote
      notifyQuoteCreated({
        id: quote.id,
        customerName: quote.customerName,
        jobId: quote.jobId ?? undefined,
        total: quote.total ?? "0",
      }).catch(err => 
        console.error(`Quote notification failed for quote ${quote.id}:`, err)
      );
      
      // Send email to customer if status is 'sent' and email is provided
      if (result.data.status === 'sent' && result.data.customerEmail && quote.publicToken) {
        const baseUrl = process.env.APP_BASE_URL || 'https://chicagosewerexpertsapp.com';
        const quoteUrl = `${baseUrl}/quote/${quote.publicToken}`;
        
        // Parse line items for email
        let lineItemsArray: Array<{ description: string; total: number }> = [];
        try {
          if (quote.lineItems) {
            const parsed = typeof quote.lineItems === 'string' ? JSON.parse(quote.lineItems) : quote.lineItems;
            lineItemsArray = Array.isArray(parsed) ? parsed.map((item: any) => ({
              description: item.description || item.customDescription || 'Service',
              amount: parseFloat(item.total || item.price || 0)
            })) : [];
          }
        } catch (e) {
          console.warn('Failed to parse quote lineItems for email:', e);
        }
        
        const quoteTotal = parseFloat(quote.total?.toString() || '0');
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        
        // Build custom email with link to accept/decline
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
              <h1 style="color: #3b82f6; margin: 0;">Emergency Chicago Sewer Experts</h1>
              <p style="color: #9ca3af; margin: 5px 0 0 0;">Your Service Quote</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #111827; margin-top: 0;">Hello ${quote.customerName},</h2>
              
              <p style="color: #374151; line-height: 1.6;">
                Thank you for choosing Emergency Chicago Sewer Experts! Here is your quote for the requested services.
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #111827; margin-top: 0;">Quote Details:</h3>
                <p style="color: #374151; margin: 5px 0;"><strong>Address:</strong> ${quote.address}</p>
                <p style="color: #374151; margin: 5px 0;"><strong>Total:</strong> $${quoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p style="color: #374151; margin: 5px 0;"><strong>Valid Until:</strong> ${validUntil}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${quoteUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View & Accept Quote
                </a>
              </div>
              
              <p style="color: #374151; line-height: 1.6;">
                Click the button above to view the full quote details, line items, and accept or decline the quote online.
              </p>
              
              <p style="color: #374151; line-height: 1.6;">
                If you have any questions, call us at <strong>(630) 716-9792</strong>.
              </p>
              
              <p style="color: #374151; line-height: 1.6;">
                Best regards,<br>
                <strong>Emergency Chicago Sewer Experts Team</strong>
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Emergency Chicago Sewer Experts | Chicago, IL | (630) 716-9792
              </p>
            </div>
          </div>
        `;
        
        const emailText = `
Hello ${quote.customerName},

Thank you for choosing Emergency Chicago Sewer Experts! Here is your quote.

Quote Details:
- Address: ${quote.address}
- Total: $${quoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Valid Until: ${validUntil}

View and accept your quote here: ${quoteUrl}

If you have any questions, call us at (630) 716-9792.

Best regards,
Emergency Chicago Sewer Experts Team
        `;
        
        // Send the email
        sendEmail({
          to: result.data.customerEmail,
          subject: `Your Quote from Emergency Chicago Sewer Experts - $${quoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          html: emailHtml,
          text: emailText,
        }).then(emailResult => {
          if (emailResult.success) {
            console.log(`Quote email sent successfully to ${result.data.customerEmail} for quote ${quote.id}`);
          } else {
            console.error(`Failed to send quote email to ${result.data.customerEmail}:`, emailResult.error);
          }
        }).catch(err => {
          console.error(`Quote email error for ${quote.id}:`, err);
        });
      }
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const updates = { ...req.body };
      const dateFields = ['sentAt', 'viewedAt', 'acceptedAt', 'declinedAt', 'expiresAt'];
      dateFields.forEach(field => {
        if (updates[field] && typeof updates[field] === 'string') {
          updates[field] = new Date(updates[field]);
        }
      });
      
      // Get original quote to check status change
      const originalQuote = await storage.getQuote(req.params.id);
      if (!originalQuote) return res.status(404).json({ error: "Quote not found" });
      
      // Update the quote
      const quote = await storage.updateQuote(req.params.id, updates);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // If status changed to 'accepted', automatically create a job
      if (updates.status === 'accepted' && originalQuote.status !== 'accepted') {
        // Parse lineItems if it's a string
        let lineItemsArray: Array<{description?: string}> = [];
        if (quote.lineItems) {
          try {
            const parsed = typeof quote.lineItems === 'string' 
              ? JSON.parse(quote.lineItems) 
              : quote.lineItems;
            lineItemsArray = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse quote lineItems:', e);
            lineItemsArray = [];
          }
        }
        
        // Validate required fields before creating job
        if (!quote.customerName || !quote.address) {
          return res.status(400).json({ 
            error: "Cannot create job: quote is missing required customer name or address" 
          });
        }
        
        const jobData = {
          customerName: quote.customerName,
          customerPhone: quote.customerPhone || 'No phone provided',
          customerEmail: quote.customerEmail || undefined,
          address: quote.address,
          serviceType: lineItemsArray?.[0]?.description || 'Sewer Service',
          description: `Job created from accepted quote #${quote.id.substring(0, 8)}`,
          status: 'pending',
          priority: 'normal',
        };
        
        const newJob = await storage.createJob(jobData);
        console.log(`Job ${newJob.id} created from accepted quote ${quote.id}`);
        
        // Update quote with job link
        await storage.updateQuote(quote.id, { jobId: newJob.id });
        
        // Create timeline event
        await storage.createJobTimelineEvent({
          jobId: newJob.id,
          eventType: 'job_created',
          description: `Job created from accepted quote. Total: $${quote.total}`,
        });
        
        return res.json({ quote, job: newJob });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Generate public link token for a quote
  app.post("/api/quotes/:id/generate-link", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Generate a unique token if not already present
      const token = quote.publicToken || crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      // Also update status to 'sent' if still in draft, so customer can take action
      const updates: Record<string, unknown> = { publicToken: token };
      if (quote.status === 'draft') {
        updates.status = 'sent';
        updates.sentAt = new Date();
      }
      const updatedQuote = await storage.updateQuote(req.params.id, updates);
      
      res.json({ 
        token, 
        publicUrl: `/quote/${token}`,
        quote: updatedQuote 
      });
    } catch (error) {
      console.error("Error generating quote link:", error);
      res.status(500).json({ error: "Failed to generate quote link" });
    }
  });

  // Resend quote email to customer
  app.post("/api/quotes/:id/resend-email", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      if (!quote.customerEmail) {
        return res.status(400).json({ error: "Quote has no customer email" });
      }
      
      // Generate token if needed
      let token = quote.publicToken;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
        await storage.updateQuote(quote.id, { publicToken: token, status: 'sent', sentAt: new Date() });
      }
      
      const baseUrl = process.env.APP_BASE_URL || 'https://chicagosewerexpertsapp.com';
      const quoteUrl = `${baseUrl}/quote/${token}`;
      const quoteTotal = parseFloat(quote.total?.toString() || '0');
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #111827; padding: 20px; text-align: center;">
            <h1 style="color: #3b82f6; margin: 0;">Emergency Chicago Sewer Experts</h1>
            <p style="color: #9ca3af; margin: 5px 0 0 0;">Your Service Quote</p>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #111827; margin-top: 0;">Hello ${quote.customerName},</h2>
            
            <p style="color: #374151; line-height: 1.6;">
              Thank you for choosing Emergency Chicago Sewer Experts! Here is your quote for the requested services.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #111827; margin-top: 0;">Quote Details:</h3>
              <p style="color: #374151; margin: 5px 0;"><strong>Address:</strong> ${quote.address}</p>
              <p style="color: #374151; margin: 5px 0;"><strong>Total:</strong> $${quoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p style="color: #374151; margin: 5px 0;"><strong>Valid Until:</strong> ${validUntil}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${quoteUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View & Accept Quote
              </a>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              Click the button above to view the full quote details and accept or decline online.
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              Questions? Call us at <strong>(630) 716-9792</strong>.
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              Best regards,<br>
              <strong>Emergency Chicago Sewer Experts Team</strong>
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Emergency Chicago Sewer Experts | Chicago, IL | (630) 716-9792
            </p>
          </div>
        </div>
      `;
      
      const emailText = `
Hello ${quote.customerName},

Your quote from Emergency Chicago Sewer Experts is ready!

Quote Details:
- Address: ${quote.address}
- Total: $${quoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Valid Until: ${validUntil}

View and accept your quote here: ${quoteUrl}

Questions? Call us at (630) 716-9792.

Best regards,
Emergency Chicago Sewer Experts Team
      `;
      
      const emailResult = await sendEmail({
        to: quote.customerEmail,
        subject: `Your Quote from Emergency Chicago Sewer Experts - $${quoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        html: emailHtml,
        text: emailText,
      });
      
      if (emailResult.success) {
        console.log(`Quote email resent to ${quote.customerEmail} for quote ${quote.id}`);
        res.json({ success: true, message: `Email sent to ${quote.customerEmail}` });
      } else {
        console.error(`Failed to resend quote email:`, emailResult.error);
        res.status(500).json({ error: emailResult.error || 'Failed to send email' });
      }
    } catch (error) {
      console.error("Error resending quote email:", error);
      res.status(500).json({ error: "Failed to resend quote email" });
    }
  });

  // Public quote viewing endpoint (no auth required)
  app.get("/api/public/quote/:token", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Mark as viewed if first time viewing
      if (!quote.viewedAt) {
        await storage.updateQuote(quote.id, { viewedAt: new Date(), status: 'viewed' });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Public quote accept/decline actions
  app.post("/api/public/quote/:token/accept", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Parse consent from request body
      const { consent } = req.body as {
        consent?: {
          smsOptIn?: boolean;
          emailOptIn?: boolean;
          smsOwnershipConfirmed?: boolean;
          emailOwnershipConfirmed?: boolean;
          disclosureVersion?: string;
          disclosureText?: string;
        };
      };
      
      // Validate consent: if opted in, ownership must be confirmed
      if (consent?.smsOptIn && !consent?.smsOwnershipConfirmed) {
        return res.status(400).json({ 
          error: "SMS opt-in requires phone number ownership confirmation" 
        });
      }
      if (consent?.emailOptIn && !consent?.emailOwnershipConfirmed) {
        return res.status(400).json({ 
          error: "Email opt-in requires email address ownership confirmation" 
        });
      }
      
      // Capture audit metadata
      const consentAt = new Date();
      const forwardedFor = req.headers["x-forwarded-for"];
      const consentIp = typeof forwardedFor === 'string' 
        ? forwardedFor.split(',')[0].trim() 
        : (req.socket?.remoteAddress || null);
      const consentUserAgent = req.headers["user-agent"] || null;
      
      // Update quote status to accepted
      const updatedQuote = await storage.updateQuote(quote.id, { 
        status: 'accepted', 
        acceptedAt: new Date() 
      });
      
      // When quote is accepted, automatically create a job
      // Parse lineItems if it's a string
      let lineItemsArray: Array<{description?: string}> = [];
      if (quote.lineItems) {
        try {
          const parsed = typeof quote.lineItems === 'string' 
            ? JSON.parse(quote.lineItems) 
            : quote.lineItems;
          lineItemsArray = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.warn('Failed to parse quote lineItems:', e);
          lineItemsArray = [];
        }
      }
      
      // Validate required fields before creating job
      if (!quote.customerName || !quote.address) {
        return res.status(400).json({ 
          error: "Cannot create job: quote is missing required customer name or address" 
        });
      }
      
      // Build job data - only include consent fields if consent was provided
      // Absent consent means customer never interacted with consent UI (legacy behavior preserved)
      const hasConsent = consent !== undefined && (consent.smsOptIn || consent.emailOptIn);
      
      const jobData: Record<string, unknown> = {
        customerName: quote.customerName,
        customerPhone: quote.customerPhone || 'No phone provided',
        customerEmail: quote.customerEmail || undefined,
        address: quote.address,
        serviceType: lineItemsArray?.[0]?.description || 'Sewer Service',
        description: `Job created from accepted quote #${quote.id.substring(0, 8)}`,
        status: 'pending',
        priority: 'normal',
        quoteId: quote.id, // Link job back to quote for customer portal access
      };
      
      // Only set consent fields if customer explicitly opted in to at least one channel
      // This preserves null for legacy jobs (allowing backward-compatible messaging)
      if (hasConsent) {
        Object.assign(jobData, {
          customerConsentSmsOptIn: consent.smsOptIn || false,
          customerConsentEmailOptIn: consent.emailOptIn || false,
          customerConsentSmsOwnershipConfirmed: consent.smsOwnershipConfirmed || false,
          customerConsentEmailOwnershipConfirmed: consent.emailOwnershipConfirmed || false,
          customerConsentAt: consentAt,
          customerConsentIp: consentIp,
          customerConsentUserAgent: consentUserAgent,
          customerConsentDisclosureVersion: consent.disclosureVersion || null,
          customerConsentDisclosureText: consent.disclosureText || null,
          customerConsentSource: 'public_quote_accept',
        });
      }
      // If no consent provided, all consent fields remain null (legacy behavior)
      
      const newJob = await storage.createJob(jobData as any);
      console.log(`Job ${newJob.id} created from accepted quote ${quote.id}`);
      
      // Link the quote to the newly created job if not already linked
      if (!quote.jobId) {
        await storage.updateQuote(quote.id, { jobId: newJob.id });
      }
      
      // Create job timeline event
      await storage.createJobTimelineEvent({
        jobId: newJob.id,
        eventType: 'job_created',
        description: `Job created from accepted quote. Total: $${quote.total}`,
      });
      
      // Note: Automated notifications (48hr, 24hr, day-of reminders) 
      // will be triggered by the automation service when the job gets scheduled
      
      res.json({ quote: updatedQuote, job: newJob });
    } catch (error) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ error: "Failed to accept quote" });
    }
  });

  app.post("/api/public/quote/:token/decline", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      const updatedQuote = await storage.updateQuote(quote.id, { 
        status: 'declined', 
        declinedAt: new Date() 
      });
      
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error declining quote:", error);
      res.status(500).json({ error: "Failed to decline quote" });
    }
  });

  // ============================================
  // JOB MESSAGES (INTERNAL + CUSTOMER CHAT)
  // ============================================

  // GET job messages (internal - requires auth)
  app.get("/api/jobs/:id/messages", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      // Authorization: technicians can only access their assigned jobs
      if (user.role === 'technician') {
        const technician = await storage.getTechnicianByUserId(user.id);
        if (!technician || job.assignedTechnicianId !== technician.id) {
          return res.status(403).json({ error: "Access denied - not assigned to this job" });
        }
      }
      
      const audience = req.query.audience as 'internal' | 'customer' | 'all' | undefined;
      const messages = await storage.getJobMessages(job.id, audience || 'all');
      res.json(messages);
    } catch (error) {
      console.error("Error fetching job messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // POST job message (internal - requires auth)
  app.post("/api/jobs/:id/messages", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      // Authorization: technicians can only message their assigned jobs
      if (user.role === 'technician') {
        const technician = await storage.getTechnicianByUserId(user.id);
        if (!technician || job.assignedTechnicianId !== technician.id) {
          return res.status(403).json({ error: "Access denied - not assigned to this job" });
        }
      }
      
      const { audience, body } = req.body as { audience: 'internal' | 'customer'; body: string };
      
      // Validate body
      const trimmedBody = (body || '').trim();
      if (!trimmedBody || trimmedBody.length < 1 || trimmedBody.length > 4000) {
        return res.status(400).json({ error: "Message body must be 1-4000 characters" });
      }
      
      // Validate audience
      if (!['internal', 'customer'].includes(audience)) {
        return res.status(400).json({ error: "Invalid audience - must be 'internal' or 'customer'" });
      }
      
      // Determine sender type from user role
      const senderType = user.role as 'dispatcher' | 'technician' | 'admin';
      
      // Create message
      const message = await storage.createJobMessage({
        jobId: job.id,
        audience,
        senderType,
        senderUserId: user.id,
        body: trimmedBody,
        meta: {},
      });
      
      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: job.id,
        eventType: audience === 'customer' ? 'customer_message' : 'message',
        description: `Message sent (${audience})`,
        createdBy: user.id,
        metadata: JSON.stringify({ messageId: message.id }),
      });
      
      // Notify other staff members (exclude sender)
      const recipientUserIds: string[] = [];
      
      // Always notify dispatcher if exists and not sender
      if (job.dispatcherId && job.dispatcherId !== user.id) {
        recipientUserIds.push(job.dispatcherId);
      }
      
      // Notify assigned technician if exists and not sender
      if (job.assignedTechnicianId) {
        const technician = await storage.getTechnician(job.assignedTechnicianId);
        if (technician?.userId && technician.userId !== user.id) {
          recipientUserIds.push(technician.userId);
        }
      }
      
      // If no dispatcher assigned, notify all dispatchers/admins
      if (!job.dispatcherId) {
        const users = await storage.getUsers();
        for (const u of users) {
          if ((u.role === 'dispatcher' || u.role === 'admin') && u.id !== user.id) {
            recipientUserIds.push(u.id);
          }
        }
      }
      
      // Create notifications
      for (const recipientId of [...new Set(recipientUserIds)]) {
        await storage.createNotification({
          userId: recipientId,
          type: 'message',
          title: `New ${audience} message`,
          message: `${user.fullName || user.username} sent a message on job ${job.customerName}`,
          jobId: job.id,
          actionUrl: `/jobs?jobId=${job.id}`,
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating job message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // PUBLIC: Get job ID from quote token
  app.get("/api/public/quote/:token/job", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Find job linked to this quote
      const job = await storage.getJobByQuoteId(quote.id);
      if (!job) return res.status(404).json({ error: "No job found for this quote" });
      
      res.json({ jobId: job.id });
    } catch (error) {
      console.error("Error fetching job by quote token:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // PUBLIC: Get customer messages via quote token
  app.get("/api/public/quote/:token/messages", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Require quote to be accepted for messaging
      if (quote.status !== 'accepted') {
        return res.status(403).json({ error: "Messaging is only available for accepted quotes" });
      }
      
      const job = await storage.getJobByQuoteId(quote.id);
      if (!job) return res.status(404).json({ error: "No job found for this quote" });
      
      // Only return customer-audience messages
      const messages = await storage.getJobMessages(job.id, 'customer');
      res.json(messages);
    } catch (error) {
      console.error("Error fetching customer messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // PUBLIC: Create customer message via quote token
  app.post("/api/public/quote/:token/messages", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ error: "Quote not found" });
      
      // Require quote to be accepted for messaging
      if (quote.status !== 'accepted') {
        return res.status(403).json({ error: "Messaging is only available for accepted quotes" });
      }
      
      const job = await storage.getJobByQuoteId(quote.id);
      if (!job) return res.status(404).json({ error: "No job found for this quote" });
      
      const { body } = req.body as { body: string };
      
      // Validate body
      const trimmedBody = (body || '').trim();
      if (!trimmedBody || trimmedBody.length < 1 || trimmedBody.length > 4000) {
        return res.status(400).json({ error: "Message body must be 1-4000 characters" });
      }
      
      // Capture IP and user agent for audit
      const forwardedFor = req.headers["x-forwarded-for"];
      const ip = typeof forwardedFor === 'string' 
        ? forwardedFor.split(',')[0].trim() 
        : (req.socket?.remoteAddress || null);
      const userAgent = req.headers["user-agent"] || null;
      
      // Create customer message
      const message = await storage.createJobMessage({
        jobId: job.id,
        audience: 'customer',
        senderType: 'customer',
        senderUserId: null,
        body: trimmedBody,
        meta: { ip, userAgent },
      });
      
      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: job.id,
        eventType: 'customer_message',
        description: 'Customer sent a message',
        metadata: JSON.stringify({ messageId: message.id }),
      });
      
      // Notify dispatcher and assigned technician
      const recipientUserIds: string[] = [];
      
      if (job.dispatcherId) {
        recipientUserIds.push(job.dispatcherId);
      }
      
      if (job.assignedTechnicianId) {
        const technician = await storage.getTechnician(job.assignedTechnicianId);
        if (technician?.userId) {
          recipientUserIds.push(technician.userId);
        }
      }
      
      // If no dispatcher, notify all dispatchers/admins
      if (!job.dispatcherId) {
        const users = await storage.getUsers();
        for (const u of users) {
          if (u.role === 'dispatcher' || u.role === 'admin') {
            recipientUserIds.push(u.id);
          }
        }
      }
      
      // Create notifications
      for (const recipientId of [...new Set(recipientUserIds)]) {
        await storage.createNotification({
          userId: recipientId,
          type: 'message',
          title: 'New customer message',
          message: `Customer ${job.customerName} sent a message`,
          jobId: job.id,
          actionUrl: `/jobs?jobId=${job.id}`,
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating customer message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Quote Templates
  app.get("/api/quote-templates", async (req, res) => {
    try {
      const templates = await storage.getQuoteTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates:", error);
      res.status(500).json({ error: "Failed to fetch quote templates" });
    }
  });

  app.get("/api/quote-templates/service/:serviceType", async (req, res) => {
    try {
      const templates = await storage.getQuoteTemplatesByServiceType(req.params.serviceType);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates by service:", error);
      res.status(500).json({ error: "Failed to fetch quote templates" });
    }
  });

  app.get("/api/quote-templates/:id", async (req, res) => {
    const template = await storage.getQuoteTemplate(req.params.id);
    if (!template) return res.status(404).json({ error: "Quote template not found" });
    res.json(template);
  });

  app.post("/api/quote-templates", async (req, res) => {
    try {
      const result = insertQuoteTemplateSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const template = await storage.createQuoteTemplate(result.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating quote template:", error);
      res.status(500).json({ error: "Failed to create quote template" });
    }
  });

  app.patch("/api/quote-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateQuoteTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Quote template not found" });
      res.json(template);
    } catch (error) {
      console.error("Error updating quote template:", error);
      res.status(500).json({ error: "Failed to update quote template" });
    }
  });

  app.delete("/api/quote-templates/:id", async (req, res) => {
    const success = await storage.deleteQuoteTemplate(req.params.id);
    if (!success) return res.status(404).json({ error: "Quote template not found" });
    res.json({ success: true });
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId, unread } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });
      
      const notifications = unread === "true"
        ? await storage.getUnreadNotifications(userId as string)
        : await storage.getNotificationsByUser(userId as string);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    const result = insertNotificationSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    const notification = await storage.createNotification(result.data);
    res.status(201).json(notification);
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const notification = await storage.markNotificationRead(req.params.id);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // Data Export
  app.get("/api/export", async (req, res) => {
    try {
      const { format } = req.query;
      
      // Gather all data
      const [leads, jobs, technicians, quotes] = await Promise.all([
        storage.getLeads(),
        storage.getJobs(),
        storage.getTechnicians(),
        storage.getAllQuotes(),
      ]);

      // Format data for export
      const exportData = {
        leads: leads.map(l => ({
          id: l.id,
          name: l.customerName,
          phone: l.customerPhone,
          email: l.customerEmail || '',
          address: l.address || '',
          city: l.city || '',
          zip: l.zipCode || '',
          source: l.source,
          status: l.status,
          service: l.serviceType || '',
          leadCost: Number(l.cost) || 0,
          createdAt: l.createdAt,
        })),
        jobs: jobs.map(j => ({
          id: j.id,
          leadId: j.leadId,
          technicianId: j.assignedTechnicianId || '',
          status: j.status,
          scheduledDate: j.scheduledDate || '',
          scheduledTime: j.scheduledTimeStart || '',
          customerName: j.customerName,
          serviceType: j.serviceType,
          address: j.address,
        })),
        technicians: technicians.map(t => ({
          id: t.id,
          name: t.fullName,
          phone: t.phone,
          email: t.email || '',
          status: t.status,
          skillLevel: t.skillLevel,
          completedJobsToday: t.completedJobsToday || 0,
        })),
        quotes: quotes.map(q => ({
          id: q.id,
          jobId: q.jobId,
          customerName: q.customerName,
          status: q.status,
          subtotal: Number(q.subtotal) || 0,
          tax: Number(q.taxAmount) || 0,
          total: Number(q.total) || 0,
          expiresAt: q.expiresAt || '',
          createdAt: q.createdAt,
        })),
      };

      if (format === 'csv') {
        // Generate CSV content
        let csv = '';
        
        // Leads section
        csv += 'LEADS\n';
        csv += 'ID,Name,Phone,Email,Address,City,Zip,Source,Status,Service,Lead Cost,Created\n';
        exportData.leads.forEach(l => {
          csv += `"${l.id}","${l.name}","${l.phone}","${l.email}","${l.address}","${l.city}","${l.zip}","${l.source}","${l.status}","${l.service}",${l.leadCost},"${l.createdAt}"\n`;
        });
        
        csv += '\nJOBS\n';
        csv += 'ID,Lead ID,Technician ID,Status,Customer,Service,Address,Scheduled Date,Scheduled Time\n';
        exportData.jobs.forEach(j => {
          csv += `"${j.id}","${j.leadId}","${j.technicianId}","${j.status}","${j.customerName}","${j.serviceType}","${j.address}","${j.scheduledDate}","${j.scheduledTime}"\n`;
        });
        
        csv += '\nTECHNICIANS\n';
        csv += 'ID,Name,Phone,Email,Status,Skill Level,Jobs Today\n';
        exportData.technicians.forEach(t => {
          csv += `"${t.id}","${t.name}","${t.phone}","${t.email}","${t.status}","${t.skillLevel}",${t.completedJobsToday}\n`;
        });
        
        csv += '\nQUOTES\n';
        csv += 'ID,Job ID,Customer Name,Status,Subtotal,Tax,Total,Expires,Created\n';
        exportData.quotes.forEach(q => {
          csv += `"${q.id}","${q.jobId}","${q.customerName}","${q.status}",${q.subtotal},${q.tax},${q.total},"${q.expiresAt}","${q.createdAt}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=crm-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        // Return JSON for PDF generation on frontend
        res.json(exportData);
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const { range } = req.query;
      const analytics = await storage.getAnalytics((range as string) || "year");
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ 
        error: "Failed to fetch analytics",
        summary: {
          totalRevenue: 0,
          totalLeads: 0,
          conversionRate: 0,
          netProfit: 0,
          revenueChange: 0,
          leadsChange: 0,
          conversionChange: 0,
          profitChange: 0,
        },
        sourceComparison: [],
        monthlyRevenue: [],
        serviceBreakdown: [],
        techPerformance: [],
        conversionFunnel: [],
      });
    }
  });

  // Shift Logs (Technician Availability Time Tracking)
  app.post("/api/shift-logs", async (req, res) => {
    try {
      const result = insertShiftLogSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const log = await storage.createShiftLog(result.data);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating shift log:", error);
      res.status(500).json({ error: "Failed to create shift log" });
    }
  });

  app.get("/api/technicians/:id/shift-logs", async (req, res) => {
    try {
      const logs = await storage.getShiftLogsByTechnician(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching shift logs:", error);
      res.status(500).json({ error: "Failed to fetch shift logs" });
    }
  });

  app.get("/api/technicians/:id/shift-logs/today", async (req, res) => {
    try {
      const logs = await storage.getTodayShiftLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching today's shift logs:", error);
      res.status(500).json({ error: "Failed to fetch today's shift logs" });
    }
  });

  // Admin: Reset Job Board
  app.post("/api/admin/reset-job-board", async (req, res) => {
    try {
      await storage.resetJobBoard();
      res.json({ success: true, message: "Job board reset successfully. All jobs cleared and technicians set to off duty." });
    } catch (error) {
      console.error("Error resetting job board:", error);
      res.status(500).json({ error: "Failed to reset job board" });
    }
  });

  // ==========================================
  // SMS Status Callback Webhooks
  // ==========================================

  // Twilio SMS status callback - tracks delivery status
  app.post("/api/webhooks/twilio/status", async (req, res) => {
    try {
      const {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage,
      } = req.body;

      const logEntry = {
        timestamp: new Date().toISOString(),
        provider: "Twilio",
        messageSid: MessageSid,
        status: MessageStatus,
        to: To,
        from: From,
        errorCode: ErrorCode || null,
        errorMessage: ErrorMessage || null,
      };

      console.log(`[Twilio Status] ${MessageStatus} for ${To}:`, JSON.stringify(logEntry));

      // Log to webhook_logs table for tracking
      await storage.createWebhookLog({
        source: "twilio-status",
        endpoint: "/api/webhooks/twilio/status",
        method: "POST",
        payload: JSON.stringify(logEntry),
        error: ErrorCode ? `${ErrorCode}: ${ErrorMessage || "Unknown error"}` : null,
      });

      // Return 200 OK - Twilio expects this
      res.status(200).send("OK");
    } catch (error) {
      console.error("Twilio status webhook error:", error);
      // Still return 200 to prevent Twilio from retrying
      res.status(200).send("OK");
    }
  });

  // SignalWire SMS status callback - tracks delivery status  
  app.post("/api/webhooks/signalwire/status", async (req, res) => {
    try {
      const {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage,
      } = req.body;

      const logEntry = {
        timestamp: new Date().toISOString(),
        provider: "SignalWire",
        messageSid: MessageSid,
        status: MessageStatus,
        to: To,
        from: From,
        errorCode: ErrorCode || null,
        errorMessage: ErrorMessage || null,
      };

      console.log(`[SignalWire Status] ${MessageStatus} for ${To}:`, JSON.stringify(logEntry));

      // Log to webhook_logs table for tracking
      await storage.createWebhookLog({
        source: "signalwire-status",
        endpoint: "/api/webhooks/signalwire/status",
        method: "POST",
        payload: JSON.stringify(logEntry),
        error: ErrorCode ? `${ErrorCode}: ${ErrorMessage || "Unknown error"}` : null,
      });

      res.status(200).send("OK");
    } catch (error) {
      console.error("SignalWire status webhook error:", error);
      res.status(200).send("OK");
    }
  });

  // ==========================================
  // Twilio Call & SMS Forwarding Webhooks
  // ==========================================

  // Forwarding phone number for all incoming calls and texts
  const FORWARDING_PHONE_NUMBER = "+16302515628";

  // Twilio incoming voice call webhook - forwards calls to office
  app.post("/api/webhooks/twilio/voice", async (req, res) => {
    try {
      const { From, To, CallSid } = req.body;

      console.log(`[Twilio Voice] Incoming call from ${From} to ${To}, CallSid: ${CallSid}`);

      // Log the incoming call
      await storage.createWebhookLog({
        source: "twilio-voice-incoming",
        endpoint: "/api/webhooks/twilio/voice",
        method: "POST",
        payload: JSON.stringify({ from: From, to: To, callSid: CallSid, action: "forward" }),
      });

      // Return TwiML to forward the call
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect you to Chicago Sewer Experts.</Say>
  <Dial callerId="${To}" timeout="30" action="/api/webhooks/twilio/voice-status">
    ${FORWARDING_PHONE_NUMBER}
  </Dial>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/api/webhooks/twilio/voicemail" />
</Response>`;

      res.type("text/xml").send(twiml);
    } catch (error) {
      console.error("Twilio voice webhook error:", error);
      // Return basic TwiML even on error
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're experiencing technical difficulties. Please call back later.</Say>
  <Hangup/>
</Response>`;
      res.type("text/xml").send(errorTwiml);
    }
  });

  // Twilio voice status callback - handles call completion
  app.post("/api/webhooks/twilio/voice-status", async (req, res) => {
    try {
      const { DialCallStatus, CallSid, From, To } = req.body;
      
      console.log(`[Twilio Voice Status] Call ${CallSid} status: ${DialCallStatus}`);
      
      await storage.createWebhookLog({
        source: "twilio-voice-status",
        endpoint: "/api/webhooks/twilio/voice-status",
        method: "POST",
        payload: JSON.stringify({ callSid: CallSid, status: DialCallStatus, from: From, to: To }),
      });

      // Just acknowledge - call is done
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (error) {
      console.error("Twilio voice status error:", error);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // Twilio voicemail callback - handles voicemail recordings
  app.post("/api/webhooks/twilio/voicemail", async (req, res) => {
    try {
      const { RecordingUrl, RecordingSid, From, To, CallSid } = req.body;
      
      console.log(`[Twilio Voicemail] Recording from ${From}: ${RecordingUrl}`);
      
      await storage.createWebhookLog({
        source: "twilio-voicemail",
        endpoint: "/api/webhooks/twilio/voicemail",
        method: "POST",
        payload: JSON.stringify({ from: From, to: To, callSid: CallSid, recordingSid: RecordingSid, recordingUrl: RecordingUrl }),
      });

      // Send email notification about voicemail via Resend
      const { sendEmail } = await import("./services/email");
      await sendEmail({
        to: "CSEINTAKETEST@webslingerai.com",
        subject: `New Voicemail from ${From}`,
        html: `
          <h2>New Voicemail Received</h2>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>To:</strong> ${To}</p>
          <p><strong>Recording:</strong> <a href="${RecordingUrl}.mp3">Listen to voicemail</a></p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        text: `New voicemail from ${From}. Listen at: ${RecordingUrl}.mp3`,
      });

      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thank you for your message. We will get back to you soon.</Say></Response>`);
    } catch (error) {
      console.error("Twilio voicemail error:", error);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // Twilio incoming SMS webhook - forwards texts to office number
  app.post("/api/webhooks/twilio/sms", async (req, res) => {
    try {
      const { From, To, Body, MessageSid } = req.body;

      console.log(`[Twilio SMS] Incoming text from ${From}: ${Body}`);

      // Log the incoming SMS
      await storage.createWebhookLog({
        source: "twilio-sms-incoming",
        endpoint: "/api/webhooks/twilio/sms",
        method: "POST",
        payload: JSON.stringify({ from: From, to: To, body: Body, messageSid: MessageSid }),
      });

      // Forward the SMS to the office number
      const { sendSMS } = await import("./services/sms");
      const forwardMessage = `[Fwd from ${From}]: ${Body}`;
      await sendSMS(FORWARDING_PHONE_NUMBER, forwardMessage);

      // Also send email notification via Resend
      const { sendEmail } = await import("./services/email");
      await sendEmail({
        to: "CSEINTAKETEST@webslingerai.com",
        subject: `New Text Message from ${From}`,
        html: `
          <h2>New Text Message Received</h2>
          <p><strong>From:</strong> ${From}</p>
          <p><strong>To:</strong> ${To}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f5f5f5; padding: 10px; border-left: 3px solid #b22222;">${Body}</blockquote>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        text: `New text from ${From}: ${Body}`,
      });

      // Return TwiML acknowledgment
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message! A Chicago Sewer Experts team member will respond shortly.</Message>
</Response>`;

      res.type("text/xml").send(twiml);
    } catch (error) {
      console.error("Twilio SMS webhook error:", error);
      // Still return valid TwiML
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // ==========================================
  // Universal Call Integration Webhooks
  // ==========================================

  // Universal inbound call webhook - accepts calls from any provider (Google Voice, Zapier, custom integrations)
  app.post("/api/webhooks/calls/inbound", async (req, res) => {
    try {
      const {
        callerPhone,
        callerName,
        callerEmail,
        callerAddress,
        serviceType,
        direction = "inbound",
        status = "completed",
        outcome,
        duration,
        recordingUrl,
        transcription,
        notes,
        provider = "zapier",
        externalId,
        priority = "normal",
      } = req.body;

      if (!callerPhone) {
        return res.status(400).json({ error: "callerPhone is required" });
      }

      console.log(`[Call Webhook] ${provider} incoming call from ${callerPhone}`);

      // Log the webhook
      await storage.createWebhookLog({
        source: `call-webhook-${provider}`,
        endpoint: "/api/webhooks/calls/inbound",
        method: "POST",
        payload: JSON.stringify(req.body),
      });

      // Create the call record
      const call = await storage.createCall({
        callerPhone,
        callerName: callerName || null,
        callerEmail: callerEmail || null,
        callerAddress: callerAddress || null,
        serviceType: serviceType || null,
        direction,
        status,
        outcome: outcome || null,
        duration: duration ? parseInt(duration) : null,
        recordingUrl: recordingUrl || null,
        transcription: transcription || null,
        notes: notes || null,
        provider,
        externalId: externalId || null,
        priority,
      });

      res.status(201).json({ 
        success: true, 
        callId: call.id,
        message: "Call logged successfully" 
      });
    } catch (error) {
      console.error("Call webhook error:", error);
      res.status(500).json({ error: "Failed to log call" });
    }
  });

  // Google Voice specific webhook (via Zapier or IFTTT)
  app.post("/api/webhooks/google-voice", async (req, res) => {
    try {
      const { 
        phoneNumber, 
        contactName, 
        callType, // missed, voicemail, received
        voicemailUrl,
        transcription,
        timestamp 
      } = req.body;

      console.log(`[Google Voice] ${callType} call from ${phoneNumber}`);

      await storage.createWebhookLog({
        source: "google-voice",
        endpoint: "/api/webhooks/google-voice",
        method: "POST",
        payload: JSON.stringify(req.body),
      });

      // Map Google Voice call types to our status
      const statusMap: Record<string, string> = {
        missed: "missed",
        voicemail: "voicemail",
        received: "answered",
        placed: "completed",
      };

      const call = await storage.createCall({
        callerPhone: phoneNumber || "",
        callerName: contactName || null,
        direction: callType === "placed" ? "outbound" : "inbound",
        status: statusMap[callType] || "completed",
        recordingUrl: voicemailUrl || null,
        transcription: transcription || null,
        provider: "google_voice",
        notes: timestamp ? `Received at: ${timestamp}` : null,
      });

      res.status(201).json({ success: true, callId: call.id });
    } catch (error) {
      console.error("Google Voice webhook error:", error);
      res.status(500).json({ error: "Failed to process Google Voice call" });
    }
  });

  // Zapier webhook for custom call integrations
  app.post("/api/webhooks/zapier/call", async (req, res) => {
    try {
      // Zapier sends data in various formats, so we normalize it
      const {
        phone,
        caller_phone,
        callerPhone,
        name,
        caller_name,
        callerName,
        email,
        address,
        service,
        service_type,
        type, // inbound, outbound
        call_status,
        status,
        call_duration,
        duration,
        recording,
        recording_url,
        notes,
        external_id,
      } = req.body;

      const normalizedPhone = phone || caller_phone || callerPhone;
      
      if (!normalizedPhone) {
        return res.status(400).json({ error: "Phone number is required (phone, caller_phone, or callerPhone)" });
      }

      console.log(`[Zapier] Call webhook from ${normalizedPhone}`);

      await storage.createWebhookLog({
        source: "zapier-call",
        endpoint: "/api/webhooks/zapier/call",
        method: "POST",
        payload: JSON.stringify(req.body),
      });

      const call = await storage.createCall({
        callerPhone: normalizedPhone,
        callerName: name || caller_name || callerName || null,
        callerEmail: email || null,
        callerAddress: address || null,
        serviceType: service || service_type || null,
        direction: type === "outbound" ? "outbound" : "inbound",
        status: call_status || status || "completed",
        duration: call_duration || duration ? parseInt(call_duration || duration) : null,
        recordingUrl: recording || recording_url || null,
        notes: notes || null,
        provider: "zapier",
        externalId: external_id || null,
      });

      res.status(201).json({ 
        success: true, 
        callId: call.id,
        message: "Call logged via Zapier"
      });
    } catch (error) {
      console.error("Zapier call webhook error:", error);
      res.status(500).json({ error: "Failed to log call from Zapier" });
    }
  });

  // SignalWire incoming voice webhook
  app.post("/api/webhooks/signalwire/voice", async (req, res) => {
    try {
      const { From, To, CallSid, CallStatus } = req.body;

      console.log(`[SignalWire Voice] Incoming call from ${From} to ${To}, Status: ${CallStatus}`);

      await storage.createWebhookLog({
        source: "signalwire-voice-incoming",
        endpoint: "/api/webhooks/signalwire/voice",
        method: "POST",
        payload: JSON.stringify(req.body),
      });

      // Create call record
      await storage.createCall({
        callerPhone: From || "",
        direction: "inbound",
        status: CallStatus === "ringing" ? "ringing" : "answered",
        provider: "signalwire",
        externalId: CallSid,
      });

      // Return LaML to forward the call (similar to Twilio TwiML)
      const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Chicago Sewer Experts. Please hold while we connect you.</Say>
  <Dial callerId="${To}" timeout="30">
    ${FORWARDING_PHONE_NUMBER}
  </Dial>
  <Say voice="alice">We're sorry, no one is available. Please leave a message after the beep.</Say>
  <Record maxLength="120" />
</Response>`;

      res.type("text/xml").send(laml);
    } catch (error) {
      console.error("SignalWire voice webhook error:", error);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  // ==========================================
  // Lead Provider Webhooks
  // ==========================================

  // Helper function to check if lead API is enabled
  async function isLeadApiEnabled(): Promise<boolean> {
    try {
      const settings = await storage.getCompanySettings();
      // Default to true if no settings exist
      return settings?.leadApiEnabled !== false;
    } catch (error) {
      console.error("Error checking lead API status:", error);
      return true; // Default to enabled on error
    }
  }

  // eLocal webhook - receives leads from eLocal
  app.post("/api/webhooks/elocal", async (req, res) => {
    try {
      // Check if lead API is enabled
      if (!(await isLeadApiEnabled())) {
        console.log("[Webhook] eLocal lead rejected - Lead API is disabled");
        return res.status(503).json({ error: "Lead API integration is currently disabled" });
      }
      const { first_name, last_name, phone, email, zip_code, need_id, description } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const customerName = [first_name, last_name].filter(Boolean).join(" ") || "Unknown";
      
      const leadData = {
        source: "eLocal",
        customerName,
        customerPhone: phone,
        customerEmail: email || undefined,
        zipCode: zip_code || undefined,
        serviceType: need_id || undefined,
        description: description || undefined,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] eLocal lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("eLocal webhook error:", error);
      res.status(500).json({ error: "Failed to process eLocal lead" });
    }
  });

  // Angi/HomeAdvisor webhook - receives leads from Angi
  app.post("/api/webhooks/angi", async (req, res) => {
    try {
      // Check if lead API is enabled
      if (!(await isLeadApiEnabled())) {
        console.log("[Webhook] Angi lead rejected - Lead API is disabled");
        return res.status(503).json({ error: "Lead API integration is currently disabled" });
      }
      // API key authentication (optional - set ANGI_WEBHOOK_KEY to enable)
      const expectedKey = process.env.ANGI_WEBHOOK_KEY;
      if (expectedKey) {
        const apiKey = req.headers["x-api-key"];
        if (apiKey !== expectedKey) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      
      const { name, phone, email, address, zip_code, category, description } = req.body;
      
      // Phone is required for lead creation
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const leadData = {
        source: "Angi",
        customerName: name || "Unknown",
        customerPhone: phone,
        customerEmail: email || undefined,
        address: address || undefined,
        zipCode: zip_code || undefined,
        serviceType: category || undefined,
        description: description || undefined,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Angi lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Angi webhook error:", error);
      res.status(500).json({ error: "Failed to process Angi lead" });
    }
  });

  // Thumbtack webhook - receives leads from Thumbtack
  app.post("/api/webhooks/thumbtack", async (req, res) => {
    try {
      // Check if lead API is enabled
      if (!(await isLeadApiEnabled())) {
        console.log("[Webhook] Thumbtack lead rejected - Lead API is disabled");
        return res.status(503).json({ error: "Lead API integration is currently disabled" });
      }
      // HTTP Basic Auth (optional - set THUMBTACK_WEBHOOK_USER and THUMBTACK_WEBHOOK_PASS to enable)
      const expectedUser = process.env.THUMBTACK_WEBHOOK_USER;
      const expectedPass = process.env.THUMBTACK_WEBHOOK_PASS;
      if (expectedUser && expectedPass) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Basic ")) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const base64Credentials = authHeader.slice(6);
        const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const [user, pass] = credentials.split(":");
        if (user !== expectedUser || pass !== expectedPass) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      
      const { leadID, customer, request } = req.body;
      
      const customerName = customer?.name || "Unknown";
      const phone = customer?.phone;
      const email = customer?.email;
      
      // Phone is required for lead creation
      if (!phone) {
        return res.status(400).json({ error: "Customer phone is required" });
      }
      
      const category = request?.category || undefined;
      const description = request?.description || undefined;
      const location = request?.location || {};

      const leadData = {
        source: "Thumbtack",
        customerName,
        customerPhone: phone,
        customerEmail: email || undefined,
        address: location.address || undefined,
        city: location.city || undefined,
        zipCode: location.zipCode || undefined,
        serviceType: category,
        description: description,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Thumbtack lead created: ${lead.id} (Thumbtack ID: ${leadID})`);
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id, thumbtackLeadId: leadID });
    } catch (error) {
      console.error("Thumbtack webhook error:", error);
      res.status(500).json({ error: "Failed to process Thumbtack lead" });
    }
  });

  // Networx webhook - receives leads from Networx
  app.post("/api/webhooks/networx", async (req, res) => {
    try {
      // Check if lead API is enabled
      if (!(await isLeadApiEnabled())) {
        console.log("[Webhook] Networx lead rejected - Lead API is disabled");
        return res.status(503).json({ error: "Lead API integration is currently disabled" });
      }
      const { customer_name, phone, email, zip_code, service_type, description } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const leadData = {
        source: "Networx",
        customerName: customer_name || "Unknown",
        customerPhone: phone,
        customerEmail: email || undefined,
        zipCode: zip_code || undefined,
        serviceType: service_type || undefined,
        description: description || undefined,
        status: "new",
        priority: "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Networx lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Networx webhook error:", error);
      res.status(500).json({ error: "Failed to process Networx lead" });
    }
  });

  // Zapier/Generic webhook - universal lead intake for Zapier, Google Forms, etc.
  app.post("/api/webhooks/zapier/lead", async (req, res) => {
    const startTime = Date.now();
    try {
      // Check if lead API is enabled
      if (!(await isLeadApiEnabled())) {
        console.log("[Webhook] Zapier lead rejected - Lead API is disabled");
        return res.status(503).json({ error: "Lead API integration is currently disabled" });
      }
      const { 
        customer_name, 
        name,
        phone, 
        customer_phone,
        email,
        customer_email,
        address,
        city,
        zip_code,
        zipCode,
        service_type,
        serviceType,
        description,
        notes,
        source,
        priority,
        send_email
      } = req.body;
      
      // Support multiple field naming conventions
      const customerPhone = phone || customer_phone;
      const customerName = customer_name || name || "Unknown";
      const customerEmail = email || customer_email;
      const customerZip = zip_code || zipCode;
      const customerService = service_type || serviceType;
      const customerDescription = description || notes;
      
      // Phone is optional for email leads
      const leadData = {
        source: source || "Zapier",
        customerName,
        customerPhone: customerPhone || "No phone provided",
        customerEmail: customerEmail || undefined,
        address: address || undefined,
        city: city || undefined,
        zipCode: customerZip || undefined,
        serviceType: customerService || undefined,
        description: customerDescription || undefined,
        status: "new" as const,
        priority: priority || "normal",
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        await storage.createWebhookLog({
          source: "zapier",
          endpoint: "/api/webhooks/zapier/lead",
          method: "POST",
          headers: JSON.stringify(req.headers),
          payload: JSON.stringify(req.body),
          responseStatus: 400,
          responseBody: JSON.stringify({ error: "Invalid lead data" }),
          processingTimeMs: Date.now() - startTime,
          error: JSON.stringify(validation.error.flatten()),
        });
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Zapier lead created: ${lead.id}`);
      
      // Auto-send acknowledgment email if email provided and send_email not explicitly false
      let emailSent = false;
      let emailError: string | null = null;
      
      if (customerEmail && send_email !== false) {
        try {
          const emailContent = generateLeadAcknowledgmentEmail(
            customerName,
            customerService || "plumbing service"
          );
          
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
          
          emailSent = emailResult.success;
          emailError = emailResult.error || null;
          
          // Log the contact attempt
          await storage.createContactAttempt({
            leadId: lead.id,
            type: "email",
            direction: "outbound",
            status: emailResult.success ? "sent" : "failed",
            subject: emailContent.subject,
            content: emailContent.html,
            templateId: "lead_acknowledgment",
            externalId: emailResult.messageId,
            recipientEmail: customerEmail,
            sentBy: "automation",
            sentAt: new Date(),
            failedReason: emailError,
          });
          
          if (emailResult.success) {
            // Update lead to contacted status
            await storage.updateLead(lead.id, {
              status: "contacted",
              contactedAt: new Date(),
            });
          }
        } catch (err) {
          console.error("Auto-email error:", err);
          emailError = err instanceof Error ? err.message : "Unknown error";
        }
      }
      
      // Notify team members about new lead
      let teamNotification = { emailsSent: 0, smsSent: 0, errors: [] as string[] };
      try {
        teamNotification = await notifyLeadRecipients(lead);
      } catch (err) {
        console.error("Team notification error:", err);
      }
      
      // Log successful webhook
      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/lead",
        method: "POST",
        headers: JSON.stringify(req.headers),
        payload: JSON.stringify(req.body),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: true, leadId: lead.id }),
        processingTimeMs: Date.now() - startTime,
      });
      
      res.status(200).json({ 
        success: true, 
        leadId: lead.id,
        emailSent,
        emailError,
        teamNotifications: {
          emailsSent: teamNotification.emailsSent,
          smsSent: teamNotification.smsSent,
        },
      });
    } catch (error) {
      console.error("Zapier webhook error:", error);
      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/lead",
        method: "POST",
        headers: JSON.stringify(req.headers),
        payload: JSON.stringify(req.body),
        responseStatus: 500,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({ error: "Failed to process lead" });
    }
  });
  
  // Manual email send endpoint
  app.post("/api/leads/:id/send-email", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      
      if (!lead.customerEmail) {
        return res.status(400).json({ error: "Lead has no email address" });
      }
      
      const { template = "acknowledgment" } = req.body;
      
      let emailContent;
      if (template === "acknowledgment") {
        emailContent = generateLeadAcknowledgmentEmail(
          lead.customerName,
          lead.serviceType || "plumbing service"
        );
      } else {
        return res.status(400).json({ error: "Unknown email template" });
      }
      
      const emailResult = await sendEmail({
        to: lead.customerEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
      
      // Log the contact attempt
      await storage.createContactAttempt({
        leadId: lead.id,
        type: "email",
        direction: "outbound",
        status: emailResult.success ? "sent" : "failed",
        subject: emailContent.subject,
        content: emailContent.html,
        templateId: template,
        externalId: emailResult.messageId,
        recipientEmail: lead.customerEmail,
        sentBy: req.body.userId || "manual",
        sentAt: new Date(),
        failedReason: emailResult.error,
      });
      
      if (emailResult.success && lead.status === "new") {
        await storage.updateLead(lead.id, {
          status: "contacted",
          contactedAt: new Date(),
        });
      }
      
      res.json({ 
        success: emailResult.success, 
        messageId: emailResult.messageId,
        error: emailResult.error,
      });
    } catch (error) {
      console.error("Email send error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });
  
  // Get contact attempts for a lead
  app.get("/api/leads/:id/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContactAttemptsByLead(req.params.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contact attempts:", error);
      res.status(500).json({ error: "Failed to fetch contact attempts" });
    }
  });
  
  // Get webhook logs
  app.get("/api/webhook-logs", async (req, res) => {
    try {
      const { limit = "50", source } = req.query;
      const logs = await storage.getWebhookLogs(parseInt(limit as string), source as string);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ error: "Failed to fetch webhook logs" });
    }
  });

  // Inquirly webhook - receives leads from Inquirly conversational AI
  app.post("/api/webhooks/inquirly", async (req, res) => {
    try {
      // Check if lead API is enabled
      if (!(await isLeadApiEnabled())) {
        console.log("[Webhook] Inquirly lead rejected - Lead API is disabled");
        return res.status(503).json({ error: "Lead API integration is currently disabled" });
      }
      const { 
        contact_name, 
        contact_phone, 
        contact_email, 
        contact_address,
        contact_zip,
        conversation_summary,
        service_requested,
        urgency
      } = req.body;
      
      // Phone is required for lead creation
      if (!contact_phone) {
        return res.status(400).json({ error: "Contact phone is required" });
      }

      // Map Inquirly urgency to our priority
      let priority = "normal";
      if (urgency === "high" || urgency === "emergency") {
        priority = "urgent";
      } else if (urgency === "medium") {
        priority = "high";
      }

      const leadData = {
        source: "Inquirly",
        customerName: contact_name || "Unknown",
        customerPhone: contact_phone,
        customerEmail: contact_email || undefined,
        address: contact_address || undefined,
        zipCode: contact_zip || undefined,
        serviceType: service_requested || undefined,
        description: conversation_summary || undefined,
        status: "new",
        priority,
      };

      const validation = insertLeadSchema.safeParse(leadData);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid lead data", details: validation.error.flatten() });
      }

      const lead = await storage.createLead(validation.data);
      console.log(`[Webhook] Inquirly lead created: ${lead.id}`);
      
      // Trigger auto-contact
      autoContactLead(lead.id).catch(err => 
        console.error(`Auto-contact failed for lead ${lead.id}:`, err)
      );
      
      // Notify team members
      notifyLeadRecipients(lead).catch(err => 
        console.error(`Team notification failed for lead ${lead.id}:`, err)
      );
      
      res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Inquirly webhook error:", error);
      res.status(500).json({ error: "Failed to process Inquirly lead" });
    }
  });

  // ==================== AUTOMATION API ENDPOINTS ====================

  // Confirm estimate - creates a job from a lead when customer confirms they want an estimate
  app.post("/api/leads/:id/confirm-estimate", async (req, res) => {
    try {
      const { id } = req.params;
      const { scheduledDate, scheduledTimeStart, scheduledTimeEnd, autoAssign } = req.body;

      const result = await createJobFromLead(
        id,
        scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTimeStart,
        scheduledTimeEnd
      );

      if (!result.success || !result.job) {
        return res.status(400).json({ error: result.error });
      }

      // Auto-assign technician if requested
      let assignedTech = null;
      if (autoAssign) {
        const assignResult = await autoAssignTechnician(result.job.id);
        if (assignResult.success) {
          assignedTech = assignResult.technician;
        }
      }

      res.json({ 
        success: true, 
        job: result.job, 
        assignedTechnician: assignedTech 
      });
    } catch (error) {
      console.error("Confirm estimate error:", error);
      res.status(500).json({ error: "Failed to confirm estimate" });
    }
  });

  // Cancel a job with full tracking
  app.post("/api/jobs/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { cancelledBy, reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: "Cancellation reason is required" });
      }

      const result = await cancelJob(id, cancelledBy || "system", reason);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel job error:", error);
      res.status(500).json({ error: "Failed to cancel job" });
    }
  });

  // Update job costs (labor, materials, expenses)
  app.patch("/api/jobs/:id/costs", async (req, res) => {
    try {
      const { id } = req.params;
      const { laborHours, materialsCost, travelExpense, equipmentCost, otherExpenses, expenseNotes } = req.body;

      const result = await updateJobCosts(id, {
        laborHours,
        materialsCost,
        travelExpense,
        equipmentCost,
        otherExpenses,
        expenseNotes,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Return updated job
      const job = await storage.getJob(id);
      res.json(job);
    } catch (error) {
      console.error("Update job costs error:", error);
      res.status(500).json({ error: "Failed to update job costs" });
    }
  });

  // Send appointment reminder (email + SMS)
  app.post("/api/jobs/:id/send-reminder", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await sendAppointmentReminder(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, emailSent: result.emailSent, smsSent: result.smsSent });
    } catch (error) {
      console.error("Send reminder error:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });

  // Send SMS notification that technician is en route
  app.post("/api/jobs/:id/send-en-route-sms", async (req, res) => {
    try {
      const { id } = req.params;
      const { estimatedArrival } = req.body;

      const result = await sendTechnicianEnRouteSMS(id, estimatedArrival || "15-20 minutes");
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Send en route SMS error:", error);
      res.status(500).json({ error: "Failed to send en route SMS" });
    }
  });

  // Send SMS notification that job is complete
  app.post("/api/jobs/:id/send-complete-sms", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await sendJobCompleteSMS(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Send complete SMS error:", error);
      res.status(500).json({ error: "Failed to send job complete SMS" });
    }
  });

  // Send custom SMS to a phone number
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { to, message, jobId } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: "Phone number and message required" });
      }

      const result = await smsService.sendSMS(to, message);
      
      // Log contact attempt if job is specified
      if (jobId) {
        await storage.createContactAttempt({
          jobId,
          type: "sms",
          direction: "outbound",
          status: result.success ? "sent" : "failed",
          content: message,
          recipientPhone: to,
          sentAt: result.success ? new Date() : null,
          externalId: result.messageId || null,
          failedReason: result.error || null,
        });
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      console.error("Send SMS error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Check SMS service status
  app.get("/api/sms/status", async (req, res) => {
    res.json({ 
      configured: smsService.isConfigured(),
    });
  });

  // Auto-assign technician to a job
  app.post("/api/jobs/:id/auto-assign", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await autoAssignTechnician(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Return updated job with technician
      const job = await storage.getJob(id);
      res.json({ job, technician: result.technician });
    } catch (error) {
      console.error("Auto-assign error:", error);
      res.status(500).json({ error: "Failed to auto-assign technician" });
    }
  });

  // Get job ROI analysis
  app.get("/api/jobs/:id/roi", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const roi = calculateJobROI(job);
      res.json({ job, roi });
    } catch (error) {
      console.error("Get job ROI error:", error);
      res.status(500).json({ error: "Failed to get job ROI" });
    }
  });

  // Get aggregated ROI analytics for all jobs
  app.get("/api/analytics/roi", async (req, res) => {
    try {
      const { startDate, endDate, includeCompleted = "true", includeCancelled = "true" } = req.query;
      
      const allJobs = await storage.getJobs();
      
      // Filter jobs by date and status
      let filteredJobs = allJobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        if (startDate && jobDate < new Date(startDate as string)) return false;
        if (endDate && jobDate > new Date(endDate as string)) return false;
        if (includeCompleted !== "true" && job.status === "completed") return false;
        if (includeCancelled !== "true" && job.status === "cancelled") return false;
        return true;
      });

      // Calculate aggregate ROI
      const summary = {
        totalJobs: filteredJobs.length,
        completedJobs: filteredJobs.filter(j => j.status === "completed").length,
        cancelledJobs: filteredJobs.filter(j => j.status === "cancelled").length,
        totalRevenue: 0,
        totalCost: 0,
        totalLaborCost: 0,
        totalMaterialsCost: 0,
        totalTravelExpense: 0,
        totalEquipmentCost: 0,
        totalOtherExpenses: 0,
        totalProfit: 0,
        averageProfitMargin: 0,
      };

      filteredJobs.forEach(job => {
        const roi = calculateJobROI(job);
        summary.totalRevenue += roi.totalRevenue;
        summary.totalCost += roi.totalCost;
        summary.totalLaborCost += roi.laborCost;
        summary.totalMaterialsCost += roi.materialsCost;
        summary.totalTravelExpense += roi.travelExpense;
        summary.totalEquipmentCost += roi.equipmentCost;
        summary.totalOtherExpenses += roi.otherExpenses;
        summary.totalProfit += roi.profit;
      });

      summary.averageProfitMargin = summary.totalRevenue > 0 
        ? (summary.totalProfit / summary.totalRevenue) * 100 
        : 0;

      res.json(summary);
    } catch (error) {
      console.error("Get ROI analytics error:", error);
      res.status(500).json({ error: "Failed to get ROI analytics" });
    }
  });

  // Manual trigger for auto-contact on a lead
  app.post("/api/leads/:id/auto-contact", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await autoContactLead(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Auto-contact error:", error);
      res.status(500).json({ error: "Failed to auto-contact lead" });
    }
  });

  // ========================================
  // JOB ATTACHMENTS (Photos/Videos)
  // ========================================
  
  app.get("/api/jobs/:id/attachments", async (req, res) => {
    try {
      const attachments = await storage.getJobAttachments(req.params.id);
      res.json(attachments);
    } catch (error) {
      console.error("Get job attachments error:", error);
      res.status(500).json({ error: "Failed to get attachments" });
    }
  });

  app.post("/api/jobs/:id/attachments", async (req, res) => {
    try {
      const { fileData, ...rest } = req.body;
      
      const result = insertJobAttachmentSchema.safeParse({
        ...rest,
        jobId: req.params.id,
        url: fileData || rest.url,
      });
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const attachment = await storage.createJobAttachment(result.data);
      
      // Create timeline event
      await storage.createJobTimelineEvent({
        jobId: req.params.id,
        eventType: "attachment_added",
        description: `${result.data.type} added: ${result.data.filename}`,
        createdBy: result.data.technicianId || undefined,
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Create job attachment error:", error);
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      const success = await storage.deleteJobAttachment(req.params.id);
      if (!success) return res.status(404).json({ error: "Attachment not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete attachment error:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // ========================================
  // JOB CHECKLISTS
  // ========================================
  
  app.get("/api/jobs/:id/checklists", async (req, res) => {
    try {
      const checklists = await storage.getJobChecklists(req.params.id);
      res.json(checklists);
    } catch (error) {
      console.error("Get job checklists error:", error);
      res.status(500).json({ error: "Failed to get checklists" });
    }
  });

  app.post("/api/jobs/:id/checklists", async (req, res) => {
    try {
      const result = insertJobChecklistSchema.safeParse({
        ...req.body,
        jobId: req.params.id,
      });
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const checklist = await storage.createJobChecklist(result.data);
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Create job checklist error:", error);
      res.status(500).json({ error: "Failed to create checklist" });
    }
  });

  app.get("/api/checklists/:id", async (req, res) => {
    try {
      const checklist = await storage.getJobChecklist(req.params.id);
      if (!checklist) return res.status(404).json({ error: "Checklist not found" });
      res.json(checklist);
    } catch (error) {
      console.error("Get checklist error:", error);
      res.status(500).json({ error: "Failed to get checklist" });
    }
  });

  app.patch("/api/checklists/:id", async (req, res) => {
    try {
      const checklist = await storage.updateJobChecklist(req.params.id, req.body);
      if (!checklist) return res.status(404).json({ error: "Checklist not found" });
      res.json(checklist);
    } catch (error) {
      console.error("Update checklist error:", error);
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  // ========================================
  // CHECKLIST TEMPLATES
  // ========================================
  
  app.get("/api/checklist-templates", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get checklist templates error:", error);
      res.status(500).json({ error: "Failed to get checklist templates" });
    }
  });

  app.get("/api/checklist-templates/service/:serviceType", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplatesByServiceType(req.params.serviceType);
      res.json(templates);
    } catch (error) {
      console.error("Get checklist templates by service error:", error);
      res.status(500).json({ error: "Failed to get checklist templates" });
    }
  });

  app.post("/api/checklist-templates", async (req, res) => {
    try {
      const result = insertChecklistTemplateSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const template = await storage.createChecklistTemplate(result.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Create checklist template error:", error);
      res.status(500).json({ error: "Failed to create checklist template" });
    }
  });

  app.patch("/api/checklist-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateChecklistTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: "Checklist template not found" });
      res.json(template);
    } catch (error) {
      console.error("Update checklist template error:", error);
      res.status(500).json({ error: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteChecklistTemplate(req.params.id);
      if (!success) return res.status(404).json({ error: "Checklist template not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete checklist template error:", error);
      res.status(500).json({ error: "Failed to delete checklist template" });
    }
  });

  // ========================================
  // PRICEBOOK MANAGEMENT
  // ========================================

  // Pricebook Items
  app.get("/api/pricebook/items", async (req, res) => {
    try {
      const items = await storage.getPricebookItems();
      res.json(items);
    } catch (error) {
      console.error("Get pricebook items error:", error);
      res.status(500).json({ error: "Failed to get pricebook items" });
    }
  });

  app.get("/api/pricebook/items/:id", async (req, res) => {
    try {
      const item = await storage.getPricebookItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Pricebook item not found" });
      res.json(item);
    } catch (error) {
      console.error("Get pricebook item error:", error);
      res.status(500).json({ error: "Failed to get pricebook item" });
    }
  });

  app.get("/api/pricebook/items/category/:category", async (req, res) => {
    try {
      const items = await storage.getPricebookItemsByCategory(req.params.category);
      res.json(items);
    } catch (error) {
      console.error("Get pricebook items by category error:", error);
      res.status(500).json({ error: "Failed to get pricebook items" });
    }
  });

  app.post("/api/pricebook/items", async (req, res) => {
    try {
      const result = insertPricebookItemSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const item = await storage.createPricebookItem(result.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Create pricebook item error:", error);
      res.status(500).json({ error: "Failed to create pricebook item" });
    }
  });

  app.patch("/api/pricebook/items/:id", async (req, res) => {
    try {
      const item = await storage.updatePricebookItem(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Pricebook item not found" });
      res.json(item);
    } catch (error) {
      console.error("Update pricebook item error:", error);
      res.status(500).json({ error: "Failed to update pricebook item" });
    }
  });

  app.delete("/api/pricebook/items/:id", async (req, res) => {
    try {
      const success = await storage.deletePricebookItem(req.params.id);
      if (!success) return res.status(404).json({ error: "Pricebook item not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pricebook item error:", error);
      res.status(500).json({ error: "Failed to delete pricebook item" });
    }
  });

  // Pricebook Categories
  app.get("/api/pricebook/categories", async (req, res) => {
    try {
      const categories = await storage.getPricebookCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get pricebook categories error:", error);
      res.status(500).json({ error: "Failed to get pricebook categories" });
    }
  });

  app.post("/api/pricebook/categories", async (req, res) => {
    try {
      const result = insertPricebookCategorySchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const category = await storage.createPricebookCategory(result.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create pricebook category error:", error);
      res.status(500).json({ error: "Failed to create pricebook category" });
    }
  });

  app.patch("/api/pricebook/categories/:id", async (req, res) => {
    try {
      const category = await storage.updatePricebookCategory(req.params.id, req.body);
      if (!category) return res.status(404).json({ error: "Pricebook category not found" });
      res.json(category);
    } catch (error) {
      console.error("Update pricebook category error:", error);
      res.status(500).json({ error: "Failed to update pricebook category" });
    }
  });

  app.delete("/api/pricebook/categories/:id", async (req, res) => {
    try {
      const success = await storage.deletePricebookCategory(req.params.id);
      if (!success) return res.status(404).json({ error: "Pricebook category not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete pricebook category error:", error);
      res.status(500).json({ error: "Failed to delete pricebook category" });
    }
  });

  // ========================================
  // MARKETING ROI TRACKING
  // ========================================

  // Marketing Campaigns
  app.get("/api/marketing/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getMarketingCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Get marketing campaigns error:", error);
      res.status(500).json({ error: "Failed to get marketing campaigns" });
    }
  });

  app.get("/api/marketing/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getMarketingCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Marketing campaign not found" });
      res.json(campaign);
    } catch (error) {
      console.error("Get marketing campaign error:", error);
      res.status(500).json({ error: "Failed to get marketing campaign" });
    }
  });

  app.post("/api/marketing/campaigns", async (req, res) => {
    try {
      const result = insertMarketingCampaignSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const campaign = await storage.createMarketingCampaign(result.data);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Create marketing campaign error:", error);
      res.status(500).json({ error: "Failed to create marketing campaign" });
    }
  });

  app.patch("/api/marketing/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.updateMarketingCampaign(req.params.id, req.body);
      if (!campaign) return res.status(404).json({ error: "Marketing campaign not found" });
      res.json(campaign);
    } catch (error) {
      console.error("Update marketing campaign error:", error);
      res.status(500).json({ error: "Failed to update marketing campaign" });
    }
  });

  app.delete("/api/marketing/campaigns/:id", async (req, res) => {
    try {
      const success = await storage.deleteMarketingCampaign(req.params.id);
      if (!success) return res.status(404).json({ error: "Marketing campaign not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete marketing campaign error:", error);
      res.status(500).json({ error: "Failed to delete marketing campaign" });
    }
  });

  // Marketing Spend
  app.get("/api/marketing/spend", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const spend = await storage.getMarketingSpend(campaignId);
      res.json(spend);
    } catch (error) {
      console.error("Get marketing spend error:", error);
      res.status(500).json({ error: "Failed to get marketing spend" });
    }
  });

  app.get("/api/marketing/spend/period/:period", async (req, res) => {
    try {
      const spend = await storage.getMarketingSpendByPeriod(req.params.period);
      res.json(spend);
    } catch (error) {
      console.error("Get marketing spend by period error:", error);
      res.status(500).json({ error: "Failed to get marketing spend" });
    }
  });

  app.post("/api/marketing/spend", async (req, res) => {
    try {
      const result = insertMarketingSpendSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });

      const spend = await storage.createMarketingSpend(result.data);
      res.status(201).json(spend);
    } catch (error) {
      console.error("Create marketing spend error:", error);
      res.status(500).json({ error: "Failed to create marketing spend" });
    }
  });

  app.patch("/api/marketing/spend/:id", async (req, res) => {
    try {
      const spend = await storage.updateMarketingSpend(req.params.id, req.body);
      if (!spend) return res.status(404).json({ error: "Marketing spend record not found" });
      res.json(spend);
    } catch (error) {
      console.error("Update marketing spend error:", error);
      res.status(500).json({ error: "Failed to update marketing spend" });
    }
  });

  // Marketing ROI Analytics
  app.get("/api/marketing/roi", async (req, res) => {
    try {
      const roi = await storage.getMarketingROI();
      res.json(roi);
    } catch (error) {
      console.error("Get marketing ROI error:", error);
      res.status(500).json({ error: "Failed to get marketing ROI" });
    }
  });

  // ========================================
  // GPS TRACKING / TECHNICIAN LOCATIONS
  // ========================================
  
  // Update technician location (called from mobile app)
  app.post("/api/technicians/:id/location", async (req, res) => {
    try {
      const result = insertTechnicianLocationSchema.safeParse({
        ...req.body,
        technicianId: req.params.id,
      });
      if (!result.success) return res.status(400).json({ error: result.error });
      
      const location = await storage.createTechnicianLocation(result.data);
      res.status(201).json(location);
    } catch (error) {
      console.error("Update technician location error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Get technician location history
  app.get("/api/technicians/:id/locations", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const locations = await storage.getTechnicianLocations(req.params.id, limit);
      res.json(locations);
    } catch (error) {
      console.error("Get technician locations error:", error);
      res.status(500).json({ error: "Failed to get locations" });
    }
  });

  // Get latest location for a technician
  app.get("/api/technicians/:id/location/latest", async (req, res) => {
    try {
      const location = await storage.getLatestTechnicianLocation(req.params.id);
      if (!location) return res.status(404).json({ error: "No location found" });
      res.json(location);
    } catch (error) {
      console.error("Get latest technician location error:", error);
      res.status(500).json({ error: "Failed to get location" });
    }
  });

  // Get all technicians' latest locations (for dispatch map)
  app.get("/api/technicians/locations/all", async (req, res) => {
    try {
      const locations = await storage.getAllTechniciansLatestLocations();
      
      // Enrich with technician details
      const technicians = await storage.getTechnicians();
      const enrichedLocations = locations.map(loc => {
        const tech = technicians.find(t => t.id === loc.technicianId);
        return {
          ...loc,
          technicianName: tech?.fullName || "Unknown",
          technicianStatus: tech?.status || "unknown",
          technicianPhone: tech?.phone || null,
        };
      });
      
      res.json(enrichedLocations);
    } catch (error) {
      console.error("Get all technician locations error:", error);
      res.status(500).json({ error: "Failed to get locations" });
    }
  });

  // ========================================
  // INCOMING EMAIL FORWARDING (via Zapier)
  // ========================================
  
  // Webhook endpoint to receive emails from Zapier and send SMS to team
  // Zapier setup: Email by Zapier (trigger) -> Webhooks POST (action)
  app.post("/api/webhooks/incoming-email-to-sms", async (req, res) => {
    try {
      const { 
        from, 
        subject, 
        body_plain,
        recipients // Phone numbers to text (comma-separated or array)
      } = req.body;

      console.log(`[Incoming Email -> SMS] From: ${from}, Subject: ${subject}`);

      // Get team member phone numbers
      let phoneNumbers: string[] = [];
      
      if (recipients) {
        phoneNumbers = Array.isArray(recipients) 
          ? recipients 
          : recipients.split(',').map((p: string) => p.trim());
      } else {
        // Default: get technician phone numbers
        const technicians = await storage.getTechnicians();
        phoneNumbers = technicians
          .filter(t => t.phone)
          .slice(0, 3) // Limit to 3 team members for SMS
          .map(t => t.phone!);
      }

      if (phoneNumbers.length === 0) {
        return res.status(400).json({ error: "No phone numbers configured for SMS alerts" });
      }

      // Truncate message for SMS (160 char limit)
      const truncatedBody = body_plain && body_plain.length > 100 
        ? body_plain.substring(0, 97) + "..." 
        : body_plain || "(No message)";
      
      const smsMessage = `New email from ${from || "Unknown"}:\n${subject || "(No subject)"}\n\n${truncatedBody}`;

      // Send SMS to each team member
      const smsPromises = phoneNumbers.map(phone => 
        smsService.sendSMS(phone, smsMessage)
      );

      const results = await Promise.allSettled(smsPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      
      console.log(`[Incoming Email -> SMS] Sent to ${successCount}/${phoneNumbers.length} team members`);

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/incoming-email-to-sms",
        method: "POST",
        payload: JSON.stringify({ from, subject, recipientCount: phoneNumbers.length }),
        responseStatus: 200,
      });

      res.json({ 
        success: true, 
        message: `SMS sent to ${successCount} team members`,
        sentTo: phoneNumbers 
      });
    } catch (error) {
      console.error("Incoming email to SMS webhook error:", error);
      res.status(500).json({ error: "Failed to send SMS notifications" });
    }
  });

  // Webhook endpoint to receive emails from Zapier and forward to team via email
  // Zapier setup: Email by Zapier (trigger) -> Webhooks POST (action)
  app.post("/api/webhooks/incoming-email", async (req, res) => {
    try {
      const { 
        from, 
        subject, 
        body, 
        body_plain,
        to,
        recipients // Team member emails to forward to (comma-separated or array)
      } = req.body;

      console.log(`[Incoming Email] From: ${from}, Subject: ${subject}`);

      // Get team member emails - either from request or use defaults
      let teamEmails: string[] = [];
      
      if (recipients) {
        // If recipients provided in webhook
        teamEmails = Array.isArray(recipients) 
          ? recipients 
          : recipients.split(',').map((e: string) => e.trim());
      } else {
        // Default: get all admin/dispatcher users' emails
        const users = await storage.getUsers();
        const adminsAndDispatchers = users.filter(u => u.role === 'admin' || u.role === 'dispatcher');
        // For now, we'll use technician emails as fallback since users don't have emails
        const technicians = await storage.getTechnicians();
        teamEmails = technicians
          .filter(t => t.email)
          .slice(0, 5) // Limit to 5 team members
          .map(t => t.email!);
      }

      if (teamEmails.length === 0) {
        console.log("[Incoming Email] No team members to forward to");
        return res.status(400).json({ error: "No team members configured for email forwarding" });
      }

      // Forward the email to each team member
      const emailContent = body_plain || body || "(No message content)";
      const forwardSubject = `[Customer Email] ${subject || "(No subject)"}`;
      
      const emailPromises = teamEmails.map(email => 
        sendEmail({
          to: email,
          subject: forwardSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <div style="background: #1a1a2e; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">New Customer Email</h2>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
                <p><strong>From:</strong> ${from || "Unknown"}</p>
                <p><strong>To:</strong> ${to || "Your business email"}</p>
                <p><strong>Subject:</strong> ${subject || "(No subject)"}</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                <div style="background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
${emailContent}
                </div>
              </div>
              <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                Forwarded by Chicago Sewer Experts CRM
              </div>
            </div>
          `,
        })
      );

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`[Incoming Email] Forwarded to ${successCount}/${teamEmails.length} team members`);

      // Log the webhook
      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/incoming-email",
        method: "POST",
        payload: JSON.stringify({ from, subject, to, recipientCount: teamEmails.length }),
        responseStatus: 200,
      });

      res.json({ 
        success: true, 
        message: `Email forwarded to ${successCount} team members`,
        forwardedTo: teamEmails 
      });
    } catch (error) {
      console.error("Incoming email webhook error:", error);
      
      try {
        await storage.createWebhookLog({
          source: "zapier",
          endpoint: "/api/webhooks/incoming-email",
          method: "POST",
          payload: JSON.stringify(req.body),
          responseStatus: 500,
          error: String(error),
        });
      } catch (logError) {
        console.error("Failed to log webhook error:", logError);
      }

      res.status(500).json({ error: "Failed to process incoming email" });
    }
  });

  // ========================================
  // ZAPIER SMS AUTOMATION ENDPOINTS
  // ========================================
  
  const OFFICE_FORWARDING_NUMBER = "+16302515628";
  const OFFICE_EMAIL = "CSEINTAKETEST@webslingerai.com";
  
  // Forward SMS to office number (630) 251-5628
  // Zapier setup: Twilio (New SMS) -> Webhooks POST to this endpoint
  app.post("/api/webhooks/zapier/forward-sms", async (req, res) => {
    try {
      const { 
        from_number,
        from,
        message,
        body,
        to_number,
        to,
        message_sid,
        timestamp
      } = req.body;

      const senderNumber = from_number || from || "Unknown";
      const messageBody = message || body || "(No message)";
      const originalTo = to_number || to || "Unknown";

      console.log(`[Zapier SMS Forward] From: ${senderNumber}, Message: ${messageBody.substring(0, 50)}...`);

      // Format the forwarding message
      const forwardMessage = `New text from ${senderNumber}:\n\n${messageBody}`;

      // Send SMS to office forwarding number
      const smsResult = await smsService.sendSMS(OFFICE_FORWARDING_NUMBER, forwardMessage);
      
      // Also send email notification
      let emailSent = false;
      try {
        await sendEmail({
          to: OFFICE_EMAIL,
          subject: `New SMS from ${senderNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <div style="background: #b22222; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">New SMS Received</h2>
              </div>
              <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
                <p><strong>From:</strong> ${senderNumber}</p>
                <p><strong>To:</strong> ${originalTo}</p>
                <p><strong>Time:</strong> ${timestamp || new Date().toLocaleString()}</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                <div style="background: white; padding: 15px; border-radius: 4px;">
                  ${messageBody}
                </div>
              </div>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/forward-sms",
        method: "POST",
        payload: JSON.stringify({ from: senderNumber, message: messageBody.substring(0, 100) }),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: true }),
        processingTimeMs: 0,
      });

      console.log(`[Zapier SMS Forward] Forwarded to ${OFFICE_FORWARDING_NUMBER}, SMS: ${smsResult.success}, Email: ${emailSent}`);

      res.json({ 
        success: true, 
        forwardedTo: OFFICE_FORWARDING_NUMBER,
        smsSent: smsResult.success,
        emailSent,
        messageId: smsResult.messageId,
      });
    } catch (error) {
      console.error("Zapier SMS forward webhook error:", error);
      res.status(500).json({ error: "Failed to forward SMS" });
    }
  });

  // Send SMS to a customer (Zapier action endpoint)
  // Zapier setup: Any trigger -> Webhooks POST to this endpoint
  app.post("/api/webhooks/zapier/send-sms", async (req, res) => {
    try {
      const { 
        to,
        phone,
        phone_number,
        message,
        body,
        template,
        customer_name
      } = req.body;

      const recipientPhone = to || phone || phone_number;
      let messageBody = message || body;

      if (!recipientPhone) {
        return res.status(400).json({ error: "Phone number is required (use 'to', 'phone', or 'phone_number' field)" });
      }

      // Use template if provided
      if (template && !messageBody) {
        const name = customer_name || "Valued Customer";
        switch (template) {
          case "acknowledgment":
            messageBody = `Hi ${name}, thank you for contacting Chicago Sewer Experts! We've received your inquiry and will be in touch shortly. For emergencies, call (630) 716-9792.`;
            break;
          case "appointment_reminder":
            messageBody = `Hi ${name}, this is a reminder about your upcoming appointment with Chicago Sewer Experts. Please reply CONFIRM to confirm or call us at (630) 716-9792 to reschedule.`;
            break;
          case "job_complete":
            messageBody = `Hi ${name}, your job with Chicago Sewer Experts has been completed. Thank you for your business! Please feel free to leave us a review.`;
            break;
          case "quote_ready":
            messageBody = `Hi ${name}, your quote from Chicago Sewer Experts is ready! Check your email for details or call us at (630) 716-9792 with any questions.`;
            break;
          default:
            return res.status(400).json({ error: `Unknown template: ${template}. Available: acknowledgment, appointment_reminder, job_complete, quote_ready` });
        }
      }

      if (!messageBody) {
        return res.status(400).json({ error: "Message is required (use 'message' or 'body' field, or specify a 'template')" });
      }

      console.log(`[Zapier Send SMS] To: ${recipientPhone}, Message: ${messageBody.substring(0, 50)}...`);

      const smsResult = await smsService.sendSMS(recipientPhone, messageBody);

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/send-sms",
        method: "POST",
        payload: JSON.stringify({ to: recipientPhone, messageLength: messageBody.length }),
        responseStatus: smsResult.success ? 200 : 500,
        responseBody: JSON.stringify({ success: smsResult.success }),
        processingTimeMs: 0,
      });

      res.json({ 
        success: smsResult.success, 
        messageId: smsResult.messageId,
        error: smsResult.error,
      });
    } catch (error) {
      console.error("Zapier send SMS webhook error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Auto-reply to incoming SMS (triggered by Zapier when SMS arrives)
  // Zapier setup: Twilio (New SMS) -> Webhooks POST to this endpoint -> Send auto-reply
  app.post("/api/webhooks/zapier/auto-reply", async (req, res) => {
    try {
      const { 
        from_number,
        from,
        message,
        body,
        reply_message,
        template
      } = req.body;

      const senderNumber = from_number || from;
      const incomingMessage = (message || body || "").toLowerCase();

      if (!senderNumber) {
        return res.status(400).json({ error: "Sender phone number is required (use 'from_number' or 'from' field)" });
      }

      // Determine reply based on template, custom message, or keyword detection
      let replyMessage = reply_message;

      if (!replyMessage && template) {
        switch (template) {
          case "acknowledgment":
            replyMessage = "Thank you for contacting Chicago Sewer Experts! A team member will respond shortly. For emergencies, call (630) 716-9792.";
            break;
          case "after_hours":
            replyMessage = "Thank you for your message. Our office is currently closed. We'll respond during business hours (Mon-Sat 7AM-7PM). For emergencies, call (630) 716-9792.";
            break;
          case "confirm_received":
            replyMessage = "Got it! Thanks for confirming.";
            break;
          default:
            replyMessage = "Thank you for your message. A team member will be in touch soon.";
        }
      }

      // Keyword-based auto-replies if no template specified
      if (!replyMessage) {
        if (incomingMessage.includes("confirm") || incomingMessage.includes("yes")) {
          replyMessage = "Thank you for confirming your appointment with Chicago Sewer Experts! See you soon.";
        } else if (incomingMessage.includes("cancel") || incomingMessage.includes("reschedule")) {
          replyMessage = "We've received your request. Please call (630) 716-9792 to reschedule your appointment.";
        } else if (incomingMessage.includes("emergency") || incomingMessage.includes("urgent")) {
          replyMessage = "For emergencies, please call us immediately at (630) 716-9792. We're available 24/7 for urgent sewer issues.";
        } else if (incomingMessage.includes("quote") || incomingMessage.includes("estimate")) {
          replyMessage = "We'd be happy to provide a free estimate! A team member will call you within the hour, or call us at (630) 716-9792.";
        } else {
          replyMessage = "Thank you for contacting Chicago Sewer Experts! A team member will respond shortly. For emergencies, call (630) 716-9792.";
        }
      }

      console.log(`[Zapier Auto-Reply] To: ${senderNumber}, Reply: ${replyMessage.substring(0, 50)}...`);

      // Send the auto-reply
      const smsResult = await smsService.sendSMS(senderNumber, replyMessage);

      // Also forward the original message to office
      const forwardMessage = `Customer text from ${senderNumber}:\n\n${message || body || "(No message)"}\n\n[Auto-reply sent]`;
      await smsService.sendSMS(OFFICE_FORWARDING_NUMBER, forwardMessage);

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/auto-reply",
        method: "POST",
        payload: JSON.stringify({ from: senderNumber, incomingMessage: (message || body || "").substring(0, 100) }),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: smsResult.success }),
        processingTimeMs: 0,
      });

      res.json({ 
        success: smsResult.success, 
        replySent: replyMessage,
        forwardedToOffice: OFFICE_FORWARDING_NUMBER,
        messageId: smsResult.messageId,
      });
    } catch (error) {
      console.error("Zapier auto-reply webhook error:", error);
      res.status(500).json({ error: "Failed to send auto-reply" });
    }
  });

  // Create job from Zapier (useful for form submissions, CRM integrations)
  app.post("/api/webhooks/zapier/create-job", async (req, res) => {
    try {
      const {
        customer_name,
        phone,
        email,
        address,
        city,
        zip_code,
        service_type,
        description,
        priority,
        scheduled_date,
        lead_id
      } = req.body;

      if (!customer_name || !phone) {
        return res.status(400).json({ error: "customer_name and phone are required" });
      }

      // First create or find the lead
      let leadId = lead_id;
      
      if (!leadId) {
        const leadData = {
          source: "Zapier",
          customerName: customer_name,
          customerPhone: phone,
          customerEmail: email,
          address,
          city,
          zipCode: zip_code,
          serviceType: service_type,
          description,
          status: "qualified" as const,
          priority: priority || "normal",
        };

        const lead = await storage.createLead(leadData);
        leadId = lead.id;
        console.log(`[Zapier Create Job] Created lead: ${leadId}`);
      }

      // Create the job with all required fields
      const jobData = {
        leadId,
        customerName: customer_name,
        customerPhone: phone,
        customerEmail: email || undefined,
        address: address || "Address TBD",
        city: city || undefined,
        zipCode: zip_code || undefined,
        serviceType: service_type || "General Service",
        description: description || `Service requested via Zapier. ${service_type || "General service"}`,
        status: "scheduled" as const,
        priority: priority || "normal",
        scheduledDate: scheduled_date ? new Date(scheduled_date) : new Date(),
        notes: `Job created via Zapier automation.`,
      };

      const job = await storage.createJob(jobData);
      console.log(`[Zapier Create Job] Created job: ${job.id}`);

      // Push job to Builder 1 for SEO content tracking
      const lead = leadId ? await storage.getLead(leadId) : undefined;
      pushJobToBuilder1(job, lead, "job_created").catch(err => {
        console.error(`[Builder1] Failed to push job_created for Zapier job ${job.id}:`, err);
      });

      // Send notification to office
      await sendEmail({
        to: OFFICE_EMAIL,
        subject: `New Job Created via Zapier: ${customer_name}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>New Job Created</h2>
            <p><strong>Customer:</strong> ${customer_name}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email || "Not provided"}</p>
            <p><strong>Address:</strong> ${address || "Not provided"}, ${city || ""} ${zip_code || ""}</p>
            <p><strong>Service:</strong> ${service_type || "Not specified"}</p>
            <p><strong>Description:</strong> ${description || "None"}</p>
            <p><strong>Scheduled:</strong> ${scheduled_date || "TBD"}</p>
          </div>
        `,
      });

      await storage.createWebhookLog({
        source: "zapier",
        endpoint: "/api/webhooks/zapier/create-job",
        method: "POST",
        payload: JSON.stringify({ customer_name, phone }),
        responseStatus: 200,
        responseBody: JSON.stringify({ success: true, jobId: job.id }),
        processingTimeMs: 0,
      });

      res.json({ 
        success: true, 
        jobId: job.id,
        leadId,
      });
    } catch (error) {
      console.error("Zapier create job webhook error:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  // Get Zapier webhook endpoints info
  app.get("/api/webhooks/zapier/info", (req, res) => {
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : "https://your-domain.replit.app";
    
    res.json({
      forwardingNumber: OFFICE_FORWARDING_NUMBER,
      endpoints: {
        createLead: {
          url: `${baseUrl}/api/webhooks/zapier/lead`,
          method: "POST",
          description: "Create a new lead in the CRM",
          fields: ["customer_name", "phone", "email", "address", "city", "zip_code", "service_type", "description", "source"]
        },
        forwardSms: {
          url: `${baseUrl}/api/webhooks/zapier/forward-sms`,
          method: "POST",
          description: "Forward incoming SMS to office number",
          fields: ["from_number", "message", "to_number"]
        },
        sendSms: {
          url: `${baseUrl}/api/webhooks/zapier/send-sms`,
          method: "POST",
          description: "Send SMS to a customer",
          fields: ["to", "message", "template", "customer_name"],
          templates: ["acknowledgment", "appointment_reminder", "job_complete", "quote_ready"]
        },
        autoReply: {
          url: `${baseUrl}/api/webhooks/zapier/auto-reply`,
          method: "POST",
          description: "Auto-reply to incoming SMS with smart responses",
          fields: ["from_number", "message", "reply_message", "template"],
          templates: ["acknowledgment", "after_hours", "confirm_received"]
        },
        createJob: {
          url: `${baseUrl}/api/webhooks/zapier/create-job`,
          method: "POST",
          description: "Create a new job from external source",
          fields: ["customer_name", "phone", "email", "address", "service_type", "description", "scheduled_date"]
        }
      }
    });
  });

  // ========================================
  // PDF DOCUMENTATION DOWNLOAD
  // ========================================

  app.get("/api/documentation/pdf", async (req, res) => {
    try {
      const doc = generateApplicationPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=Chicago-Sewer-Experts-CRM-Documentation.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.get("/api/docs/comparison", async (req, res) => {
    try {
      const doc = generateComparisonPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-vs-HomeAdvisor-Pro-Comparison.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Comparison PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate comparison PDF" });
    }
  });

  app.get("/api/docs/test-results", async (req, res) => {
    try {
      const doc = generateTestResultsPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-Test-Results.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Test results PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate test results PDF" });
    }
  });

  app.get("/api/docs/housecall-comparison", async (req, res) => {
    try {
      const doc = generateHouseCallProComparisonPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-vs-HouseCall-Pro.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("HouseCall Pro comparison PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate HouseCall Pro comparison PDF" });
    }
  });

  // README PDF - Comprehensive system documentation
  app.get("/api/docs/readme", async (req, res) => {
    try {
      const doc = generateReadmePDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=Emergency-Chicago-Sewer-Experts-CRM-README.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("README PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate README PDF" });
    }
  });

  // Chat System PDF - Thread-based chat workflow guide
  app.get("/api/docs/chat-system", async (req, res) => {
    try {
      const doc = generateChatSystemPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=Chat-System-Workflow-Guide.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Chat System PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate chat system PDF" });
    }
  });

  // 3-way comparison PDF (CSE vs HomeAdvisor vs HouseCall Pro)
  app.get("/api/docs/three-way-comparison", async (req, res) => {
    try {
      const doc = generateThreeWayComparisonPDF();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=CSE-CRM-Competitor-Comparison.pdf");
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Three-way comparison PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate comparison PDF" });
    }
  });

  // Business Intake Form endpoints (public - no auth required)
  app.post("/api/business-intake", async (req, res) => {
    try {
      const result = insertBusinessIntakeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }
      
      const intake = await storage.createBusinessIntake(result.data);
      
      // Send notification email about new intake
      sendEmail({
        to: "CSEINTAKETEST@webslingerai.com",
        subject: `New Business Intake: ${result.data.businessName}`,
        html: `
          <h2>New Business Onboarding Request</h2>
          <p><strong>Business:</strong> ${result.data.businessName}</p>
          <p><strong>Owner:</strong> ${result.data.ownerName}</p>
          <p><strong>Phone:</strong> ${result.data.ownerPhone}</p>
          <p><strong>Email:</strong> ${result.data.ownerEmail}</p>
          <p><strong>Business Type:</strong> ${result.data.businessType || "Not specified"}</p>
          <p><strong>Service Area:</strong> ${result.data.serviceArea || "Not specified"}</p>
          <hr>
          <p><strong>Priority Features:</strong></p>
          <p>${result.data.priorityFeatures || "Not specified"}</p>
          <p><strong>Automation Goals:</strong></p>
          <p>${result.data.automationGoals || "Not specified"}</p>
        `,
      }).catch(err => console.error("Failed to send intake notification:", err));
      
      res.status(201).json({ 
        success: true, 
        message: "Intake form submitted successfully",
        id: intake.id 
      });
    } catch (error) {
      console.error("Business intake submission error:", error);
      res.status(500).json({ error: "Failed to submit intake form" });
    }
  });

  // Get all intakes (admin only)
  app.get("/api/business-intakes", async (req, res) => {
    try {
      const intakes = await storage.getAllBusinessIntakes();
      res.json(intakes);
    } catch (error) {
      console.error("Error fetching business intakes:", error);
      res.status(500).json({ error: "Failed to fetch intakes" });
    }
  });

  // Get single intake
  app.get("/api/business-intakes/:id", async (req, res) => {
    try {
      const intake = await storage.getBusinessIntake(req.params.id);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error) {
      console.error("Error fetching business intake:", error);
      res.status(500).json({ error: "Failed to fetch intake" });
    }
  });

  // Update intake status (admin review)
  app.patch("/api/business-intakes/:id", async (req, res) => {
    try {
      const intake = await storage.updateBusinessIntake(req.params.id, req.body);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error) {
      console.error("Error updating business intake:", error);
      res.status(500).json({ error: "Failed to update intake" });
    }
  });

  // ============================================
  // COMPANY SETTINGS
  // ============================================
  
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateCompanySettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============================================
  // TIME ENTRIES (Clock In/Out)
  // ============================================
  
  app.get("/api/time-entries", async (req, res) => {
    try {
      const { userId, technicianId, startDate, endDate } = req.query;
      let entries;
      
      if (technicianId) {
        entries = await storage.getTimeEntriesByTechnician(
          technicianId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else if (userId) {
        entries = await storage.getTimeEntriesByUser(
          userId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else {
        return res.status(400).json({ error: "userId or technicianId required" });
      }
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  app.post("/api/time-entries", async (req, res) => {
    try {
      const data = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        clockIn: req.body.clockIn ? new Date(req.body.clockIn) : undefined,
        clockOut: req.body.clockOut ? new Date(req.body.clockOut) : undefined,
      };
      const validatedData = insertTimeEntrySchema.parse(data);
      const entry = await storage.createTimeEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  app.patch("/api/time-entries/:id", async (req, res) => {
    try {
      const entry = await storage.updateTimeEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ error: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTimeEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });

  // ============================================
  // PAYROLL PERIODS
  // ============================================
  
  app.get("/api/payroll/periods", async (req, res) => {
    try {
      const periods = await storage.getPayrollPeriods();
      res.json(periods);
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      res.status(500).json({ error: "Failed to fetch payroll periods" });
    }
  });

  app.get("/api/payroll/periods/current", async (req, res) => {
    try {
      const period = await storage.getCurrentPayrollPeriod();
      res.json(period || null);
    } catch (error) {
      console.error("Error fetching current payroll period:", error);
      res.status(500).json({ error: "Failed to fetch current payroll period" });
    }
  });

  app.get("/api/payroll/periods/:id", async (req, res) => {
    try {
      const period = await storage.getPayrollPeriod(req.params.id);
      if (!period) {
        return res.status(404).json({ error: "Payroll period not found" });
      }
      res.json(period);
    } catch (error) {
      console.error("Error fetching payroll period:", error);
      res.status(500).json({ error: "Failed to fetch payroll period" });
    }
  });

  app.post("/api/payroll/periods", async (req, res) => {
    try {
      const data = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        processedAt: req.body.processedAt ? new Date(req.body.processedAt) : undefined,
      };
      const validatedData = insertPayrollPeriodSchema.parse(data);
      const period = await storage.createPayrollPeriod(validatedData);
      res.status(201).json(period);
    } catch (error) {
      console.error("Error creating payroll period:", error);
      res.status(500).json({ error: "Failed to create payroll period" });
    }
  });

  app.patch("/api/payroll/periods/:id", async (req, res) => {
    try {
      const period = await storage.updatePayrollPeriod(req.params.id, req.body);
      if (!period) {
        return res.status(404).json({ error: "Payroll period not found" });
      }
      res.json(period);
    } catch (error) {
      console.error("Error updating payroll period:", error);
      res.status(500).json({ error: "Failed to update payroll period" });
    }
  });

  // ============================================
  // PAYROLL RECORDS
  // ============================================
  
  app.get("/api/payroll/records", async (req, res) => {
    try {
      const { periodId, userId } = req.query;
      let records;
      
      if (periodId) {
        records = await storage.getPayrollRecordsByPeriod(periodId as string);
      } else if (userId) {
        records = await storage.getPayrollRecordsByUser(userId as string);
      } else {
        return res.status(400).json({ error: "periodId or userId required" });
      }
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ error: "Failed to fetch payroll records" });
    }
  });

  app.get("/api/payroll/records/:id", async (req, res) => {
    try {
      const record = await storage.getPayrollRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: "Payroll record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching payroll record:", error);
      res.status(500).json({ error: "Failed to fetch payroll record" });
    }
  });

  app.post("/api/payroll/records", async (req, res) => {
    try {
      const validatedData = insertPayrollRecordSchema.parse(req.body);
      const record = await storage.createPayrollRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating payroll record:", error);
      res.status(500).json({ error: "Failed to create payroll record" });
    }
  });

  app.patch("/api/payroll/records/:id", async (req, res) => {
    try {
      const record = await storage.updatePayrollRecord(req.params.id, req.body);
      if (!record) {
        return res.status(404).json({ error: "Payroll record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error updating payroll record:", error);
      res.status(500).json({ error: "Failed to update payroll record" });
    }
  });

  // ============================================
  // EMPLOYEE PAY RATES
  // ============================================
  
  app.get("/api/pay-rates", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }
      const rates = await storage.getEmployeePayRatesByUser(userId as string);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching pay rates:", error);
      res.status(500).json({ error: "Failed to fetch pay rates" });
    }
  });

  app.get("/api/pay-rates/active/:userId", async (req, res) => {
    try {
      const rate = await storage.getActiveEmployeePayRate(req.params.userId);
      res.json(rate || null);
    } catch (error) {
      console.error("Error fetching active pay rate:", error);
      res.status(500).json({ error: "Failed to fetch active pay rate" });
    }
  });

  app.post("/api/pay-rates", async (req, res) => {
    try {
      const data = {
        ...req.body,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
      };
      const validatedData = insertEmployeePayRateSchema.parse(data);
      const rate = await storage.createEmployeePayRate(validatedData);
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating pay rate:", error);
      res.status(500).json({ error: "Failed to create pay rate" });
    }
  });

  app.patch("/api/pay-rates/:id", async (req, res) => {
    try {
      const rate = await storage.updateEmployeePayRate(req.params.id, req.body);
      if (!rate) {
        return res.status(404).json({ error: "Pay rate not found" });
      }
      res.json(rate);
    } catch (error) {
      console.error("Error updating pay rate:", error);
      res.status(500).json({ error: "Failed to update pay rate" });
    }
  });

  // ============================================
  // JOB LEAD FEES
  // ============================================
  
  app.get("/api/lead-fees", async (req, res) => {
    try {
      const { jobId, technicianId } = req.query;
      let fees;
      
      if (jobId) {
        fees = await storage.getJobLeadFeesByJob(jobId as string);
      } else if (technicianId) {
        fees = await storage.getJobLeadFeesByTechnician(technicianId as string);
      } else {
        return res.status(400).json({ error: "jobId or technicianId required" });
      }
      res.json(fees);
    } catch (error) {
      console.error("Error fetching lead fees:", error);
      res.status(500).json({ error: "Failed to fetch lead fees" });
    }
  });

  app.post("/api/lead-fees", async (req, res) => {
    try {
      const validatedData = insertJobLeadFeeSchema.parse(req.body);
      const fee = await storage.createJobLeadFee(validatedData);
      res.status(201).json(fee);
    } catch (error) {
      console.error("Error creating lead fee:", error);
      res.status(500).json({ error: "Failed to create lead fee" });
    }
  });

  app.patch("/api/lead-fees/:id", async (req, res) => {
    try {
      const fee = await storage.updateJobLeadFee(req.params.id, req.body);
      if (!fee) {
        return res.status(404).json({ error: "Lead fee not found" });
      }
      res.json(fee);
    } catch (error) {
      console.error("Error updating lead fee:", error);
      res.status(500).json({ error: "Failed to update lead fee" });
    }
  });

  // ============================================
  // JOB REVENUE EVENTS
  // ============================================
  
  app.get("/api/revenue-events", async (req, res) => {
    try {
      const { jobId, technicianId } = req.query;
      let events;
      
      if (jobId) {
        events = await storage.getJobRevenueEventsByJob(jobId as string);
      } else if (technicianId) {
        events = await storage.getJobRevenueEventsByTechnician(technicianId as string);
      } else {
        return res.status(400).json({ error: "jobId or technicianId required" });
      }
      res.json(events);
    } catch (error) {
      console.error("Error fetching revenue events:", error);
      res.status(500).json({ error: "Failed to fetch revenue events" });
    }
  });

  app.post("/api/revenue-events", async (req, res) => {
    try {
      const validatedData = insertJobRevenueEventSchema.parse(req.body);
      const event = await storage.createJobRevenueEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating revenue event:", error);
      res.status(500).json({ error: "Failed to create revenue event" });
    }
  });

  app.patch("/api/revenue-events/:id", async (req, res) => {
    try {
      const event = await storage.updateJobRevenueEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Revenue event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating revenue event:", error);
      res.status(500).json({ error: "Failed to update revenue event" });
    }
  });

  // ============================================
  // QUOTE LINE ITEMS
  // ============================================
  
  app.get("/api/quotes/:quoteId/line-items", async (req, res) => {
    try {
      const items = await storage.getQuoteLineItems(req.params.quoteId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching quote line items:", error);
      res.status(500).json({ error: "Failed to fetch line items" });
    }
  });

  app.post("/api/quotes/:quoteId/line-items", async (req, res) => {
    try {
      const validatedData = insertQuoteLineItemSchema.parse({
        ...req.body,
        quoteId: req.params.quoteId,
      });
      const item = await storage.createQuoteLineItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating quote line item:", error);
      res.status(500).json({ error: "Failed to create line item" });
    }
  });

  app.patch("/api/quote-line-items/:id", async (req, res) => {
    try {
      const item = await storage.updateQuoteLineItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Line item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating quote line item:", error);
      res.status(500).json({ error: "Failed to update line item" });
    }
  });

  app.delete("/api/quote-line-items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuoteLineItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Line item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quote line item:", error);
      res.status(500).json({ error: "Failed to delete line item" });
    }
  });

  // ============================================
  // SEO CONTENT MANAGEMENT
  // ============================================

  app.get("/api/content-packs", async (req, res) => {
    try {
      const packs = await storage.getContentPacks();
      res.json(packs);
    } catch (error) {
      console.error("Error fetching content packs:", error);
      res.status(500).json({ error: "Failed to fetch content packs" });
    }
  });

  app.get("/api/content-packs/:id", async (req, res) => {
    try {
      const pack = await storage.getContentPack(req.params.id);
      if (!pack) {
        return res.status(404).json({ error: "Content pack not found" });
      }
      const items = await storage.getContentItemsByPack(pack.id);
      res.json({ pack, items });
    } catch (error) {
      console.error("Error fetching content pack:", error);
      res.status(500).json({ error: "Failed to fetch content pack" });
    }
  });

  app.get("/api/jobs/:jobId/content-packs", async (req, res) => {
    try {
      const packs = await storage.getContentPacksByJob(req.params.jobId);
      res.json(packs);
    } catch (error) {
      console.error("Error fetching content packs for job:", error);
      res.status(500).json({ error: "Failed to fetch content packs" });
    }
  });

  // Webhook endpoint for receiving SEO content from webslingeraiglassseo.com
  app.post("/api/webhooks/seo-content", async (req, res) => {
    try {
      const { pack: packData, items: itemsData, signature, timestamp, autoApprove } = req.body;
      
      // Get company settings for webhook verification
      const settings = await storage.getCompanySettings();
      
      // Verify webhook signature (HMAC)
      if (settings?.seoWebhookSecret) {
        const crypto = await import("crypto");
        const expectedSignature = crypto
          .createHmac("sha256", settings.seoWebhookSecret)
          .update(`${timestamp}.${JSON.stringify(packData)}`)
          .digest("hex");
        
        if (signature !== expectedSignature) {
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
        
        // Check timestamp to prevent replay attacks (5 minute window)
        const timestampAge = Date.now() - new Date(timestamp).getTime();
        if (timestampAge > 5 * 60 * 1000) {
          return res.status(401).json({ error: "Webhook timestamp too old" });
        }
      }
      
      // Determine if content should be auto-approved
      const shouldAutoApprove = autoApprove && settings?.seoAutoApprove;
      
      // Create the content pack
      const pack = await storage.createContentPack({
        externalId: packData.externalId,
        jobId: packData.jobId || null,
        format: packData.format || "seo_money",
        geoTarget: packData.geoTarget,
        status: shouldAutoApprove ? "approved" : "received",
        sourceUrl: packData.sourceUrl,
        autoApproved: shouldAutoApprove,
      });
      
      // Create content items
      const createdItems = [];
      for (const itemData of itemsData || []) {
        const item = await storage.createContentItem({
          externalId: itemData.externalId,
          contentPackId: pack.id,
          type: itemData.type,
          title: itemData.title,
          body: itemData.body,
          html: itemData.html,
          slug: itemData.slug,
          metaTitle: itemData.metaTitle,
          metaDescription: itemData.metaDescription,
          primaryKeyword: itemData.primaryKeyword,
          secondaryKeywords: itemData.secondaryKeywords,
          localModifiers: itemData.localModifiers,
          searchIntent: itemData.searchIntent,
          status: shouldAutoApprove ? "approved" : "received",
        });
        createdItems.push(item);
      }
      
      res.status(201).json({ 
        success: true, 
        pack, 
        items: createdItems,
        autoApproved: shouldAutoApprove 
      });
    } catch (error) {
      console.error("Error receiving SEO content webhook:", error);
      res.status(500).json({ error: "Failed to process SEO content" });
    }
  });

  // Approve a content pack (and all its items)
  app.post("/api/content-packs/:id/approve", async (req, res) => {
    try {
      const { userId } = req.body;
      const pack = await storage.updateContentPack(req.params.id, {
        status: "approved",
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: null,
      });
      if (!pack) {
        return res.status(404).json({ error: "Content pack not found" });
      }
      
      // Approve all items in the pack
      const items = await storage.getContentItemsByPack(pack.id);
      for (const item of items) {
        await storage.updateContentItem(item.id, {
          status: "approved",
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: null,
        });
      }
      
      const updatedItems = await storage.getContentItemsByPack(pack.id);
      res.json({ pack, items: updatedItems });
    } catch (error) {
      console.error("Error approving content pack:", error);
      res.status(500).json({ error: "Failed to approve content pack" });
    }
  });

  // Reject a content pack (and all its items)
  app.post("/api/content-packs/:id/reject", async (req, res) => {
    try {
      const { userId, reason } = req.body;
      const pack = await storage.updateContentPack(req.params.id, {
        status: "rejected",
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: reason || "Rejected by reviewer",
      });
      if (!pack) {
        return res.status(404).json({ error: "Content pack not found" });
      }
      
      // Reject all items in the pack
      const items = await storage.getContentItemsByPack(pack.id);
      for (const item of items) {
        await storage.updateContentItem(item.id, {
          status: "rejected",
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: reason || "Rejected with pack",
        });
      }
      
      const updatedItems = await storage.getContentItemsByPack(pack.id);
      res.json({ pack, items: updatedItems });
    } catch (error) {
      console.error("Error rejecting content pack:", error);
      res.status(500).json({ error: "Failed to reject content pack" });
    }
  });

  // Approve individual content item
  app.post("/api/content-items/:id/approve", async (req, res) => {
    try {
      const { userId } = req.body;
      const item = await storage.updateContentItem(req.params.id, {
        status: "approved",
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: null,
      });
      if (!item) {
        return res.status(404).json({ error: "Content item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error approving content item:", error);
      res.status(500).json({ error: "Failed to approve content item" });
    }
  });

  // Reject individual content item
  app.post("/api/content-items/:id/reject", async (req, res) => {
    try {
      const { userId, reason } = req.body;
      const item = await storage.updateContentItem(req.params.id, {
        status: "rejected",
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: reason || "Rejected by reviewer",
      });
      if (!item) {
        return res.status(404).json({ error: "Content item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error rejecting content item:", error);
      res.status(500).json({ error: "Failed to reject content item" });
    }
  });

  app.patch("/api/content-packs/:id", async (req, res) => {
    try {
      const pack = await storage.updateContentPack(req.params.id, req.body);
      if (!pack) {
        return res.status(404).json({ error: "Content pack not found" });
      }
      res.json(pack);
    } catch (error) {
      console.error("Error updating content pack:", error);
      res.status(500).json({ error: "Failed to update content pack" });
    }
  });

  app.delete("/api/content-packs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContentPack(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Content pack not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting content pack:", error);
      res.status(500).json({ error: "Failed to delete content pack" });
    }
  });

  app.get("/api/content-items", async (req, res) => {
    try {
      const items = await storage.getContentItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching content items:", error);
      res.status(500).json({ error: "Failed to fetch content items" });
    }
  });

  app.get("/api/content-items/:id", async (req, res) => {
    try {
      const item = await storage.getContentItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Content item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching content item:", error);
      res.status(500).json({ error: "Failed to fetch content item" });
    }
  });

  app.patch("/api/content-items/:id", async (req, res) => {
    try {
      const item = await storage.updateContentItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Content item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating content item:", error);
      res.status(500).json({ error: "Failed to update content item" });
    }
  });

  app.delete("/api/content-items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContentItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Content item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting content item:", error);
      res.status(500).json({ error: "Failed to delete content item" });
    }
  });

  app.post("/api/content-items/:id/publish", async (req, res) => {
    try {
      const item = await storage.updateContentItem(req.params.id, {
        status: "published",
        publishedAt: new Date(),
        publishedUrl: req.body.publishedUrl
      });
      if (!item) {
        return res.status(404).json({ error: "Content item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error publishing content item:", error);
      res.status(500).json({ error: "Failed to publish content item" });
    }
  });

  // ============================================
  // THREAD-BASED CHAT API
  // ============================================

  // GET threads list for current user
  app.get("/api/chat/threads", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const { status, visibility } = req.query as { status?: string; visibility?: string };
      
      const threads = await storage.getChatThreadsForUser(user.id, {
        status: status || 'active',
        visibility: visibility === 'any' ? undefined : visibility
      });
      
      // Enrich with participants, unread counts, and last message preview
      const enrichedThreads = await Promise.all(threads.map(async (thread) => {
        const participants = await storage.getChatThreadParticipants(thread.id);
        const unreadCount = await storage.getUnreadCountForParticipant(thread.id, 'user', user.id);
        const messages = await storage.getChatMessages(thread.id, { limit: 1 });
        const lastMessage = messages[0] || null;
        
        // Get job info if related
        let job = null;
        if (thread.relatedJobId) {
          job = await storage.getJob(thread.relatedJobId);
        }
        
        return {
          ...thread,
          participants,
          unreadCount,
          lastMessagePreview: lastMessage ? {
            body: lastMessage.body.substring(0, 100),
            senderDisplayName: lastMessage.senderDisplayName,
            createdAt: lastMessage.createdAt
          } : null,
          job: job ? {
            id: job.id,
            customerName: job.customerName,
            serviceType: job.serviceType,
            status: job.status
          } : null
        };
      }));
      
      res.json(enrichedThreads);
    } catch (error) {
      console.error("Error fetching chat threads:", error);
      res.status(500).json({ error: "Failed to fetch chat threads" });
    }
  });

  // GET unread count for current user
  app.get("/api/chat/unread-count", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) {
      return res.json({ unreadCount: 0 });
    }
    
    try {
      const user = req.user as User;
      const count = await storage.getTotalUnreadCountForUser(user.id);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.json({ unreadCount: 0 });
    }
  });

  // CREATE internal thread (dispatch/tech/admin)
  app.post("/api/chat/threads", async (req, res) => {
    console.log("POST /api/chat/threads - isAuthenticated:", typeof req.isAuthenticated, req.isAuthenticated?.(), "user:", req.user?.id);
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const { participant_user_ids, subject, related_job_id, visibility } = req.body as {
        participant_user_ids: string[];
        subject?: string;
        related_job_id?: string;
        visibility: 'internal';
      };
      
      // Only internal threads allowed via this endpoint
      if (visibility !== 'internal') {
        return res.status(400).json({ error: "Only internal threads can be created via this endpoint" });
      }
      
      // Validate participants are users
      const validUsers = [];
      for (const userId of participant_user_ids) {
        const u = await storage.getUser(userId);
        if (u) validUsers.push(u);
      }
      
      // Tech can only create threads with dispatch/admin
      if (user.role === 'technician') {
        const hasDispatchOrAdmin = validUsers.some(u => u.role === 'dispatcher' || u.role === 'admin');
        if (!hasDispatchOrAdmin) {
          return res.status(403).json({ error: "Technicians must include at least one dispatcher or admin" });
        }
      }
      
      // Create thread
      const thread = await storage.createChatThread({
        visibility: 'internal',
        subject: subject || null,
        relatedJobId: related_job_id || null,
        createdByType: 'user',
        createdById: user.id,
        lastMessageAt: null
      });
      
      // Add creator as participant
      await storage.addChatThreadParticipant({
        threadId: thread.id,
        participantType: 'user',
        participantId: user.id,
        roleAtTime: user.role,
        displayName: user.fullName || user.username
      });
      
      // Add other participants
      for (const participantUser of validUsers) {
        if (participantUser.id !== user.id) {
          await storage.addChatThreadParticipant({
            threadId: thread.id,
            participantType: 'user',
            participantId: participantUser.id,
            roleAtTime: participantUser.role,
            displayName: participantUser.fullName || participantUser.username
          });
        }
      }
      
      res.json(thread);
    } catch (error) {
      console.error("Error creating chat thread:", error);
      res.status(500).json({ error: "Failed to create chat thread" });
    }
  });

  // GET thread details + messages
  app.get("/api/chat/threads/:threadId", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const thread = await storage.getChatThread(req.params.threadId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      
      // Check participant
      const isParticipant = await storage.isUserParticipant(thread.id, user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      const participants = await storage.getChatThreadParticipants(thread.id);
      const messages = await storage.getChatMessages(thread.id, { limit: 50 });
      
      // Get job info
      let job = null;
      if (thread.relatedJobId) {
        job = await storage.getJob(thread.relatedJobId);
      }
      
      res.json({
        ...thread,
        participants,
        messages,
        job: job ? {
          id: job.id,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          address: job.address,
          serviceType: job.serviceType,
          status: job.status
        } : null
      });
    } catch (error) {
      console.error("Error fetching chat thread:", error);
      res.status(500).json({ error: "Failed to fetch chat thread" });
    }
  });

  // GET thread messages with pagination
  app.get("/api/chat/threads/:threadId/messages", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const thread = await storage.getChatThread(req.params.threadId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      
      const isParticipant = await storage.isUserParticipant(thread.id, user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      const { limit, before } = req.query as { limit?: string; before?: string };
      const messages = await storage.getChatMessages(thread.id, {
        limit: limit ? parseInt(limit) : 50,
        before: before ? new Date(before) : undefined
      });
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // SEND message to thread
  app.post("/api/chat/threads/:threadId/messages", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const thread = await storage.getChatThread(req.params.threadId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      
      // Check thread is active
      if (thread.status === 'closed') {
        return res.status(400).json({ error: "Cannot send messages to a closed thread" });
      }
      
      const isParticipant = await storage.isUserParticipant(thread.id, user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      const { body, client_msg_id } = req.body as { body: string; client_msg_id?: string };
      
      // Validate body
      const trimmedBody = (body || '').trim();
      if (!trimmedBody || trimmedBody.length < 1 || trimmedBody.length > 4000) {
        return res.status(400).json({ error: "Message body must be 1-4000 characters" });
      }
      
      const message = await storage.createChatMessage({
        threadId: thread.id,
        senderType: 'user',
        senderId: user.id,
        senderDisplayName: user.fullName || user.username,
        body: trimmedBody,
        clientMsgId: client_msg_id || null,
        meta: {}
      });
      
      // TODO: Emit WebSocket event to participants
      // TODO: Send email notification to customer if customer_visible thread
      
      res.json(message);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ error: "Failed to send chat message" });
    }
  });

  // MARK thread as read
  app.post("/api/chat/threads/:threadId/read", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      const thread = await storage.getChatThread(req.params.threadId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      
      const isParticipant = await storage.isUserParticipant(thread.id, user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      await storage.updateChatThreadParticipantLastRead(thread.id, 'user', user.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking thread read:", error);
      res.status(500).json({ error: "Failed to mark thread as read" });
    }
  });

  // CLOSE thread (dispatch/admin only)
  app.post("/api/chat/threads/:threadId/close", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      
      // Only dispatch/admin can close threads
      if (user.role !== 'dispatcher' && user.role !== 'admin') {
        return res.status(403).json({ error: "Only dispatchers and admins can close threads" });
      }
      
      const thread = await storage.getChatThread(req.params.threadId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      
      const updated = await storage.updateChatThread(thread.id, { status: 'closed' });
      
      res.json(updated);
    } catch (error) {
      console.error("Error closing chat thread:", error);
      res.status(500).json({ error: "Failed to close chat thread" });
    }
  });

  // GET or CREATE customer-visible thread for job
  app.post("/api/chat/jobs/:jobId/customer-thread", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      
      // Only dispatch/admin can create customer threads
      if (user.role !== 'dispatcher' && user.role !== 'admin') {
        return res.status(403).json({ error: "Only dispatchers and admins can create customer threads" });
      }
      
      const job = await storage.getJob(req.params.jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      // Check if customer has opted in to in-app messaging
      if (!job.customerConsentInAppMessaging) {
        return res.status(400).json({ error: "Customer has not opted in to in-app messaging" });
      }
      
      // Check if thread already exists
      let thread = await storage.getChatThreadByJob(job.id, 'customer_visible');
      
      if (!thread) {
        const { subject } = req.body as { subject?: string };
        
        // Create thread
        thread = await storage.createChatThread({
          visibility: 'customer_visible',
          subject: subject || `Job #${job.id.substring(0, 8)} - ${job.serviceType}`,
          relatedJobId: job.id,
          createdByType: 'user',
          createdById: user.id,
          lastMessageAt: null
        });
        
        // Add customer as participant (using phone as identifier)
        await storage.addChatThreadParticipant({
          threadId: thread.id,
          participantType: 'customer',
          participantId: job.customerPhone,
          roleAtTime: 'customer',
          displayName: job.customerName
        });
        
        // Add assigned technician if any
        if (job.assignedTechnicianId) {
          const tech = await storage.getTechnician(job.assignedTechnicianId);
          if (tech?.userId) {
            const techUser = await storage.getUser(tech.userId);
            if (techUser) {
              await storage.addChatThreadParticipant({
                threadId: thread.id,
                participantType: 'user',
                participantId: techUser.id,
                roleAtTime: 'technician',
                displayName: techUser.fullName || techUser.username
              });
            }
          }
        }
        
        // Add the creating dispatcher
        await storage.addChatThreadParticipant({
          threadId: thread.id,
          participantType: 'user',
          participantId: user.id,
          roleAtTime: user.role,
          displayName: user.fullName || user.username
        });
      }
      
      res.json(thread);
    } catch (error) {
      console.error("Error creating customer thread:", error);
      res.status(500).json({ error: "Failed to create customer thread" });
    }
  });

  // CREATE magic link session for customer
  app.post("/api/chat/jobs/:jobId/customer-session", async (req, res) => {
    if (!(await isAuthenticatedUser(req))) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const user = req.user as User;
      
      // Only dispatch/admin can create magic links
      if (user.role !== 'dispatcher' && user.role !== 'admin') {
        return res.status(403).json({ error: "Only dispatchers and admins can create customer sessions" });
      }
      
      const job = await storage.getJob(req.params.jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      if (!job.customerConsentInAppMessaging) {
        return res.status(400).json({ error: "Customer has not opted in to in-app messaging" });
      }
      
      const { expires_in_minutes, delivery_method } = req.body as { 
        expires_in_minutes?: number;
        delivery_method?: 'sms' | 'email' | 'none';
      };
      
      // Generate token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (expires_in_minutes || 10080)); // Default 7 days
      
      const session = await storage.createChatMagicSession({
        jobId: job.id,
        customerIdentifier: job.customerPhone,
        tokenHash,
        expiresAt
      });
      
      // Generate magic link URL
      const baseUrl = process.env.BASE_URL || 'https://chicagosewerexpertsapp.com';
      const magicLink = `${baseUrl}/customer/chat?jobId=${job.id}&token=${token}`;
      
      let deliveryResult = null;
      
      // Validate delivery method has required contact info
      if (delivery_method === 'sms' && !job.customerPhone) {
        return res.status(400).json({ error: "Cannot send SMS - no phone number on file" });
      }
      if (delivery_method === 'email' && !job.customerEmail) {
        return res.status(400).json({ error: "Cannot send email - no email address on file" });
      }
      
      // Send via SMS if requested
      if (delivery_method === 'sms' && job.customerPhone) {
        const { sendChatInvite } = await import('./services/sms');
        const smsResult = await sendChatInvite(
          job.customerPhone,
          job.customerName,
          magicLink
        );
        deliveryResult = { method: 'sms', success: smsResult.success, error: smsResult.error };
      } 
      // Send via email if requested
      else if (delivery_method === 'email' && job.customerEmail) {
        const { sendEmail } = await import('./services/email');
        const emailResult = await sendEmail({
          to: job.customerEmail,
          subject: 'Chat with Chicago Sewer Experts',
          html: `
            <p>Hi ${job.customerName},</p>
            <p>We need to communicate with you about your service.</p>
            <p><a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Chat</a></p>
            <p>Or copy this link: ${magicLink}</p>
            <p>This link expires in 7 days.</p>
            <p>Thank you,<br>Chicago Sewer Experts</p>
          `,
          text: `Hi ${job.customerName}, we need to communicate with you about your service. Open this link to chat with us: ${magicLink}. This link expires in 7 days.`
        });
        deliveryResult = { method: 'email', success: emailResult.success, error: emailResult.error };
      }
      
      res.json({
        sessionId: session.id,
        magicLink,
        expiresAt,
        delivery: deliveryResult
      });
    } catch (error) {
      console.error("Error creating customer session:", error);
      res.status(500).json({ error: "Failed to create customer session" });
    }
  });

  // CUSTOMER SESSION EXCHANGE (public - validates magic link)
  app.post("/api/chat/customer/session", async (req, res) => {
    try {
      const { jobId, token } = req.body as { jobId: string; token: string };
      
      if (!jobId || !token) {
        return res.status(400).json({ error: "Missing jobId or token" });
      }
      
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const session = await storage.getChatMagicSession(jobId, tokenHash);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      // Update last used
      await storage.updateChatMagicSessionLastUsed(session.id);
      
      // Get job for customer info
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      // Set customer session cookie
      (req.session as any).customerSession = {
        jobId,
        customerIdentifier: session.customerIdentifier,
        sessionId: session.id
      };
      
      res.json({
        customerName: job.customerName,
        jobId: job.id,
        serviceType: job.serviceType
      });
    } catch (error) {
      console.error("Error validating customer session:", error);
      res.status(500).json({ error: "Failed to validate session" });
    }
  });

  // CUSTOMER: Get thread for their job
  app.get("/api/chat/customer/jobs/:jobId/thread", async (req, res) => {
    try {
      const customerSession = (req.session as any).customerSession;
      if (!customerSession || customerSession.jobId !== req.params.jobId) {
        return res.status(401).json({ error: "Customer session required" });
      }
      
      const thread = await storage.getChatThreadByJob(req.params.jobId, 'customer_visible');
      if (!thread) {
        return res.status(404).json({ error: "No chat thread exists for this job" });
      }
      
      // Verify customer is participant
      const isParticipant = await storage.isCustomerParticipant(thread.id, customerSession.customerIdentifier);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const participants = await storage.getChatThreadParticipants(thread.id);
      const messages = await storage.getChatMessages(thread.id, { limit: 50 });
      
      res.json({
        ...thread,
        participants: participants.filter(p => p.participantType === 'user').map(p => ({
          displayName: p.displayName,
          roleAtTime: p.roleAtTime
        })),
        messages
      });
    } catch (error) {
      console.error("Error fetching customer thread:", error);
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  // CUSTOMER: Send message
  app.post("/api/chat/customer/jobs/:jobId/thread/messages", async (req, res) => {
    try {
      const customerSession = (req.session as any).customerSession;
      if (!customerSession || customerSession.jobId !== req.params.jobId) {
        return res.status(401).json({ error: "Customer session required" });
      }
      
      const thread = await storage.getChatThreadByJob(req.params.jobId, 'customer_visible');
      if (!thread) {
        return res.status(404).json({ error: "No chat thread exists for this job" });
      }
      
      if (thread.status === 'closed') {
        return res.status(400).json({ error: "This conversation has been closed" });
      }
      
      const isParticipant = await storage.isCustomerParticipant(thread.id, customerSession.customerIdentifier);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { body, client_msg_id } = req.body as { body: string; client_msg_id?: string };
      
      const trimmedBody = (body || '').trim();
      if (!trimmedBody || trimmedBody.length < 1 || trimmedBody.length > 4000) {
        return res.status(400).json({ error: "Message body must be 1-4000 characters" });
      }
      
      const job = await storage.getJob(req.params.jobId);
      
      const message = await storage.createChatMessage({
        threadId: thread.id,
        senderType: 'customer',
        senderId: customerSession.customerIdentifier,
        senderDisplayName: job?.customerName || 'Customer',
        body: trimmedBody,
        clientMsgId: client_msg_id || null,
        meta: {
          ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });
      
      // TODO: Emit WebSocket event to staff participants
      
      res.json(message);
    } catch (error) {
      console.error("Error sending customer message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // CUSTOMER: Mark as read
  app.post("/api/chat/customer/jobs/:jobId/thread/read", async (req, res) => {
    try {
      const customerSession = (req.session as any).customerSession;
      if (!customerSession || customerSession.jobId !== req.params.jobId) {
        return res.status(401).json({ error: "Customer session required" });
      }
      
      const thread = await storage.getChatThreadByJob(req.params.jobId, 'customer_visible');
      if (!thread) {
        return res.status(404).json({ error: "No chat thread exists for this job" });
      }
      
      await storage.updateChatThreadParticipantLastRead(thread.id, 'customer', customerSession.customerIdentifier);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking customer thread read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  return httpServer;
}
