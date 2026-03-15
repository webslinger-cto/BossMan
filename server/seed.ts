import { db } from "./db";
import { users, technicians, leads, calls, jobs, jobTimelineEvents, notifications, technicianLocations } from "@shared/schema";
import { eq } from "drizzle-orm";

// Ensure godmode super admin always exists (called on every startup)
export async function ensureGodmodeUser() {
  try {
    const existingGodmode = await db.select().from(users).where(eq(users.username, "godmode"));
    if (existingGodmode.length === 0) {
      await db.insert(users).values({
        id: "user-godmode",
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
    { id: "user-godmode", username: "godmode", password: "CSE2024!", role: "admin", fullName: "System Administrator", isSuperAdmin: true },
    { id: "user-admin", username: "admin", password: "demo123", role: "admin", fullName: "Admin User" },
    { id: "user-dispatcher", username: "dispatcher", password: "demo123", role: "dispatcher", fullName: "Dispatch Manager" },
    { id: "user-tech-1", username: "mike", password: "demo123", role: "technician", fullName: "Mike Johnson" },
    { id: "user-tech-2", username: "carlos", password: "demo123", role: "technician", fullName: "Carlos Rodriguez" },
    { id: "user-tech-3", username: "james", password: "demo123", role: "technician", fullName: "James Williams" },
  ];
  await db.insert(users).values(userData);
  console.log("Inserted users");

  // Seed technicians
  const techData = [
    { id: "tech-1", fullName: "Mike Johnson", phone: "(708) 555-0101", email: "mike@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-1" },
    { id: "tech-2", fullName: "Carlos Rodriguez", phone: "(708) 555-0102", email: "carlos@chicagosewerexperts.com", status: "available", skillLevel: "senior", userId: "user-tech-2" },
    { id: "tech-3", fullName: "James Williams", phone: "(708) 555-0103", email: "james@chicagosewerexperts.com", status: "busy", skillLevel: "standard", userId: "user-tech-3" },
    { id: "tech-4", fullName: "David Martinez", phone: "(708) 555-0104", email: "david@chicagosewerexperts.com", status: "available", skillLevel: "standard" },
    { id: "tech-5", fullName: "Robert Taylor", phone: "(708) 555-0105", email: "robert@chicagosewerexperts.com", status: "off_duty", skillLevel: "junior" },
  ];
  await db.insert(technicians).values(techData);
  console.log("Inserted technicians");

  // Seed leads
  const leadData = [
    { source: "eLocal", customerName: "Leonard Willis", customerPhone: "(312) 555-1234", address: "123 Main St", city: "Chicago", zipCode: "60601", serviceType: "Sewer Main - Clear", status: "new", priority: "high", cost: "45.00" },
    { source: "Networx", customerName: "Maria Garcia", customerPhone: "(312) 555-2345", address: "456 Oak Ave", city: "Chicago", zipCode: "60602", serviceType: "Drain Cleaning", status: "qualified", priority: "normal", cost: "35.00" },
    { source: "Direct", customerName: "Thomas Brown", customerPhone: "(312) 555-3456", address: "789 Elm St", city: "Evanston", zipCode: "60201", serviceType: "Water Heater - Repair", status: "scheduled", priority: "normal" },
    { source: "eLocal", customerName: "Sarah Johnson", customerPhone: "(312) 555-4567", address: "321 Pine Rd", city: "Chicago", zipCode: "60603", serviceType: "Pipe Repair", status: "new", priority: "urgent", cost: "45.00" },
    { source: "Angi", customerName: "Michael Davis", customerPhone: "(312) 555-5678", address: "654 Cedar Ln", city: "Oak Park", zipCode: "60301", serviceType: "Toilet Repair", status: "contacted", priority: "low", cost: "55.00" },
    { source: "HomeAdvisor", customerName: "Jennifer Wilson", customerPhone: "(312) 555-6789", address: "987 Birch Blvd", city: "Chicago", zipCode: "60604", serviceType: "Camera Inspection", status: "converted", priority: "normal", cost: "40.00" },
    { source: "Networx", customerName: "Robert Martinez", customerPhone: "(312) 555-7890", address: "246 Maple Dr", city: "Skokie", zipCode: "60076", serviceType: "Hydro Jetting", status: "converted", priority: "high", cost: "35.00" },
    { source: "Direct", customerName: "Patricia Anderson", customerPhone: "(312) 555-8901", address: "135 Spruce Way", city: "Chicago", zipCode: "60605", serviceType: "Sump Pump", status: "qualified", priority: "normal" },
  ];
  await db.insert(leads).values(leadData);
  console.log("Inserted leads");

  // Seed calls
  const callData = [
    { callerPhone: "(312) 555-1234", callerName: "Leonard Willis", direction: "inbound", status: "completed", duration: 180 },
    { callerPhone: "(312) 555-2345", callerName: "Maria Garcia", direction: "inbound", status: "completed", duration: 240 },
    { callerPhone: "(312) 555-9999", direction: "inbound", status: "missed", duration: 0 },
    { callerPhone: "(312) 555-3456", callerName: "Thomas Brown", direction: "outbound", status: "completed", duration: 120 },
    { callerPhone: "(312) 555-4567", callerName: "Sarah Johnson", direction: "inbound", status: "completed", duration: 300 },
  ];
  await db.insert(calls).values(callData);
  console.log("Inserted calls");

  // Seed jobs
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const jobsData = [
    {
      id: "job-1",
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
    { jobId: "job-1", eventType: "created", description: "Job created" },
    { jobId: "job-1", eventType: "assigned", description: "Assigned to Mike Johnson" },
    { jobId: "job-2", eventType: "created", description: "Job created" },
    { jobId: "job-2", eventType: "assigned", description: "Assigned to Mike Johnson" },
    { jobId: "job-2", eventType: "confirmed", description: "Customer confirmed appointment" },
    { jobId: "job-3", eventType: "created", description: "Job created" },
    { jobId: "job-4", eventType: "created", description: "Job created" },
    { jobId: "job-4", eventType: "assigned", description: "Assigned to Carlos Rodriguez" },
    { jobId: "job-4", eventType: "completed", description: "Job completed successfully" },
    { jobId: "job-5", eventType: "created", description: "Job created" },
    { jobId: "job-5", eventType: "assigned", description: "Assigned to James Williams" },
    { jobId: "job-5", eventType: "started", description: "Work started on site" },
  ];
  await db.insert(jobTimelineEvents).values(timelineEvents);
  console.log("Inserted job timeline events");

  // Seed notifications
  const notificationData = [
    {
      userId: "user-tech-1",
      type: "job_assigned",
      title: "New Job Assigned",
      message: "You have been assigned to Drain Cleaning at 456 Oak Ave",
      jobId: "job-1",
      actionUrl: "/technician",
    },
    {
      userId: "user-tech-1",
      type: "job_assigned",
      title: "New Job Assigned",
      message: "You have been assigned to Water Heater - Repair at 789 Elm St",
      jobId: "job-2",
      actionUrl: "/technician",
    },
    {
      userId: "user-admin",
      type: "alert",
      title: "Urgent Lead",
      message: "New urgent lead from Sarah Johnson requires immediate attention",
      actionUrl: "/admin/leads",
    },
  ];
  await db.insert(notifications).values(notificationData);
  console.log("Inserted notifications");

  // Seed technician locations (Chicago area coordinates)
  const techLocationData = [
    {
      id: "loc-1",
      technicianId: "tech-1",
      latitude: "41.8827",
      longitude: "-87.6233",
      accuracy: "10",
      isMoving: false,
      jobId: "job-1",
    },
    {
      id: "loc-2",
      technicianId: "tech-2",
      latitude: "41.8955",
      longitude: "-87.6540",
      accuracy: "15",
      isMoving: true,
      jobId: null,
    },
    {
      id: "loc-3",
      technicianId: "tech-3",
      latitude: "41.8675",
      longitude: "-87.6170",
      accuracy: "8",
      isMoving: false,
      jobId: "job-5",
    },
    {
      id: "loc-4",
      technicianId: "tech-4",
      latitude: "41.9100",
      longitude: "-87.6850",
      accuracy: "12",
      isMoving: false,
      jobId: null,
    },
  ];
  await db.insert(technicianLocations).values(techLocationData);
  console.log("Inserted technician locations");

  // Update technicians with last known locations
  await db.execute(`
    UPDATE technicians SET 
      last_location_lat = '41.8827', 
      last_location_lng = '-87.6233',
      last_location_update = NOW()
    WHERE id = 'tech-1'
  `);
  await db.execute(`
    UPDATE technicians SET 
      last_location_lat = '41.8955', 
      last_location_lng = '-87.6540',
      last_location_update = NOW()
    WHERE id = 'tech-2'
  `);
  await db.execute(`
    UPDATE technicians SET 
      last_location_lat = '41.8675', 
      last_location_lng = '-87.6170',
      last_location_update = NOW()
    WHERE id = 'tech-3'
  `);
  await db.execute(`
    UPDATE technicians SET 
      last_location_lat = '41.9100', 
      last_location_lng = '-87.6850',
      last_location_update = NOW()
    WHERE id = 'tech-4'
  `);
  console.log("Updated technicians with last known locations");

  console.log("Database seeding completed!");
}

// Export seed function for use elsewhere
export { seed };

// Only run seed directly if this file is executed directly (not imported)
// Check for direct execution via command line argument
const isDirectExecution = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isDirectExecution) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
