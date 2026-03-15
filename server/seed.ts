import { db } from "./db";
import { companies, users, technicians, jobs, jobTimelineEvents, notifications } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_COMPANY_ID = "company-default";

// Ensure default company exists
async function ensureDefaultCompany() {
  const existing = await db.select().from(companies).where(eq(companies.id, DEFAULT_COMPANY_ID));
  if (existing.length === 0) {
    await db.insert(companies).values({
      id: DEFAULT_COMPANY_ID,
      name: "Chicago Sewer Experts",
      slug: "chicago-sewer-experts",
      businessType: "plumbing",
      phone: "(708) 555-0100",
      email: "info@chicagosewerexperts.com",
      address: "100 W Randolph St",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      plan: "professional",
    });
    console.log("Created default company");
  }
}

// Ensure godmode super admin always exists (called on every startup)
export async function ensureGodmodeUser() {
  try {
    await ensureDefaultCompany();

    const existingGodmode = await db.select().from(users).where(eq(users.username, "godmode"));
    if (existingGodmode.length === 0) {
      await db.insert(users).values({
        id: "user-godmode",
        companyId: DEFAULT_COMPANY_ID,
        username: "godmode",
        password: "CSE2024!",
        role: "admin",
        fullName: "System Administrator",
        isSuperAdmin: true,
      });
      console.log("Created godmode super admin user");
    } else {
      // Ensure isSuperAdmin is set to true
      await db.update(users).set({ isSuperAdmin: true, password: "CSE2024!" }).where(eq(users.username, "godmode"));
      console.log("Godmode user verified");
    }
  } catch (error) {
    console.error("Error ensuring godmode user:", error);
  }
}

