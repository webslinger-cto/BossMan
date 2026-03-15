// Automation service for Chicago Sewer Experts CRM
// Handles automatic lead contact, estimate confirmation, and job tracking

import { storage } from "../storage";
import { sendEmail, generateLeadAcknowledgmentEmail, generateAppointmentReminderEmail } from "./email";
import * as smsService from "./sms";
import { pushJobToBuilder1 } from "./builder1-integration";
import type { Lead, Job, Technician } from "@shared/schema";

// Contact a lead automatically via email when they come in
export async function autoContactLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    if (!lead.customerEmail) {
      console.log(`Lead ${leadId} has no email address, skipping auto-contact`);
      return { success: false, error: "No email address provided" };
    }

    // Generate acknowledgment email
    const emailContent = generateLeadAcknowledgmentEmail(
      lead.customerName,
      lead.serviceType || "sewer service"
    );

    // Send email
    const result = await sendEmail({
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
      status: result.success ? "sent" : "failed",
      subject: emailContent.subject,
      content: emailContent.text,
      recipientEmail: lead.customerEmail,
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });

    // Update lead status to contacted
    if (result.success && lead.status === "new") {
      await storage.updateLead(leadId, { status: "contacted" });
    }

    return result;
  } catch (error) {
    console.error("Auto-contact error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Create a job from a lead when customer confirms they want an estimate
export async function createJobFromLead(
  leadId: string, 
  scheduledDate?: Date,
  scheduledTimeStart?: string,
  scheduledTimeEnd?: string
): Promise<{ success: boolean; job?: Job; error?: string }> {
  try {
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    // Create job from lead data
    const job = await storage.createJob({
      leadId: lead.id,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      customerEmail: lead.customerEmail || undefined,
      address: lead.address || "Address pending",
      city: lead.city || undefined,
      zipCode: lead.zipCode || undefined,
      serviceType: lead.serviceType || "General Service",
      description: lead.description || undefined,
      status: "pending",
      priority: lead.priority || "normal",
      scheduledDate: scheduledDate || undefined,
      scheduledTimeStart: scheduledTimeStart || undefined,
      scheduledTimeEnd: scheduledTimeEnd || undefined,
    });

    // Update lead status to estimate_scheduled
    await storage.updateLead(leadId, { status: "estimate_scheduled" });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "created",
      description: `Job created from lead. Customer confirmed they want an estimate.`,
    });

    // Push job to Builder 1 for SEO content tracking
    pushJobToBuilder1(job, lead, "job_created").catch(err => {
      console.error("[Builder1] Failed to push job_created event:", err);
    });

    return { success: true, job };
  } catch (error) {
    console.error("Create job from lead error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Auto-assign a technician based on availability, skills, and location
export async function autoAssignTechnician(jobId: string): Promise<{ 
  success: boolean; 
  technician?: Technician; 
  error?: string 
}> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Get available technicians
    const technicians = await storage.getTechnicians();
    const availableTechs = technicians.filter(t => 
      t.status === "available" && 
      (t.approvedJobTypes === null || t.approvedJobTypes?.includes(job.serviceType))
    );

    if (availableTechs.length === 0) {
      return { success: false, error: "No available technicians" };
    }

    // Simple assignment: pick the first available tech who hasn't hit daily limit
    const assignedTech = availableTechs.find(t => 
      (t.completedJobsToday || 0) < (t.maxDailyJobs || 8)
    ) || availableTechs[0];

    // Assign technician to job
    await storage.updateJob(jobId, {
      assignedTechnicianId: assignedTech.id,
      status: "assigned",
      assignedAt: new Date(),
      laborRate: assignedTech.hourlyRate || "25.00",
    });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "assigned",
      description: `Auto-assigned to ${assignedTech.fullName}`,
    });

    return { success: true, technician: assignedTech };
  } catch (error) {
    console.error("Auto-assign error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Cancel a job with full tracking
export async function cancelJob(
  jobId: string, 
  cancelledBy: string, 
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Update job with cancellation info - all expense/labor data is preserved
    await storage.updateJob(jobId, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: cancelledBy,
      cancellationReason: reason,
    });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "cancelled",
      description: `Job cancelled. Reason: ${reason}`,
      createdBy: cancelledBy,
    });

    // Free up technician if one was assigned
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech && tech.currentJobId === jobId) {
        await storage.updateTechnician(job.assignedTechnicianId, {
          status: "available",
          currentJobId: null,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Cancel job error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Update job labor and expenses (for ROI tracking)
export async function updateJobCosts(
  jobId: string,
  costs: {
    laborHours?: string;
    materialsCost?: string;
    travelExpense?: string;
    equipmentCost?: string;
    otherExpenses?: string;
    expenseNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[updateJobCosts] Input costs:`, costs);
    
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Calculate labor cost
    const laborHoursValue = costs.laborHours || job.laborHours || "0";
    const laborHours = parseFloat(laborHoursValue);
    const laborRate = parseFloat(job.laborRate || "25.00");
    const laborCost = laborHours * laborRate;

    // Calculate total costs
    const materialsCostValue = costs.materialsCost || job.materialsCost || "0";
    const materialsCost = parseFloat(materialsCostValue);
    const travelExpenseValue = costs.travelExpense || job.travelExpense || "0";
    const travelExpense = parseFloat(travelExpenseValue);
    const equipmentCostValue = costs.equipmentCost || job.equipmentCost || "0";
    const equipmentCost = parseFloat(equipmentCostValue);
    const otherExpensesValue = costs.otherExpenses || job.otherExpenses || "0";
    const otherExpenses = parseFloat(otherExpensesValue);
    const totalCost = laborCost + materialsCost + travelExpense + equipmentCost + otherExpenses;

    // Calculate profit if we have revenue
    const totalRevenue = parseFloat(job.totalRevenue || "0");
    const profit = totalRevenue - totalCost;

    const updateData = {
      laborHours: laborHoursValue,
      laborCost: laborCost.toFixed(2),
      materialsCost: materialsCostValue,
      travelExpense: travelExpenseValue,
      equipmentCost: equipmentCostValue,
      otherExpenses: otherExpensesValue,
      expenseNotes: costs.expenseNotes || job.expenseNotes,
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
    };
    
    console.log(`[updateJobCosts] Updating job ${jobId} with:`, updateData);

    await storage.updateJob(jobId, updateData);
    
    const updatedJob = await storage.getJob(jobId);
    console.log(`[updateJobCosts] Updated job laborHours:`, updatedJob?.laborHours);

    return { success: true };
  } catch (error) {
    console.error("Update job costs error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Complete a job with final cost calculation
export async function completeJob(
  jobId: string,
  finalData: {
    laborHours?: string;
    materialsCost?: string;
    travelExpense?: string;
    equipmentCost?: string;
    otherExpenses?: string;
    expenseNotes?: string;
    totalRevenue?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    let job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Update costs first
    if (Object.keys(finalData).length > 0) {
      await updateJobCosts(jobId, finalData);
    }

    // Re-fetch job to get updated totalCost after updateJobCosts
    job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found after cost update" };
    }

    // Set revenue if provided
    if (finalData.totalRevenue) {
      const totalCost = parseFloat(job.totalCost || "0");
      const totalRevenue = parseFloat(finalData.totalRevenue);
      const profit = totalRevenue - totalCost;

      await storage.updateJob(jobId, {
        totalRevenue: finalData.totalRevenue,
        profit: profit.toFixed(2),
      });
    }

    // Mark job as completed
    await storage.updateJob(jobId, {
      status: "completed",
      completedAt: new Date(),
    });

    // Log timeline event
    await storage.createJobTimelineEvent({
      jobId: job.id,
      eventType: "completed",
      description: "Job completed",
    });

    // Update technician
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech) {
        await storage.updateTechnician(job.assignedTechnicianId, {
          status: "available",
          currentJobId: null,
          completedJobsToday: (tech.completedJobsToday || 0) + 1,
        });

        // Create revenue event for analytics/payroll integration
        const updatedJob = await storage.getJob(jobId);
        if (updatedJob) {
          const totalRevenue = parseFloat(updatedJob.totalRevenue || "0");
          const laborCost = parseFloat(updatedJob.laborCost || "0");
          const materialsCost = parseFloat(updatedJob.materialsCost || "0");
          const travelExpense = parseFloat(updatedJob.travelExpense || "0");
          const equipmentCost = parseFloat(updatedJob.equipmentCost || "0");
          const otherExpenses = parseFloat(updatedJob.otherExpenses || "0");
          // Calculate true NET profit including all expenses
          const totalCost = laborCost + materialsCost + travelExpense + equipmentCost + otherExpenses;
          const netProfit = totalRevenue - totalCost;
          const commissionRate = parseFloat(String(tech.commissionRate) || "0.1");
          const commissionAmount = netProfit > 0 ? netProfit * commissionRate : 0;

          await storage.createJobRevenueEvent({
            jobId: updatedJob.id,
            technicianId: tech.id,
            totalRevenue: totalRevenue.toFixed(2),
            laborCost: (laborCost + travelExpense + equipmentCost + otherExpenses).toFixed(2), // Include all labor-related costs
            materialCost: materialsCost.toFixed(2),
            marketingCost: "0",
            netProfit: netProfit.toFixed(2),
            commissionAmount: commissionAmount.toFixed(2),
          });
          console.log(`Created revenue event for job ${jobId} - Revenue: $${totalRevenue}, Total Cost: $${totalCost}, Net Profit: $${netProfit}, Commission: $${commissionAmount}`);

          // Push completed job to Builder 1 for SEO content generation trigger
          const lead = updatedJob.leadId ? await storage.getLead(updatedJob.leadId) : undefined;
          pushJobToBuilder1(updatedJob, lead || undefined, "job_completed").catch(err => {
            console.error("[Builder1] Failed to push job_completed event:", err);
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Complete job error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send appointment reminder via email and SMS
export async function sendAppointmentReminder(jobId: string): Promise<{ success: boolean; error?: string; emailSent?: boolean; smsSent?: boolean }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    // Get technician name
    let techName = "Your Technician";
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech) {
        techName = tech.fullName;
      }
    }

    // Format date and time
    const dateStr = job.scheduledDate 
      ? new Date(job.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : "To be confirmed";
    const timeStr = job.scheduledTimeStart 
      ? `${job.scheduledTimeStart}${job.scheduledTimeEnd ? ` - ${job.scheduledTimeEnd}` : ""}`
      : "To be confirmed";

    let emailSent = false;
    let smsSent = false;

    // Send email if customer has email AND has opted in (or consent not yet captured)
    // Gate on consent: only send if customerConsentEmailOptIn is true OR if consent fields are not set (legacy jobs)
    const emailConsentGranted = job.customerConsentEmailOptIn === true || job.customerConsentAt === null;
    if (job.customerEmail && emailConsentGranted) {
      const emailContent = generateAppointmentReminderEmail(
        job.customerName,
        dateStr,
        timeStr,
        techName,
        job.address
      );

      const emailResult = await sendEmail({
        to: job.customerEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // Log email contact attempt
      await storage.createContactAttempt({
        jobId: job.id,
        type: "email",
        direction: "outbound",
        status: emailResult.success ? "sent" : "failed",
        subject: emailContent.subject,
        content: emailContent.text,
        recipientEmail: job.customerEmail,
        sentAt: emailResult.success ? new Date() : null,
        externalId: emailResult.messageId || null,
        failedReason: emailResult.error || null,
      });

      emailSent = emailResult.success;
    } else if (job.customerEmail && !emailConsentGranted) {
      console.log(`[Consent] Skipping email to ${job.customerEmail} - customer did not opt in for email updates`);
    }

    // Send SMS if customer has phone, SMS is configured, AND customer consented
    // Gate on consent: only send if customerConsentSmsOptIn is true OR if consent fields are not set (legacy jobs)
    const smsConsentGranted = job.customerConsentSmsOptIn === true || job.customerConsentAt === null;
    if (job.customerPhone && smsService.isConfigured() && smsConsentGranted) {
      const scheduledDateTime = job.scheduledDate ? new Date(job.scheduledDate) : new Date();
      if (job.scheduledTimeStart) {
        const [hours, minutes] = job.scheduledTimeStart.split(":").map(Number);
        scheduledDateTime.setHours(hours || 0, minutes || 0);
      }

      const smsResult = await smsService.sendAppointmentReminder(
        job.customerPhone,
        job.customerName,
        scheduledDateTime,
        techName,
        job.address
      );

      // Log SMS contact attempt
      await storage.createContactAttempt({
        jobId: job.id,
        type: "sms",
        direction: "outbound",
        status: smsResult.success ? "sent" : "failed",
        content: `Appointment reminder SMS to ${job.customerPhone}`,
        recipientPhone: job.customerPhone,
        sentAt: smsResult.success ? new Date() : null,
        externalId: smsResult.messageId || null,
        failedReason: smsResult.error || null,
      });

      smsSent = smsResult.success;
    } else if (job.customerPhone && smsService.isConfigured() && !smsConsentGranted) {
      console.log(`[Consent] Skipping appointment reminder SMS to ${job.customerPhone} - customer did not opt in for SMS updates`);
    }

    // Success if at least one method was attempted (even if neither was configured)
    // Only fail if we tried to send but all attempts failed
    const hasContactInfo = job.customerEmail || job.customerPhone;
    if (!hasContactInfo) {
      return { success: false, error: "No contact method available (no email or phone)", emailSent, smsSent };
    }

    // Return success if at least one delivery succeeded, or if no delivery was possible due to config
    return { success: emailSent || smsSent, emailSent, smsSent };
  } catch (error) {
    console.error("Send reminder error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send SMS notification when technician is en route
export async function sendTechnicianEnRouteSMS(jobId: string, estimatedArrival: string): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (!job.customerPhone) {
      return { success: false, error: "No customer phone number" };
    }

    if (!smsService.isConfigured()) {
      return { success: false, error: "SMS service not configured" };
    }
    
    // Gate on consent: only send if customerConsentSmsOptIn is true OR if consent fields are not set (legacy jobs)
    const smsConsentGranted = job.customerConsentSmsOptIn === true || job.customerConsentAt === null;
    if (!smsConsentGranted) {
      console.log(`[Consent] Skipping en-route SMS to ${job.customerPhone} - customer did not opt in for SMS updates`);
      return { success: false, error: "Customer has not opted in for SMS updates" };
    }

    // Get technician name
    let techName = "Your Technician";
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech) {
        techName = tech.fullName;
      }
    }

    const result = await smsService.sendTechnicianEnRoute(
      job.customerPhone,
      job.customerName,
      techName,
      estimatedArrival
    );

    // Log contact attempt
    await storage.createContactAttempt({
      jobId: job.id,
      type: "sms",
      direction: "outbound",
      status: result.success ? "sent" : "failed",
      content: `En route notification to ${job.customerPhone}`,
      recipientPhone: job.customerPhone,
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });

    return result;
  } catch (error) {
    console.error("Send en route SMS error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send SMS notification when job is complete
export async function sendJobCompleteSMS(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (!job.customerPhone) {
      return { success: false, error: "No customer phone number" };
    }

    if (!smsService.isConfigured()) {
      return { success: false, error: "SMS service not configured" };
    }
    
    // Gate on consent: only send if customerConsentSmsOptIn is true OR if consent fields are not set (legacy jobs)
    const smsConsentGranted = job.customerConsentSmsOptIn === true || job.customerConsentAt === null;
    if (!smsConsentGranted) {
      console.log(`[Consent] Skipping job-complete SMS to ${job.customerPhone} - customer did not opt in for SMS updates`);
      return { success: false, error: "Customer has not opted in for SMS updates" };
    }

    // Get technician name
    let techName = "Your Technician";
    if (job.assignedTechnicianId) {
      const tech = await storage.getTechnician(job.assignedTechnicianId);
      if (tech) {
        techName = tech.fullName;
      }
    }

    const result = await smsService.sendJobComplete(
      job.customerPhone,
      job.customerName,
      techName
    );

    // Log contact attempt
    await storage.createContactAttempt({
      jobId: job.id,
      type: "sms",
      direction: "outbound",
      status: result.success ? "sent" : "failed",
      content: `Job complete notification to ${job.customerPhone}`,
      recipientPhone: job.customerPhone,
      sentAt: result.success ? new Date() : null,
      externalId: result.messageId || null,
      failedReason: result.error || null,
    });

    return result;
  } catch (error) {
    console.error("Send job complete SMS error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Calculate ROI for a job
export function calculateJobROI(job: Job): {
  totalRevenue: number;
  totalCost: number;
  laborCost: number;
  materialsCost: number;
  travelExpense: number;
  equipmentCost: number;
  otherExpenses: number;
  profit: number;
  profitMargin: number;
} {
  const totalRevenue = parseFloat(job.totalRevenue || "0");
  const laborCost = parseFloat(job.laborCost || "0");
  const materialsCost = parseFloat(job.materialsCost || "0");
  const travelExpense = parseFloat(job.travelExpense || "0");
  const equipmentCost = parseFloat(job.equipmentCost || "0");
  const otherExpenses = parseFloat(job.otherExpenses || "0");
  const totalCost = laborCost + materialsCost + travelExpense + equipmentCost + otherExpenses;
  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    laborCost,
    materialsCost,
    travelExpense,
    equipmentCost,
    otherExpenses,
    profit,
    profitMargin,
  };
}

// Configuration for lead notifications
interface NotificationConfig {
  emailRecipients?: string[];  // Email addresses to notify
  smsRecipients?: string[];    // Phone numbers to notify
  notifyByEmail?: boolean;
  notifyBySms?: boolean;
}

// Default notification recipients - configured for Chicago Sewer Experts
// Main office/dispatch email - receives all leads, quotes, and jobs
const OFFICE_EMAIL = "CSEINTAKETEST@webslingerai.com";
// Technician email - receives approved/assigned job notifications
const TECHNICIAN_EMAIL = "techtest@webslingerai.com";

const DEFAULT_EMAIL_RECIPIENTS = [OFFICE_EMAIL];
const DEFAULT_SMS_RECIPIENTS: string[] = []; // SMS disabled until Twilio verified

// Default notification settings - EMAIL ONLY for now (SMS pending verification)
const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  notifyByEmail: true,
  notifyBySms: false, // Disabled until Twilio A2P verification complete
  emailRecipients: DEFAULT_EMAIL_RECIPIENTS,
  smsRecipients: DEFAULT_SMS_RECIPIENTS,
};

// Notify team members when a new lead comes in
export async function notifyLeadRecipients(
  lead: Lead,
  config?: NotificationConfig
): Promise<{ emailsSent: number; smsSent: number; errors: string[] }> {
  const settings = { ...DEFAULT_NOTIFICATION_CONFIG, ...config };
  const errors: string[] = [];
  let emailsSent = 0;
  let smsSent = 0;

  try {
    // Get recipients from config or defaults
    const emailRecipients = settings.emailRecipients || DEFAULT_EMAIL_RECIPIENTS;
    const smsRecipients = settings.smsRecipients || DEFAULT_SMS_RECIPIENTS;

    // Format lead info
    const leadInfo = {
      name: lead.customerName || "Unknown",
      phone: lead.customerPhone || "Not provided",
      email: lead.customerEmail || "Not provided",
      address: lead.address || "Not provided",
      service: lead.serviceType || "Not specified",
      source: lead.source || "Direct",
      priority: lead.priority || "normal",
    };

    // Send email notifications
    if (settings.notifyByEmail && emailRecipients.length > 0) {
      const emailSubject = `🔔 New Lead: ${leadInfo.name} - ${leadInfo.service}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div style="background: #b22222; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">New Lead Alert</h2>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>${leadInfo.name}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td><a href="tel:${leadInfo.phone}">${leadInfo.phone}</a></td></tr>
              <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td><a href="mailto:${leadInfo.email}">${leadInfo.email}</a></td></tr>
              <tr><td style="padding: 8px 0;"><strong>Address:</strong></td><td>${leadInfo.address}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>${leadInfo.service}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Source:</strong></td><td>${leadInfo.source}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Priority:</strong></td><td style="color: ${leadInfo.priority === 'urgent' ? '#b22222' : leadInfo.priority === 'high' ? '#f97316' : '#333'}">${leadInfo.priority.toUpperCase()}</td></tr>
            </table>
            ${lead.description ? `<hr style="margin: 15px 0;"><p><strong>Description:</strong><br>${lead.description}</p>` : ''}
          </div>
          <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
            Chicago Sewer Experts CRM
          </div>
        </div>
      `;

      for (const email of emailRecipients) {
        try {
          const result = await sendEmail({ to: email, subject: emailSubject, html: emailHtml });
          if (result.success) emailsSent++;
          else errors.push(`Email to ${email}: ${result.error}`);
        } catch (err) {
          errors.push(`Email to ${email}: ${err}`);
        }
      }
      // Wait after email sends to respect Resend rate limit before SMS via email gateway
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Send SMS notifications with delay to avoid Resend rate limits (2 req/sec)
    if (settings.notifyBySms && smsRecipients.length > 0 && smsService.isConfigured()) {
      const smsMessage = `NEW LEAD from ${leadInfo.source}:\n${leadInfo.name}\n${leadInfo.phone}\n${leadInfo.service}\nPriority: ${leadInfo.priority.toUpperCase()}`;

      for (let i = 0; i < smsRecipients.length; i++) {
        const phone = smsRecipients[i];
        try {
          // Add 600ms delay between SMS sends to stay under rate limit
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
          const result = await smsService.sendSMS(phone, smsMessage);
          if (result.success) smsSent++;
          else errors.push(`SMS to ${phone}: ${result.error}`);
        } catch (err) {
          errors.push(`SMS to ${phone}: ${err}`);
        }
      }
    }

    console.log(`[Lead Notification] Lead ${lead.id}: ${emailsSent} emails, ${smsSent} SMS sent`);
    return { emailsSent, smsSent, errors };
  } catch (error) {
    console.error("Lead notification error:", error);
    errors.push(String(error));
    return { emailsSent, smsSent, errors };
  }
}

// Notify office when a new quote is created
export async function notifyQuoteCreated(
  quote: { id: string; customerName: string; jobId?: string; total: string; lineItems?: any[] },
  quoteUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #b22222; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">New Quote Created</h2>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Quote ID:</strong></td><td>${quote.id}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>${quote.customerName}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Total:</strong></td><td style="font-weight: bold; color: #2e7d32;">$${quote.total}</td></tr>
            ${quote.jobId ? `<tr><td style="padding: 8px 0;"><strong>Job ID:</strong></td><td>${quote.jobId}</td></tr>` : ''}
          </table>
          ${quoteUrl ? `<p style="margin-top: 15px;"><a href="${quoteUrl}" style="background: #b22222; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Quote</a></p>` : ''}
        </div>
        <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          Chicago Sewer Experts CRM
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: OFFICE_EMAIL,
      subject: `New Quote: ${quote.customerName} - $${quote.total}`,
      html: emailHtml,
    });

    console.log(`[Quote Notification] Quote ${quote.id}: email ${result.success ? 'sent' : 'failed'}`);
    return result;
  } catch (error) {
    console.error("Quote notification error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Notify office when a new job is created
export async function notifyJobCreated(job: Job): Promise<{ success: boolean; error?: string }> {
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #1976d2; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">New Job Created</h2>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Job ID:</strong></td><td>${job.id}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>${job.customerName}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td><a href="tel:${job.customerPhone}">${job.customerPhone}</a></td></tr>
            <tr><td style="padding: 8px 0;"><strong>Address:</strong></td><td>${job.address || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>${job.serviceType || 'General'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Status:</strong></td><td>${job.status}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Priority:</strong></td><td style="color: ${job.priority === 'urgent' ? '#b22222' : job.priority === 'high' ? '#f97316' : '#333'}">${(job.priority || 'normal').toUpperCase()}</td></tr>
          </table>
          ${job.description ? `<hr style="margin: 15px 0;"><p><strong>Description:</strong><br>${job.description}</p>` : ''}
        </div>
        <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          Chicago Sewer Experts CRM
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: OFFICE_EMAIL,
      subject: `New Job: ${job.customerName} - ${job.serviceType || 'Service'}`,
      html: emailHtml,
    });

    console.log(`[Job Notification] Job ${job.id}: email ${result.success ? 'sent' : 'failed'}`);
    return result;
  } catch (error) {
    console.error("Job notification error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Notify technician when a job is assigned to them
export async function notifyJobAssigned(
  job: Job,
  technicianName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const scheduledInfo = job.scheduledDate 
      ? `Scheduled: ${new Date(job.scheduledDate).toLocaleDateString()} ${job.scheduledTimeStart || ''} - ${job.scheduledTimeEnd || ''}`
      : 'Schedule: TBD';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #2e7d32; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Job Assigned to ${technicianName}</h2>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Job ID:</strong></td><td>${job.id}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Technician:</strong></td><td style="font-weight: bold;">${technicianName}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>${job.customerName}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td><a href="tel:${job.customerPhone}">${job.customerPhone}</a></td></tr>
            <tr><td style="padding: 8px 0;"><strong>Address:</strong></td><td>${job.address || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>${job.serviceType || 'General'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>${scheduledInfo}</strong></td><td></td></tr>
            <tr><td style="padding: 8px 0;"><strong>Priority:</strong></td><td style="color: ${job.priority === 'urgent' ? '#b22222' : job.priority === 'high' ? '#f97316' : '#333'}">${(job.priority || 'normal').toUpperCase()}</td></tr>
          </table>
          ${job.description ? `<hr style="margin: 15px 0;"><p><strong>Description:</strong><br>${job.description}</p>` : ''}
        </div>
        <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          Chicago Sewer Experts CRM - Technician Assignment
        </div>
      </div>
    `;

    // Send to technician email
    const techResult = await sendEmail({
      to: TECHNICIAN_EMAIL,
      subject: `Job Assigned: ${job.customerName} - ${job.address || job.serviceType}`,
      html: emailHtml,
    });

    console.log(`[Job Assignment] Job ${job.id} assigned to ${technicianName}: email ${techResult.success ? 'sent' : 'failed'}`);
    return techResult;
  } catch (error) {
    console.error("Job assignment notification error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Notify technician when job is approved/in_progress
export async function notifyJobApproved(
  job: Job,
  technicianName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const scheduledInfo = job.scheduledDate 
      ? `Scheduled: ${new Date(job.scheduledDate).toLocaleDateString()} ${job.scheduledTimeStart || ''} - ${job.scheduledTimeEnd || ''}`
      : 'Schedule: TBD';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #2e7d32; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Job Approved - Ready for Work</h2>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border: 1px solid #ddd;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Job ID:</strong></td><td>${job.id}</td></tr>
            ${technicianName ? `<tr><td style="padding: 8px 0;"><strong>Assigned To:</strong></td><td style="font-weight: bold;">${technicianName}</td></tr>` : ''}
            <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>${job.customerName}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td><a href="tel:${job.customerPhone}">${job.customerPhone}</a></td></tr>
            <tr><td style="padding: 8px 0;"><strong>Address:</strong></td><td>${job.address || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Service:</strong></td><td>${job.serviceType || 'General'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>${scheduledInfo}</strong></td><td></td></tr>
            <tr><td style="padding: 8px 0;"><strong>Priority:</strong></td><td style="color: ${job.priority === 'urgent' ? '#b22222' : job.priority === 'high' ? '#f97316' : '#333'}">${(job.priority || 'normal').toUpperCase()}</td></tr>
          </table>
          ${job.description ? `<hr style="margin: 15px 0;"><p><strong>Description:</strong><br>${job.description}</p>` : ''}
        </div>
        <div style="background: #1a1a2e; color: #888; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          Chicago Sewer Experts CRM - Job Approved
        </div>
      </div>
    `;

    // Send to technician email
    const result = await sendEmail({
      to: TECHNICIAN_EMAIL,
      subject: `Job Approved: ${job.customerName} - ${job.address || job.serviceType}`,
      html: emailHtml,
    });

    console.log(`[Job Approved] Job ${job.id}: email ${result.success ? 'sent' : 'failed'}`);
    return result;
  } catch (error) {
    console.error("Job approved notification error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
