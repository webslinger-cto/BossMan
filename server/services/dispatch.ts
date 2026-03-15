import { storage } from "../storage";
import { geocodeAddress, calculateHaversineDistance } from "./geocoding";
import { sendEmail } from "./email";
import type { Technician, TechnicianLocation } from "@shared/schema";

export interface ClosestTechnicianResult {
  technician: Technician;
  location: TechnicianLocation;
  distanceMiles: number;
}

export interface DispatchResult {
  success: boolean;
  technician?: ClosestTechnicianResult;
  jobAddress: string;
  coordinates?: { latitude: number; longitude: number };
  emailSent?: boolean;
  error?: string;
}

export async function findClosestAvailableTechnician(
  latitude: number,
  longitude: number
): Promise<ClosestTechnicianResult | null> {
  const availableTechs = await storage.getAvailableTechnicians();
  
  if (availableTechs.length === 0) {
    return null;
  }
  
  const techsWithLocation: ClosestTechnicianResult[] = [];
  
  for (const tech of availableTechs) {
    const latestLocation = await storage.getLatestTechnicianLocation(tech.id);
    
    if (latestLocation && latestLocation.latitude && latestLocation.longitude) {
      const techLat = parseFloat(latestLocation.latitude);
      const techLng = parseFloat(latestLocation.longitude);
      
      const distance = calculateHaversineDistance(
        latitude,
        longitude,
        techLat,
        techLng
      );
      
      techsWithLocation.push({
        technician: tech,
        location: latestLocation,
        distanceMiles: Math.round(distance * 10) / 10,
      });
    }
  }
  
  if (techsWithLocation.length === 0) {
    return null;
  }
  
  techsWithLocation.sort((a, b) => a.distanceMiles - b.distanceMiles);
  
  return techsWithLocation[0];
}

function generateDispatchEmailHtml(
  technicianName: string,
  address: string,
  customerName: string,
  serviceType: string,
  distanceMiles: number
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #111827; padding: 20px; text-align: center;">
        <h1 style="color: #b22222; margin: 0;">Chicago Sewer Experts</h1>
        <p style="color: #9ca3af; margin: 5px 0 0 0;">New Job Assignment</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #111827; margin-top: 0;">Hello ${technicianName},</h2>
        
        <p style="color: #374151; line-height: 1.6;">
          You have been assigned a new job because you are the closest available technician.
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #111827; margin-top: 0;">Job Details:</h3>
          <ul style="color: #374151; line-height: 1.8; list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Service:</strong> ${serviceType}</li>
            <li><strong>Address:</strong> ${address}</li>
            <li><strong>Distance:</strong> ${distanceMiles} miles from your location</li>
          </ul>
        </div>
        
        <p style="color: #374151; line-height: 1.6;">
          Please confirm your availability and head to the job site as soon as possible.
        </p>
        
        <p style="color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>Chicago Sewer Experts Dispatch</strong>
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          Chicago Sewer Experts | Chicago, IL
        </p>
      </div>
    </div>
  `;
}

export async function dispatchToClosestTechnician(
  address: string,
  jobId?: string,
  customerName?: string,
  serviceType?: string
): Promise<DispatchResult> {
  const coords = await geocodeAddress(address);
  
  if (!coords) {
    return {
      success: false,
      jobAddress: address,
      error: "Could not geocode the provided address",
    };
  }
  
  const closest = await findClosestAvailableTechnician(coords.latitude, coords.longitude);
  
  if (!closest) {
    return {
      success: false,
      jobAddress: address,
      coordinates: coords,
      error: "No available technicians with location data found",
    };
  }
  
  let emailSent = false;
  const techName = closest.technician.fullName;
  const custName = customerName || "Customer";
  const svcType = serviceType || "Service Call";
  
  if (closest.technician.email) {
    try {
      const html = generateDispatchEmailHtml(
        techName,
        address,
        custName,
        svcType,
        closest.distanceMiles
      );
      
      const result = await sendEmail({
        to: closest.technician.email,
        subject: `New Job Assignment - ${address}`,
        html,
        text: `Hello ${techName}, you have been assigned a new job at ${address}. Customer: ${custName}. Service: ${svcType}. Distance: ${closest.distanceMiles} miles.`,
      });
      
      emailSent = result.success;
    } catch (error) {
      console.error("Failed to send assignment email:", error);
    }
  }
  
  await storage.createContactAttempt({
    type: "email",
    status: emailSent ? "sent" : "failed",
    direction: "outbound",
    subject: `Job Assignment - ${address}`,
    content: `Dispatch to closest technician: ${techName} (${closest.distanceMiles} mi away)`,
    recipientEmail: closest.technician.email || undefined,
    sentBy: "automation",
    sentAt: new Date(),
  });
  
  return {
    success: true,
    technician: closest,
    jobAddress: address,
    coordinates: coords,
    emailSent,
  };
}