async function seed() {
  console.log("Seeding database...");

  // Ensure default company exists first
  await ensureDefaultCompany();

  // Check if already seeded
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    // Still ensure godmode exists
    await ensureGodmodeUser();
    return;
  }

  // Seed users
  const userData = [
    { id: "user-godmode", companyId: DEFAULT_COMPANY_ID, username: "godmode", password: "CSE2024!", role: "admin", fullName: "System Administrator", isSuperAdmin: true },
    { id: "user-admin", companyId: DEFAULT_COMPANY_ID, username: "admin", password: "demo123", role: "admin", fullName: "Admin User" },
    { id: "user-dispatcher", companyId: DEFAULT_COMPANY_ID, username: "dispatcher", password: "demo123", role: "dispatcher", fullName: "Dispatch Manager" },
    { id: "user-tech-1", companyId: DEFAULT_COMPANY_ID, username: "mike", password: "demo123", role: "technician", fullName: "Mike Johnson" },
    { id: "user-tech-2", companyId: DEFAULT_COMPANY_ID, username: "carlos", password: "demo123", role: "technician", fullName: "Carlos Rodriguez" },
    { id: "user-tech-3", companyId: DEFAULT_COMPANY_ID, username: "james", password: "demo123", role: "technician", fullName: "James Williams" },
  ];
  await db.insert(users).values(userData);
  console.log("Inserted users");

  // Seed technicians
  const techData = [
    { id: "tech-1", companyId: DEFAULT_COMPANY_ID, fullName: "Mike Johnson", phone: "(708) 555-0101", email: "mike@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-1" },
    { id: "tech-2", companyId: DEFAULT_COMPANY_ID, fullName: "Carlos Rodriguez", phone: "(708) 555-0102", email: "carlos@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-2" },
    { id: "tech-3", companyId: DEFAULT_COMPANY_ID, fullName: "James Williams", phone: "(708) 555-0103", email: "james@chicagosewerexperts.com", status: "busy", skillLevel: "standard", userId: "user-tech-3" },
    { id: "tech-4", companyId: DEFAULT_COMPANY_ID, fullName: "David Martinez", phone: "(708) 555-0104", email: "david@chicagosewerexperts.com", status: "available", skillLevel: "standard" },
    { id: "tech-5", companyId: DEFAULT_COMPANY_ID, fullName: "Robert Taylor", phone: "(708) 555-0105", email: "robert@chicagosewerexperts.com", status: "off_duty", skillLevel: "junior" },
  ];
  await db.insert(technicians).values(techData);
  console.log("Inserted technicians");

  // Seed jobs
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const jobsData = [
    {
      id: "job-1",
      companyId: DEFAULT_COMPANY_ID,
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
      assignedTechnicianId: "tech-1",
    },
    {
      id: "job-2",
      companyId: DEFAULT_COMPANY_ID,
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
      assignedTechnicianId: "tech-1",
    },
    {
      id: "job-3",
      companyId: DEFAULT_COMPANY_ID,
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
    {
      id: "job-4",
      companyId: DEFAULT_COMPANY_ID,
      customerName: "Jennifer Wilson",
      customerPhone: "(312) 555-6789",
      address: "987 Birch Blvd",
      city: "Chicago",
      zipCode: "60604",
      serviceType: "Camera Inspection",
      status: "completed",
      priority: "normal",
      scheduledDate: yesterday,
      scheduledTimeStart: "10:00",
      scheduledTimeEnd: "12:00",
      assignedTechnicianId: "tech-2",
      completedAt: yesterday,
    },
    {
      id: "job-5",
      companyId: DEFAULT_COMPANY_ID,
      customerName: "Robert Martinez",
      customerPhone: "(312) 555-7890",
      address: "246 Maple Dr",
      city: "Skokie",
      zipCode: "60076",
      serviceType: "Hydro Jetting",
      status: "in_progress",
      priority: "high",
      scheduledDate: now,
      scheduledTimeStart: "11:00",
      scheduledTimeEnd: "14:00",
      assignedTechnicianId: "tech-3",
    },
  ];
  await db.insert(jobs).values(jobsData);
  console.log("Inserted jobs");

  // Seed job timeline events
  const timelineEvents = [
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-1", eventType: "created", description: "Job created" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-1", eventType: "assigned", description: "Assigned to Mike Johnson" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-2", eventType: "created", description: "Job created" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-2", eventType: "assigned", description: "Assigned to Mike Johnson" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-2", eventType: "confirmed", description: "Customer confirmed appointment" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-3", eventType: "created", description: "Job created" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-4", eventType: "created", description: "Job created" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-4", eventType: "assigned", description: "Assigned to Carlos Rodriguez" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-4", eventType: "completed", description: "Job completed successfully" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-5", eventType: "created", description: "Job created" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-5", eventType: "assigned", description: "Assigned to James Williams" },
    { companyId: DEFAULT_COMPANY_ID, jobId: "job-5", eventType: "started", description: "Work started on site" },
  ];
  await db.insert(jobTimelineEvents).values(timelineEvents);
  console.log("Inserted job timeline events");

  // Seed notifications
  const notificationData = [
    {
      companyId: DEFAULT_COMPANY_ID,
      userId: "user-tech-1",
      type: "job_assigned",
      title: "New Job Assigned",
      message: "You have been assigned to Drain Cleaning at 456 Oak Ave",
      jobId: "job-1",
      actionUrl: "/technician",
    },
    {
      companyId: DEFAULT_COMPANY_ID,
      userId: "user-tech-1",
      type: "job_assigned",
      title: "New Job Assigned",
      message: "You have been assigned to Water Heater - Repair at 789 Elm St",
      jobId: "job-2",
      actionUrl: "/technician",
    },
    {
      companyId: DEFAULT_COMPANY_ID,
      userId: "user-admin",
      type: "alert",
      title: "Urgent Lead",
      message: "New urgent lead from Sarah Johnson requires immediate attention",
      actionUrl: "/admin/leads",
    },
  ];
  await db.insert(notifications).values(notificationData);
  console.log("Inserted notifications");

  console.log("Database seeding completed!");
}

// Export seed function for use elsewhere
export { seed };

// Only run seed directly if this file is executed directly (not imported)
const isDirectExecution = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isDirectExecution) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
