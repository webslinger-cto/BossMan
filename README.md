# Chicago Sewer Experts CRM

A comprehensive lead management and field service CRM system designed for sewer and plumbing service businesses. This application streamlines lead tracking, job management, quote generation, and team coordination across multiple user roles.

## Table of Contents
- [Features](#features)
- [User Roles](#user-roles)
- [Workflows](#workflows)
- [Integrations](#integrations)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [API Reference](#api-reference)

---

## Features

### Lead Management
- Multi-source lead intake (Thumbtack, Angi, eLocal, Networx, Inquirly, website forms, manual entry)
- Automated lead assignment to available technicians
- Lead status tracking and expiration management
- Contact attempt logging with SMS/call history
- Lead scoring based on service type, urgency, and source quality
- Duplicate detection and SLA tracking

### Job Management
- Complete job lifecycle tracking (Pending → Assigned → Confirmed → En Route → On Site → In Progress → Completed)
- GPS-based technician location tracking with live map view
- Job cost tracking (labor, materials, travel, equipment)
- Revenue and profit calculation per job
- Appointment scheduling with calendar integration
- Cancellation tracking with reason codes

### Quote Builder
- Line-item quote creation with pricebook integration
- Quote approval workflow
- PDF quote generation
- Public shareable quote links
- Customer quote acceptance tracking
- Quote status workflow (Draft → Sent → Viewed → Accepted/Declined)

### Commission Tracking
- NET profit-based commission calculation
- Lead fee deductions ($125/job charged to technicians)
- Monthly commission reporting
- Salesperson and technician commission splits
- Commission status tracking (pending → approved → paid)

### Payroll Management
- Clock in/out time tracking with GPS location verification
- Pay period management (weekly, bi-weekly, monthly)
- Pay stub generation with detailed breakdowns
- Lead fee deduction tracking
- Hourly and salary pay type support
- Overtime calculation

### Communication
- SMS notifications via SignalWire
- Appointment reminders (24-hour, 2-hour, 1-hour options)
- Call forwarding to main business line (630) 251-5628
- Custom message templates with placeholders
- Email notifications via Resend

### SEO Content Management
- Webhook integration with external SEO content provider (webslingeraiglassseo.com)
- Content review and approval workflow with status tabs (Pending/Approved/Rejected/Published)
- Auto-approval delegation option
- Content pack organization with multiple content items
- HMAC signature verification for security

### Marketing ROI
- Marketing spend tracking by source
- Lead-to-revenue attribution
- Cost per lead analysis
- Campaign performance metrics
- Source comparison analytics

### Photo & Video Documentation
- Mobile camera integration
- GPS tagging for each capture
- Before/During/After categorization
- Caption and description support

---

## User Roles

### Administrator
- Full system access
- Company settings management
- Employee access control and permissions
- Payroll and commission oversight
- Analytics and reporting
- Automation rule configuration

### Dispatcher
- Lead management and assignment
- Job scheduling and coordination
- Real-time technician tracking on map
- Quote creation and management
- Customer communications

### Technician
- View assigned jobs
- Clock in/out functionality with GPS
- Job status updates
- Location check-ins
- Quote creation in the field
- Photo/video capture

### Salesperson
- Lead intake and qualification
- Quote creation and follow-up
- Commission tracking based on NET profit
- Customer relationship management
- GPS location tracking for field visits

---

## Workflows

### Lead-to-Job Workflow
```
1. Lead Intake
   └─ Leads arrive via webhooks (Thumbtack, Angi, etc.), intake form, or manual entry
   
2. Assignment
   └─ Dispatcher assigns lead to technician (or auto-assignment if enabled)
   
3. Contact
   └─ System tracks contact attempts via SMS/call
   └─ Automated acknowledgment emails sent
   
4. Scheduling
   └─ Appointment scheduled with customer
   └─ Job created from lead
   
5. Reminders
   └─ Automated reminders sent 24hr/2hr/1hr before appointment
   
6. Job Execution
   └─ Technician clocks in with GPS verification
   └─ Status updates: En Route → On Site → In Progress
   └─ Photos/videos captured as documentation
   
7. Completion
   └─ Job marked complete with final costs
   └─ Customer receives completion notification
   
8. Commission
   └─ Commissions calculated based on NET profit
   └─ Lead fees deducted from technician pay
```

### Quote Workflow
```
1. Quote Creation
   └─ Technician or dispatcher creates quote with line items
   
2. Review (optional)
   └─ Quote sent for approval if required by settings
   
3. Customer Delivery
   └─ Quote sent to customer via email with public link
   └─ Status changes to "Sent"
   
4. Customer Response
   └─ Customer views quote (status: "Viewed")
   └─ Customer accepts or declines
   
5. Job Creation
   └─ Accepted quote triggers job creation
```

### SEO Content Workflow
```
1. Content Receipt
   └─ External SEO service sends content via authenticated webhook
   └─ HMAC signature and timestamp verified
   
2. Review Queue
   └─ Content appears in Pending tab
   └─ (Skip to step 4 if auto-approve is enabled)
   
3. Approval/Rejection
   └─ Admin reviews content details
   └─ Approves or rejects with reason
   
4. Publishing
   └─ Approved content marked as published
   └─ Published content visible in Published tab
```

### Payroll Workflow
```
1. Time Tracking
   └─ Employees clock in/out with GPS verification
   └─ System tracks regular and overtime hours
   
2. Pay Period Close
   └─ Admin closes pay period for processing
   
3. Deductions Applied
   └─ Lead fees calculated and deducted
   └─ Other deductions processed
   
4. Pay Stub Generation
   └─ Detailed pay stubs generated for each employee
   └─ Available for download/print
```

---

## Integrations

### Lead Source Webhooks

| Source | Endpoint | Authentication |
|--------|----------|----------------|
| Thumbtack | `POST /api/webhooks/thumbtack` | Basic Auth |
| Angi | `POST /api/webhooks/angi` | API Key |
| eLocal | `POST /api/webhooks/elocal` | API Key |
| Networx | `POST /api/webhooks/networx` | API Key |
| Inquirly | `POST /api/webhooks/inquirly` | API Key |
| Zapier | `POST /api/webhooks/zapier` | Token |

### SEO Content Integration
- **Provider**: webslingeraiglassseo.com
- **Endpoint**: `POST /api/webhooks/seo-content`
- **Security**: HMAC-SHA256 signature verification
- **Features**: 
  - Content pack ingestion with multiple items
  - Replay attack protection via timestamp validation
  - Auto-approval delegation option in settings

### Communication Services

| Service | Purpose | Status |
|---------|---------|--------|
| SignalWire | SMS messaging, call forwarding | Active |
| Resend | Transactional emails | Active |
| Twilio | SMS (backup) | Pending A2P verification |

### Maps & Location
- **Leaflet/OpenStreetMap**: Interactive technician tracking maps
- **GPS Capture**: Location verification for clock in/out and job updates

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type-safe development |
| Vite | 5.x | Build tool and dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | - | Component library (Radix UI primitives) |
| Wouter | 3.x | Client-side routing |
| TanStack Query | 5.x | Server state management |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |
| Recharts | 2.x | Data visualization |
| Leaflet | 1.x | Interactive maps |
| Framer Motion | 11.x | Animations |
| Lucide React | - | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime environment |
| Express.js | 4.x | HTTP server framework |
| TypeScript | 5.x | Type-safe development |
| Passport.js | 0.7.x | Session-based authentication |
| Zod | 3.x | Runtime validation |
| express-session | - | Session management |

### Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database (Neon-backed) |
| Drizzle ORM | Type-safe database queries |
| drizzle-zod | Schema validation integration |
| drizzle-kit | Database migrations |

### External Services

| Service | Purpose |
|---------|---------|
| SignalWire | SMS and voice communication |
| Resend | Email delivery |
| OpenStreetMap | Map tiles |

---

## Project Structure

```
├── client/                     # Frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── pages/            # Route-based page components
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── dispatcher-dashboard.tsx
│   │   │   ├── technician-dashboard.tsx
│   │   │   ├── salesperson-dashboard.tsx
│   │   │   ├── seo-content.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── ...
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and helpers
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx           # Main app with routing
│   │   └── main.tsx          # Entry point
│   └── index.html
│
├── server/                    # Backend application
│   ├── routes.ts             # API route definitions
│   ├── storage.ts            # Database operations (IStorage interface)
│   ├── db.ts                 # Database connection
│   ├── auth.ts               # Authentication setup
│   ├── vite.ts               # Vite dev server integration
│   └── services/             # Business logic services
│       ├── automationService.ts
│       └── emailService.ts
│
├── shared/                    # Shared code (frontend & backend)
│   └── schema.ts             # Database schema, types, and Zod schemas
│
├── design_guidelines.md       # UI/UX design specifications
├── replit.md                 # Project documentation for AI
└── README.md                 # This file
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption key |

### Communication Services

| Variable | Description |
|----------|-------------|
| `SIGNALWIRE_PROJECT_ID` | SignalWire project ID |
| `SIGNALWIRE_API_TOKEN` | SignalWire API token |
| `SIGNALWIRE_PHONE_NUMBER` | SignalWire phone number |
| `SIGNALWIRE_SPACE_URL` | SignalWire space URL |
| `RESEND_API_KEY` | Resend email API key (via integration) |

### Webhook Authentication

| Variable | Description |
|----------|-------------|
| `THUMBTACK_WEBHOOK_USER` | Thumbtack basic auth username |
| `THUMBTACK_WEBHOOK_PASS` | Thumbtack basic auth password |
| `ANGI_WEBHOOK_KEY` | Angi API key (optional) |

### Optional (Twilio Backup)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |

---

## Demo Accounts

| Username | Role | Password |
|----------|------|----------|
| sarah | Admin | demo123 |
| admin | Admin | demo123 |
| dispatcher | Dispatcher | demo123 |
| mike | Technician | demo123 |
| carlos | Technician | demo123 |
| james | Salesperson | demo123 |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/user` | Get current user |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List all leads |
| POST | `/api/leads` | Create new lead |
| GET | `/api/leads/:id` | Get lead details |
| PATCH | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs/:id` | Get job details |
| PATCH | `/api/jobs/:id` | Update job |
| POST | `/api/jobs/:id/complete` | Mark job complete |
| GET | `/api/jobs/:id/attachments` | Get job attachments |
| POST | `/api/jobs/:id/attachments` | Upload attachment |

### Technicians
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/technicians` | List all technicians |
| GET | `/api/technicians/available` | List available technicians |
| GET | `/api/technicians/:id` | Get technician details |
| POST | `/api/technicians/:id/location` | Update location |
| GET | `/api/technician-locations/:id/history` | Location history |

### Quotes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes` | List all quotes |
| POST | `/api/quotes` | Create new quote |
| GET | `/api/quotes/:id` | Get quote details |
| PATCH | `/api/quotes/:id` | Update quote |
| GET | `/api/quotes/public/:token` | Public quote view |

### Salespersons & Commissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/salespersons` | List all salespersons |
| GET | `/api/salespersons/:id` | Get salesperson details |
| GET | `/api/salespersons/:id/commissions` | Get commission history |
| POST | `/api/salespersons/:id/location` | Update GPS location |
| GET | `/api/sales-commissions` | List commissions |
| POST | `/api/sales-commissions/calculate/:jobId` | Calculate commission |
| PATCH | `/api/sales-commissions/:id` | Update commission status |

### Payroll
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payroll/time-entries` | Get time entries |
| POST | `/api/payroll/clock-in` | Clock in |
| POST | `/api/payroll/clock-out` | Clock out |
| GET | `/api/payroll/pay-periods` | Get pay periods |
| POST | `/api/payroll/pay-periods` | Create pay period |
| GET | `/api/payroll/pay-stubs` | Get pay stubs |

### SEO Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content-packs` | List content packs |
| GET | `/api/content-packs/:id` | Get content pack details |
| POST | `/api/content-packs/:id/approve` | Approve content |
| POST | `/api/content-packs/:id/reject` | Reject content |
| PATCH | `/api/content-packs/:id/publish` | Publish content |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/thumbtack` | Thumbtack lead intake |
| POST | `/api/webhooks/angi` | Angi lead intake |
| POST | `/api/webhooks/elocal` | eLocal lead intake |
| POST | `/api/webhooks/networx` | Networx lead intake |
| POST | `/api/webhooks/inquirly` | Inquirly lead intake |
| POST | `/api/webhooks/zapier` | Zapier integration |
| POST | `/api/webhooks/seo-content` | SEO content intake |

---

## Service Types

The system supports the following plumbing/sewer service categories:

- Sewer Main - Clear
- Sewer Main - Repair
- Sewer Main - Replace
- Drain Cleaning
- Water Heater - Repair/Replace
- Toilet Repair
- Faucet Repair
- Pipe Repair/Replacement
- Sump Pump
- Ejector Pump
- Camera Inspection
- Hydro Jetting

---

## Getting Started

1. The application runs automatically via the configured workflow on port 5000
2. Navigate to the application URL
3. Log in with one of the demo accounts above
4. Navigate using the sidebar based on your role
5. Admin dashboard provides full system overview
6. Technician view simulates mobile field experience

---

*Chicago Sewer Experts CRM - Built for efficient field service management*
