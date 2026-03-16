import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertJobSchema,
  insertJobTimelineEventSchema,
  insertQuoteSchema,
  insertNotificationSchema,
  insertTechnicianSchema,
  insertShiftLogSchema,
  insertQuoteTemplateSchema,
  insertJobAttachmentSchema,
  insertJobChecklistSchema,
  insertChecklistTemplateSchema,
  insertPricebookItemSchema,
  insertPricebookCategorySchema,
  insertTimeEntrySchema,
  insertPayrollPeriodSchema,
  insertPayrollRecordSchema,
  insertEmployeePayRateSchema,
  insertJobLeadFeeSchema,
  insertJobRevenueEventSchema,
  insertQuoteLineItemSchema,
} from "@shared/schema";
import { sendEmail } from "./services/email";
import { isWithinRadius } from "./geocoding";
import { 
  autoAssignTechnician, 
  cancelJob, 
  updateJobCosts, 
  completeJob,
  sendAppointmentReminder,
  sendTechnicianEnRouteSMS,
  sendJobCompleteSMS,
  calculateJobROI,
  notifyJobCreated,
  notifyJobAssigned,
  notifyJobApproved,
  notifyQuoteCreated,
} from "./services/automation";
import * as smsService from "./services/sms";
import { dispatchToClosestTechnician } from "./services/dispatch";
import { generateApplicationPDF, generateComparisonPDF, generateHouseCallProComparisonPDF, generateTestResultsPDF, generateThreeWayComparisonPDF, generateReadmePDF, generateChatSystemPDF } from "./services/pdf-generator";


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
      await db.execute(sql`DELETE FROM notifications`);
      await db.execute(sql`DELETE FROM quote_line_items`);
      await db.execute(sql`DELETE FROM job_attachments`);
      await db.execute(sql`DELETE FROM job_checklists`);
      await db.execute(sql`DELETE FROM job_lead_fees`);
      await db.execute(sql`DELETE FROM job_revenue_events`);
      await db.execute(sql`DELETE FROM shift_logs`);
      await db.execute(sql`DELETE FROM time_entries`);
      await db.execute(sql`DELETE FROM payroll_records`);
      await db.execute(sql`DELETE FROM payroll_periods`);
      await db.execute(sql`DELETE FROM employee_pay_rates`);
      await db.execute(sql`DELETE FROM job_messages`);
      await db.execute(sql`DELETE FROM chat_messages`);
      await db.execute(sql`DELETE FROM chat_thread_participants`);
      await db.execute(sql`DELETE FROM chat_threads`);
      
      // Main operational tables
      await db.execute(sql`DELETE FROM quotes`);
      await db.execute(sql`DELETE FROM jobs`);
      
      // Staff tables
      await db.execute(sql`DELETE FROM technicians`);
      
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

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        technicianId: technician?.id || null,
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

      // Delete linked technician record if exists
      if (user.role === "technician") {
        await storage.deleteTechnicianByUserId(userId);
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
      if (tech) techName = tech.fullName || "Technician";
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
      if (tech) techName = tech.fullName || "Technician";
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
          techName = tech.fullName || "Technician";
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
      
      // Build job data
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
        quoteId: quote.id,
      };
      
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
      const [jobs, technicians, quotes] = await Promise.all([
        storage.getJobs(),
        storage.getTechnicians(),
        storage.getAllQuotes(),
      ]);

      // Format data for export
      const exportData = {
        jobs: jobs.map(j => ({
          id: j.id,
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
        let csv = '';
        
        csv += 'JOBS\n';
        csv += 'ID,Technician ID,Status,Customer,Service,Address,Scheduled Date,Scheduled Time\n';
        exportData.jobs.forEach(j => {
          csv += `"${j.id}","${j.technicianId}","${j.status}","${j.customerName}","${j.serviceType}","${j.address}","${j.scheduledDate}","${j.scheduledTime}"\n`;
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
  // Twilio Call & SMS Forwarding Webhooks
  // ==========================================

  // Forwarding phone number for all incoming calls and texts
  const FORWARDING_PHONE_NUMBER = "+13123916503";

  // Twilio incoming voice call webhook - forwards calls to office
  app.post("/api/webhooks/twilio/voice", async (req, res) => {
    try {
      const { From, To, CallSid } = req.body;

      console.log(`[Twilio Voice] Incoming call from ${From} to ${To}, CallSid: ${CallSid}`);
      console.log(`[Webhook Log] twilio-voice-incoming: from=${From}, to=${To}, callSid=${CallSid}, action=forward`);

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
      console.log(`[Webhook Log] twilio-voice-status: callSid=${CallSid}, status=${DialCallStatus}, from=${From}, to=${To}`);

      // MISSED CALL TEXT-BACK: If call wasn't answered, auto-text the caller
      const missedStatuses = ["no-answer", "busy", "failed", "canceled"];
      if (From && missedStatuses.includes(DialCallStatus)) {
        console.log(`[MCTB] Missed call detected (${DialCallStatus}) from ${From} — triggering text-back`);
        const { handleMissedCall } = await import("./services/missed-call-textback");
        handleMissedCall(From).catch(err => 
          console.error("[MCTB] Text-back failed:", err)
        );
      }

      // Acknowledge — call is done
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
      console.log(`[Webhook Log] twilio-voicemail: from=${From}, to=${To}, callSid=${CallSid}, recordingSid=${RecordingSid}`);

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
      console.log(`[Webhook Log] twilio-sms-incoming: from=${From}, to=${To}, messageSid=${MessageSid}`);

      // Check for MCTB keyword auto-responses first
      const { getKeywordResponse } = await import("./services/missed-call-textback");
      const autoResponse = getKeywordResponse(Body);
      if (autoResponse) {
        console.log(`[MCTB] Keyword match: "${Body.trim().toUpperCase()}" — sending auto-response`);
        const { sendSMS: sendAutoReply } = await import("./services/sms");
        await sendAutoReply(From, autoResponse);
        // Still forward to office so they know what's happening
      }

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
  // AUTOMATION API ENDPOINTS
  // ==========================================

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
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: "Phone number and message required" });
      }

      const result = await smsService.sendSMS(to, message);

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
  // ZAPIER SMS AUTOMATION ENDPOINTS
  // ========================================
  
  const OFFICE_FORWARDING_NUMBER = "+13123916503";
  const OFFICE_EMAIL = "CSEINTAKETEST@webslingerai.com";
  
  // Forward SMS to office number (630) 251-5628
  app.post("/api/webhooks/zapier/forward-sms", async (req, res) => {
    try {
      const { 
        from_number,
        from,
        message,
        body,
        to_number,
        to,
      } = req.body;

      const senderNumber = from_number || from || "Unknown";
      const messageBody = message || body || "(No message)";

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
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
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

      console.log(`[Zapier SMS Forward] Forwarded`, { smsSuccess: smsResult.success, emailSent });

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

  return httpServer;
}
