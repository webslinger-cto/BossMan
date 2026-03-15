import twilio from "twilio";
import { sendEmail } from "./email";

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Carrier email-to-SMS gateways
// NOTE: AT&T discontinued email-to-SMS gateways in June 2025
const CARRIER_GATEWAYS: Record<string, string> = {
  "3123699850": "vtext.com",        // Xfinity Mobile (uses Verizon network)
};

// Get carrier gateway for a phone number (if known)
function getCarrierGateway(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return CARRIER_GATEWAYS[last10] || null;
}

// Send SMS via carrier email gateway
async function sendViaCarrierGateway(to: string, body: string): Promise<SMSResult> {
  const digits = to.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const gateway = getCarrierGateway(to);
  
  if (!gateway) {
    return { success: false, error: "No carrier gateway configured for this number" };
  }
  
  const emailAddress = `${last10}@${gateway}`;
  console.log(`SMS: Sending via carrier gateway to ${emailAddress}`);
  
  try {
    const result = await sendEmail({
      to: emailAddress,
      subject: "",
      html: body,
      text: body,
    });
    
    if (result.success) {
      console.log(`SMS sent via carrier gateway: ${emailAddress}`);
      return { success: true, messageId: `gateway-${result.messageId}` };
    } else {
      console.log(`SMS carrier gateway error: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Twilio credentials
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// SignalWire credentials (fallback)
const signalwireProjectId = process.env.SIGNALWIRE_PROJECT_ID;
const signalwireApiToken = process.env.SIGNALWIRE_API_TOKEN;
const signalwireSpaceUrl = process.env.SIGNALWIRE_SPACE_URL;
const signalwirePhoneNumber = process.env.SIGNALWIRE_PHONE_NUMBER;

// Status callback URLs - use environment variable or construct from REPLIT_DEV_DOMAIN
function getStatusCallbackUrl(provider: "twilio" | "signalwire"): string | undefined {
  const baseUrl = process.env.APP_BASE_URL || 
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : undefined);
  
  if (!baseUrl) return undefined;
  return `${baseUrl}/api/webhooks/${provider}/status`;
}

function getTwilioClient(): twilio.Twilio | null {
  if (!twilioAccountSid || !twilioAuthToken) {
    return null;
  }
  return twilio(twilioAccountSid, twilioAuthToken);
}

// Normalize phone number to E.164 format (+1XXXXXXXXXX)
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  if (phone.startsWith("+")) {
    return phone;
  }
  
  return phone;
}

// Mask phone number for logging (show last 4 digits only)
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `***${digits.slice(-4)}`;
  }
  return "***";
}

export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  const normalizedTo = normalizePhoneNumber(to);
  console.log(`SMS: Sending to ${maskPhone(normalizedTo)}`);
  
  // Check if this number has a carrier gateway - use it FIRST
  const gateway = getCarrierGateway(to);
  if (gateway) {
    console.log(`SMS: Using carrier email gateway for ${maskPhone(to)}`);
    const gatewayResult = await sendViaCarrierGateway(to, body);
    if (gatewayResult.success) {
      return gatewayResult;
    }
    console.log(`SMS: Carrier gateway failed, trying Twilio/SignalWire as fallback`);
  }
  
  // Try Twilio first (with status callback)
  const twilioClient = getTwilioClient();
  if (twilioClient && twilioPhoneNumber) {
    try {
      const twilioCallbackUrl = getStatusCallbackUrl("twilio");
      const message = await twilioClient.messages.create({
        from: twilioPhoneNumber,
        to: normalizedTo,
        body: body,
        ...(twilioCallbackUrl && { statusCallback: twilioCallbackUrl }),
      });
      
      console.log(`SMS sent via Twilio: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Twilio SMS failed:", errorMessage);
      // Fall through to SignalWire
    }
  }
  
  // Try SignalWire as fallback (with status callback)
  if (signalwireProjectId && signalwireApiToken && signalwireSpaceUrl && signalwirePhoneNumber) {
    try {
      const { RestClient } = await import("@signalwire/compatibility-api");
      const client = RestClient(signalwireProjectId, signalwireApiToken, { 
        signalwireSpaceUrl: signalwireSpaceUrl 
      });
      
      const signalwireCallbackUrl = getStatusCallbackUrl("signalwire");
      const message = await client.messages.create({
        from: signalwirePhoneNumber,
        to: normalizedTo,
        body: body,
        ...(signalwireCallbackUrl && { statusCallback: signalwireCallbackUrl }),
      });
      
      console.log(`SMS sent via SignalWire: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("SignalWire SMS failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  return { success: false, error: "SMS service not configured (no Twilio or SignalWire credentials)" };
}

export async function sendAppointmentReminder(
  customerPhone: string,
  customerName: string,
  appointmentDate: Date,
  technicianName: string,
  jobAddress: string
): Promise<SMSResult> {
  const dateStr = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = appointmentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const message = `Hi ${customerName}, this is a reminder of your appointment with Chicago Sewer Experts on ${dateStr} at ${timeStr}. ${technicianName} will arrive at ${jobAddress}. Reply CONFIRM to confirm or call us to reschedule.`;

  return sendSMS(customerPhone, message);
}

export async function sendJobConfirmation(
  customerPhone: string,
  customerName: string,
  jobDescription: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, thank you for choosing Chicago Sewer Experts! We have received your request for: ${jobDescription}. A technician will be assigned shortly. We will contact you with appointment details.`;

  return sendSMS(customerPhone, message);
}

export async function sendTechnicianEnRoute(
  customerPhone: string,
  customerName: string,
  technicianName: string,
  estimatedArrival: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, ${technicianName} from Chicago Sewer Experts is on the way! Estimated arrival: ${estimatedArrival}. Call or text if you have questions.`;

  return sendSMS(customerPhone, message);
}

export async function sendJobComplete(
  customerPhone: string,
  customerName: string,
  technicianName: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, ${technicianName} has completed the work at your location. Thank you for choosing Chicago Sewer Experts! Please let us know if you have any questions.`;

  return sendSMS(customerPhone, message);
}

export async function sendQuoteReady(
  customerPhone: string,
  customerName: string,
  quoteUrl: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, your quote from Chicago Sewer Experts is ready! View it here: ${quoteUrl}. Reply or call us with any questions.`;

  return sendSMS(customerPhone, message);
}

export async function sendChatInvite(
  customerPhone: string,
  customerName: string,
  chatUrl: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}, Chicago Sewer Experts needs to communicate with you about your service. Tap here to chat with us: ${chatUrl}`;

  return sendSMS(customerPhone, message);
}

export function isConfigured(): boolean {
  const hasTwilio = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);
  const hasSignalWire = !!(signalwireProjectId && signalwireApiToken && signalwireSpaceUrl && signalwirePhoneNumber);
  return hasTwilio || hasSignalWire;
}

export function getActiveProvider(): string {
  if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
    return "Twilio";
  }
  if (signalwireProjectId && signalwireApiToken && signalwireSpaceUrl && signalwirePhoneNumber) {
    return "SignalWire";
  }
  return "None";
}
