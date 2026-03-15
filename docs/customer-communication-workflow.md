# Customer Communication Workflow

## Overview

Emergency Chicago Sewer Experts CRM includes a TCPA-compliant automated customer communication system. This system sends SMS and email notifications to customers about their scheduled jobs, but only when customers have explicitly opted in to receive these communications.

---

## How It Works

### Step 1: Quote Creation and Sending

1. A dispatcher or salesperson creates a quote for a customer
2. The quote includes customer contact information (phone and/or email)
3. When the quote link is generated, it becomes accessible via a public URL
4. The customer receives this link (via email, SMS, or other means)

### Step 2: Customer Reviews Quote

1. Customer opens the public quote link in their browser
2. They see the full quote details including services, pricing, and total
3. At the bottom, they see the **"Keep Me Updated"** section

### Step 3: Customer Consent (Opt-In)

When accepting a quote, customers can choose to receive automated updates:

#### SMS Updates Option
- Customer checks **"Send me SMS job updates"**
- A second checkbox appears: **"I confirm this phone number belongs to me"**
- Customer must confirm ownership to proceed

#### Email Updates Option  
- Customer checks **"Send me email job updates"**
- A second checkbox appears: **"I confirm this email address belongs to me"**
- Customer must confirm ownership to proceed

#### Disclosure Text
When either opt-in is selected, customers see the full disclosure:

> "By opting in, you agree to receive automated appointment reminders and job status updates via SMS and/or email. Message and data rates may apply. You can opt out at any time by contacting us. Standard message frequency varies based on service activity."

### Step 4: Quote Acceptance

1. Customer clicks **"Accept Quote"**
2. If they checked an opt-in but didn't confirm ownership, they see an error message
3. Once properly completed, the quote is accepted
4. A job is automatically created from the quote data
5. Customer consent preferences are stored on the job record

---

## Automated Communications

Once a job is created with customer consent, the system can send these automated messages:

### Appointment Reminders
- **48 hours before** scheduled appointment
- **24 hours before** scheduled appointment  
- **Day of** appointment

### Status Updates
- **Technician en route** - "Your technician [Name] is on the way!"
- **Job complete** - "Your service has been completed"

---

## Communication Gating Logic

The system checks consent before sending any automated message:

| Scenario | SMS Sent? | Email Sent? |
|----------|-----------|-------------|
| Customer opted in to SMS | Yes | No |
| Customer opted in to email | No | Yes |
| Customer opted in to both | Yes | Yes |
| Customer didn't opt in (new job) | No | No |
| Legacy job (before consent system) | Yes | Yes |

### Legacy Job Handling
Jobs created before the consent system was implemented have `null` consent fields. These jobs continue to receive all automated communications to maintain backward compatibility.

---

## Consent Data Captured

For audit and compliance purposes, the following data is stored:

| Field | Description |
|-------|-------------|
| SMS Opt-In | Whether customer opted in to SMS |
| Email Opt-In | Whether customer opted in to email |
| SMS Ownership Confirmed | Customer confirmed phone ownership |
| Email Ownership Confirmed | Customer confirmed email ownership |
| Consent Timestamp | When consent was given |
| Client IP Address | For audit trail |
| Browser User Agent | For audit trail |
| Disclosure Version | Version of disclosure text shown |
| Disclosure Text | Full text of disclosure shown |
| Consent Source | Where consent was collected |

---

## For Dispatchers and Admins

### Viewing Consent Status
When viewing a job, you can see:
- Whether the customer opted in to SMS/email updates
- When they gave consent
- Whether automated reminders will be sent

### Manual Communications
You can always send manual SMS or email to customers regardless of their opt-in status. The consent system only gates **automated** communications.

### Sending Reminders
- Navigate to the job details
- Click "Send Reminder" to manually trigger an appointment reminder
- The system will check consent and only send via opted-in channels

---

## Compliance Notes

This system is designed with TCPA (Telephone Consumer Protection Act) compliance in mind:

1. **Express Consent** - Customers must actively check the opt-in box
2. **Ownership Confirmation** - Customers confirm they own the phone/email
3. **Clear Disclosure** - Full terms are displayed before consent
4. **Audit Trail** - IP address, timestamp, and disclosure text are recorded
5. **Easy Opt-Out** - Customers can contact you to opt out at any time

---

## Technical Details

### Database Fields (jobs table)
- `customer_consent_sms_opt_in` - Boolean
- `customer_consent_email_opt_in` - Boolean
- `customer_consent_sms_ownership_confirmed` - Boolean
- `customer_consent_email_ownership_confirmed` - Boolean
- `customer_consent_at` - Timestamp
- `customer_consent_ip` - String
- `customer_consent_user_agent` - String
- `customer_consent_disclosure_version` - String
- `customer_consent_disclosure_text` - Text
- `customer_consent_source` - String

### Relevant Files
- `client/src/pages/PublicQuotePage.tsx` - Consent UI
- `server/routes.ts` - Quote acceptance with consent
- `server/services/automation.ts` - Communication gating logic
