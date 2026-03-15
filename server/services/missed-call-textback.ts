import { sendSMS } from "./sms";

// In-memory rate limiter to prevent spamming the same caller
const recentTextbacks = new Map<string, number>();
const TEXTBACK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour — don't text same number twice in an hour

// Default MCTB message template
// {companyName} will be replaced per-tenant in multi-tenant mode
const DEFAULT_TEXTBACK_MESSAGE = `Sorry we missed your call! We're currently assisting other customers and will get back to you as soon as possible. In the meantime, reply with:

📋 SERVICES — What we offer
📅 SCHEDULE — Book an appointment  
💬 QUOTE — Request a free estimate

We'll return your call shortly. Reply STOP to unsubscribe.`;

// Keyword auto-responses
const KEYWORD_RESPONSES: Record<string, string> = {
  SERVICES: `Here's what we do:
🔧 Sewer Line Repair & Replacement
🚿 Drain Cleaning & Maintenance  
🏠 Plumbing Inspections
🚨 Emergency Services (24/7)

Reply SCHEDULE to book or QUOTE for a free estimate.`,

  SCHEDULE: `Great! To schedule an appointment, we need a few details. Please reply with:

Your name, preferred date/time, and a brief description of the issue.

Or call us back and we'll get you booked right away!`,

  QUOTE: `We'd love to give you a free estimate! Please reply with:

Your name, address, and a description of what you need done.

We'll get back to you with a quote within 2 hours during business hours.`,

  HOURS: `Our business hours:
Mon-Fri: 7:00 AM - 6:00 PM
Sat: 8:00 AM - 2:00 PM
Sun: Closed (Emergency services available)

Reply SERVICES to see what we offer or SCHEDULE to book.`,

  HELP: `Available commands:
📋 SERVICES — What we offer
📅 SCHEDULE — Book an appointment
💬 QUOTE — Request a free estimate  
🕐 HOURS — Business hours
❌ STOP — Unsubscribe

Reply with any keyword above!`,
};

export interface MissedCallTextbackResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
}

/**
 * Send an auto-text when a call is missed (no-answer, busy, failed)
 */
export async function handleMissedCall(
  callerPhone: string,
  companyName?: string
): Promise<MissedCallTextbackResult> {
  // Rate limit check
  const lastTextback = recentTextbacks.get(callerPhone);
  if (lastTextback && Date.now() - lastTextback < TEXTBACK_COOLDOWN_MS) {
    console.log(`[MCTB] Skipping ${callerPhone} — texted within cooldown period`);
    return { sent: false, reason: "cooldown" };
  }

  // Build the message
  let message = DEFAULT_TEXTBACK_MESSAGE;
  if (companyName) {
    message = `${companyName}: ${message}`;
  }

  // Send the text
  console.log(`[MCTB] Sending missed-call text-back to ${callerPhone}`);
  const result = await sendSMS(callerPhone, message);

  if (result.success) {
    // Update rate limiter
    recentTextbacks.set(callerPhone, Date.now());
    console.log(`[MCTB] Text-back sent successfully: ${result.messageId}`);
    return { sent: true, messageId: result.messageId };
  } else {
    console.error(`[MCTB] Failed to send text-back: ${result.error}`);
    return { sent: false, reason: result.error };
  }
}

/**
 * Handle an incoming SMS and check for keyword auto-responses
 * Returns the auto-response message or null if no keyword matched
 */
export function getKeywordResponse(incomingBody: string): string | null {
  const keyword = incomingBody.trim().toUpperCase();
  return KEYWORD_RESPONSES[keyword] || null;
}

/**
 * Cleanup old entries from the rate limiter (call periodically)
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [phone, timestamp] of recentTextbacks) {
    if (now - timestamp > TEXTBACK_COOLDOWN_MS) {
      recentTextbacks.delete(phone);
    }
  }
}

// Cleanup every 30 minutes
setInterval(cleanupRateLimiter, 30 * 60 * 1000);
