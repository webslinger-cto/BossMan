// Resend email service for Emergency Chicago Sewer Experts CRM
// Integration: Resend connection via Replit integrations

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const result = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function generateLeadAcknowledgmentEmail(customerName: string, serviceType: string): { subject: string; html: string; text: string } {
  const subject = `Emergency Chicago Sewer Experts - We Received Your Request`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0f172a; padding: 20px; text-align: center;">
        <h1 style="color: #3b82f6; margin: 0;">Emergency Chicago Sewer Experts</h1>
        <p style="color: #9ca3af; margin: 5px 0 0 0;">Professional Sewer & Plumbing Services</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #111827; margin-top: 0;">Hello ${customerName},</h2>
        
        <p style="color: #374151; line-height: 1.6;">
          Thank you for reaching out to Emergency Chicago Sewer Experts! We have received your request 
          for <strong>${serviceType}</strong> service.
        </p>
        
        <p style="color: #374151; line-height: 1.6;">
          One of our team members will contact you shortly to discuss your needs and schedule 
          a convenient time for service.
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #111827; margin-top: 0;">What to Expect:</h3>
          <ul style="color: #374151; line-height: 1.8;">
            <li>A call from our team within 1-2 hours during business hours</li>
            <li>Free estimate for most services</li>
            <li>Licensed and insured technicians</li>
            <li>24/7 emergency service available</li>
          </ul>
        </div>
        
        <p style="color: #374151; line-height: 1.6;">
          If this is an emergency, please call us directly at <strong>(312) 555-SEWER</strong>.
        </p>
        
        <p style="color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>Emergency Chicago Sewer Experts Team</strong>
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          Emergency Chicago Sewer Experts | Chicago, IL | (312) 555-SEWER
        </p>
      </div>
    </div>
  `;
  
  const text = `
Hello ${customerName},

Thank you for reaching out to Emergency Chicago Sewer Experts! We have received your request for ${serviceType} service.

One of our team members will contact you shortly to discuss your needs and schedule a convenient time for service.

What to Expect:
- A call from our team within 1-2 hours during business hours
- Free estimate for most services
- Licensed and insured technicians
- 24/7 emergency service available

If this is an emergency, please call us directly at (312) 555-SEWER.

Best regards,
Emergency Chicago Sewer Experts Team
  `;
  
  return { subject, html, text };
}

export function generateAppointmentReminderEmail(
  customerName: string, 
  scheduledDate: string, 
  scheduledTime: string,
  technicianName: string,
  address: string
): { subject: string; html: string; text: string } {
  const subject = `Appointment Reminder - Emergency Chicago Sewer Experts`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #111827; padding: 20px; text-align: center;">
        <h1 style="color: #3b82f6; margin: 0;">Emergency Chicago Sewer Experts</h1>
        <p style="color: #9ca3af; margin: 5px 0 0 0;">Appointment Reminder</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #111827; margin-top: 0;">Hello ${customerName},</h2>
        
        <p style="color: #374151; line-height: 1.6;">
          This is a friendly reminder about your upcoming appointment with Emergency Chicago Sewer Experts.
        </p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #92400e; margin-top: 0;">Appointment Details:</h3>
          <p style="color: #374151; margin: 5px 0;"><strong>Date:</strong> ${scheduledDate}</p>
          <p style="color: #374151; margin: 5px 0;"><strong>Time:</strong> ${scheduledTime}</p>
          <p style="color: #374151; margin: 5px 0;"><strong>Technician:</strong> ${technicianName}</p>
          <p style="color: #374151; margin: 5px 0;"><strong>Location:</strong> ${address}</p>
        </div>
        
        <p style="color: #374151; line-height: 1.6;">
          Please ensure someone is available at the property to provide access. 
          If you need to reschedule, please call us at <strong>(312) 555-SEWER</strong>.
        </p>
        
        <p style="color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>Emergency Chicago Sewer Experts Team</strong>
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          Emergency Chicago Sewer Experts | Chicago, IL | (312) 555-SEWER
        </p>
      </div>
    </div>
  `;
  
  const text = `
Hello ${customerName},

This is a friendly reminder about your upcoming appointment with Emergency Chicago Sewer Experts.

Appointment Details:
- Date: ${scheduledDate}
- Time: ${scheduledTime}
- Technician: ${technicianName}
- Location: ${address}

Please ensure someone is available at the property to provide access.
If you need to reschedule, please call us at (312) 555-SEWER.

Best regards,
Emergency Chicago Sewer Experts Team
  `;
  
  return { subject, html, text };
}

export function generateQuoteEmail(
  customerName: string,
  quoteTotal: number,
  lineItems: Array<{ description: string; amount: number }>,
  validUntil: string
): { subject: string; html: string; text: string } {
  const subject = `Your Quote from Emergency Chicago Sewer Experts - $${quoteTotal.toFixed(2)}`;
  
  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #111827; padding: 20px; text-align: center;">
        <h1 style="color: #3b82f6; margin: 0;">Emergency Chicago Sewer Experts</h1>
        <p style="color: #9ca3af; margin: 5px 0 0 0;">Your Service Quote</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #111827; margin-top: 0;">Hello ${customerName},</h2>
        
        <p style="color: #374151; line-height: 1.6;">
          Thank you for choosing Emergency Chicago Sewer Experts. Here is your detailed quote:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Service</th>
              <th style="padding: 10px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
            <tr style="background-color: #111827; color: #ffffff;">
              <td style="padding: 15px; font-weight: bold;">Total</td>
              <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">$${quoteTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <p style="color: #6b7280; font-size: 14px;">
          This quote is valid until ${validUntil}.
        </p>
        
        <p style="color: #374151; line-height: 1.6;">
          To approve this quote and schedule service, please call us at <strong>(312) 555-SEWER</strong> 
          or reply to this email.
        </p>
        
        <p style="color: #374151; line-height: 1.6;">
          Best regards,<br>
          <strong>Emergency Chicago Sewer Experts Team</strong>
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          Emergency Chicago Sewer Experts | Chicago, IL | (312) 555-SEWER
        </p>
      </div>
    </div>
  `;
  
  const lineItemsText = lineItems.map(item => `- ${item.description}: $${item.amount.toFixed(2)}`).join('\n');
  
  const text = `
Hello ${customerName},

Thank you for choosing Emergency Chicago Sewer Experts. Here is your detailed quote:

${lineItemsText}

TOTAL: $${quoteTotal.toFixed(2)}

This quote is valid until ${validUntil}.

To approve this quote and schedule service, please call us at (312) 555-SEWER or reply to this email.

Best regards,
Emergency Chicago Sewer Experts Team
  `;
  
  return { subject, html, text };
}
