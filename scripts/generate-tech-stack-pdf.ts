import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({ 
  size: 'LETTER',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(process.cwd(), 'public', 'Chicago_Sewer_Experts_Tech_Stack.pdf');

if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
}

doc.pipe(fs.createWriteStream(outputPath));

const colors = {
  primary: '#b22222',
  secondary: '#1a1a2e',
  accent: '#3a3a5e',
  text: '#333333',
  lightGray: '#666666',
  border: '#cccccc'
};

function addTitle(text: string) {
  doc.fontSize(24).fillColor(colors.primary).text(text, { align: 'center' });
  doc.moveDown(0.5);
}

function addHeading(text: string) {
  doc.fontSize(16).fillColor(colors.secondary).text(text);
  doc.moveDown(0.3);
}

function addSubheading(text: string) {
  doc.fontSize(12).fillColor(colors.accent).text(text);
  doc.moveDown(0.2);
}

function addBody(text: string) {
  doc.fontSize(10).fillColor(colors.text).text(text, { lineGap: 2 });
  doc.moveDown(0.3);
}

function addCodeBlock(label: string, description: string, files: string[]) {
  doc.fontSize(11).fillColor(colors.primary).text(label);
  doc.fontSize(10).fillColor(colors.text).text(description);
  doc.fontSize(9).fillColor(colors.lightGray).text('Files: ' + files.join(', '));
  doc.moveDown(0.5);
}

function addSeparator() {
  doc.moveDown(0.3);
  doc.strokeColor(colors.border).lineWidth(0.5)
    .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);
}

// COVER PAGE
addTitle('CHICAGO SEWER EXPERTS CRM');
doc.fontSize(14).fillColor(colors.lightGray).text('Technical Architecture & Stack Documentation', { align: 'center' });
doc.moveDown(2);
doc.fontSize(10).fillColor(colors.text).text('Version 1.0 | December 2024', { align: 'center' });
doc.moveDown(1);
doc.fontSize(10).text('A comprehensive field service management and CRM system', { align: 'center' });
doc.addPage();

// EXECUTIVE SUMMARY
addTitle('Executive Summary');
addBody(`Chicago Sewer Experts CRM is a full-stack web application designed for field service management in the plumbing and sewer industry. The system provides role-based access for administrators, dispatchers, field technicians, and salespeople.

Key Features:
- Lead management from multiple sources (eLocal, Networx, Angi, Thumbtack, Inquirly, Zapier)
- Real-time GPS tracking with interactive map views
- Quote generation with public shareable links
- Commission tracking based on NET profit calculations
- Automated notifications via email (Resend) and SMS (Twilio/Zapier)
- Pricebook management for standardized service pricing
- Marketing ROI tracking and analytics
- Call/SMS forwarding to office phone`);
doc.addPage();

// TECH STACK OVERVIEW
addTitle('Technology Stack Overview');
addSeparator();

addHeading('1. FRONTEND LAYER');
addSubheading('Core Framework');
addCodeBlock(
  'React 18 + TypeScript + Vite',
  'Single-page application with type-safe components and hot module replacement for rapid development.',
  ['client/src/App.tsx', 'client/src/main.tsx', 'vite.config.ts']
);

addSubheading('UI Component System');
addCodeBlock(
  'Radix UI + shadcn/ui Pattern',
  'Accessible, unstyled primitives wrapped in custom styled components. Includes dialogs, dropdowns, forms, tables, and navigation.',
  ['client/src/components/ui/*']
);

addSubheading('Styling');
addCodeBlock(
  'Tailwind CSS + Custom Design System',
  'Utility-first CSS with custom color tokens, dark mode support, and elevation utilities for hover/active states.',
  ['client/src/index.css', 'tailwind.config.ts', 'design_guidelines.md']
);

addSubheading('State Management');
addCodeBlock(
  'TanStack Query (React Query)',
  'Server state management with caching, automatic refetching, and optimistic updates for mutations.',
  ['client/src/lib/queryClient.ts']
);

addSubheading('Routing');
addCodeBlock(
  'Wouter',
  'Lightweight client-side routing with role-based route protection.',
  ['client/src/App.tsx', 'client/src/pages/*']
);

addSubheading('Forms');
addCodeBlock(
  'React Hook Form + Zod Validation',
  'Performant form handling with schema-based validation using shared Drizzle-Zod schemas.',
  ['client/src/components/ui/form.tsx']
);

addSubheading('Data Visualization');
addCodeBlock(
  'Recharts',
  'Charts for analytics dashboards including bar charts, pie charts, area charts, and line charts.',
  ['client/src/pages/admin/analytics.tsx']
);

addSubheading('Maps');
addCodeBlock(
  'Leaflet + React-Leaflet',
  'Interactive maps for real-time technician GPS tracking and job location visualization.',
  ['client/src/pages/dispatcher/technician-map.tsx']
);
doc.addPage();

addHeading('2. BACKEND LAYER');
addSubheading('Server Framework');
addCodeBlock(
  'Express.js + TypeScript',
  'RESTful API server with middleware for logging, authentication, and request validation.',
  ['server/index.ts', 'server/routes.ts']
);

addSubheading('Authentication');
addCodeBlock(
  'Passport.js + Express Sessions',
  'Session-based authentication with local strategy. Supports four user roles: admin, dispatcher, technician, salesperson.',
  ['server/auth.ts', 'server/routes.ts']
);

addSubheading('Database ORM');
addCodeBlock(
  'Drizzle ORM + PostgreSQL',
  'Type-safe database operations with schema-first design. Supports complex queries, relations, and transactions.',
  ['server/db.ts', 'shared/schema.ts']
);

addSubheading('Storage Interface');
addCodeBlock(
  'Abstract Storage Pattern',
  'IStorage interface abstracts data access, enabling easy switching between in-memory and database implementations.',
  ['server/storage.ts']
);

addSubheading('Email Service');
addCodeBlock(
  'Resend API',
  'Transactional email delivery for lead notifications, job assignments, and appointment reminders.',
  ['server/services/email.ts']
);

addSubheading('SMS Service');
addCodeBlock(
  'Twilio + SignalWire + Zapier Integration',
  'Multi-provider SMS with smart failover. Zapier endpoints bypass A2P verification requirements.',
  ['server/services/sms.ts', 'server/routes.ts (Zapier webhooks)']
);

addSubheading('Automation Service');
addCodeBlock(
  'Lead-to-Job Automation Pipeline',
  'Automated workflows for lead intake, customer contact, job creation, technician assignment, and completion.',
  ['server/services/automation.ts']
);
doc.addPage();

addHeading('3. DATABASE LAYER');
addSubheading('PostgreSQL (Neon-backed)');
addBody(`The database uses PostgreSQL with the following core tables:`);

addCodeBlock('users', 'User accounts with role-based access (admin, dispatcher, technician, salesperson)', ['shared/schema.ts']);
addCodeBlock('leads', 'Customer leads with source tracking, status, and contact info', ['shared/schema.ts']);
addCodeBlock('technicians', 'Employee records with hourly rates, skills, GPS location', ['shared/schema.ts']);
addCodeBlock('salespersons', 'Sales team with commission rates and Twilio routing', ['shared/schema.ts']);
addCodeBlock('jobs', 'Full job lifecycle with cost tracking and profit calculations', ['shared/schema.ts']);
addCodeBlock('quotes', 'Customer quotes with line items and public access links', ['shared/schema.ts']);
addCodeBlock('sales_commissions', 'Commission records with NET profit calculations', ['shared/schema.ts']);
addCodeBlock('pricebook_items', 'Service catalog with standardized pricing', ['shared/schema.ts']);
addCodeBlock('marketing_campaigns', 'Marketing campaign tracking and ROI', ['shared/schema.ts']);
addCodeBlock('webhook_logs', 'Audit trail for all external webhook integrations', ['shared/schema.ts']);
doc.addPage();

addHeading('4. INTEGRATION LAYER');
addSubheading('Lead Source Webhooks');
addBody(`External lead providers send data via HTTP webhooks:`);
addCodeBlock('eLocal Webhook', 'POST /api/webhooks/elocal - Regional lead aggregator', ['server/routes.ts']);
addCodeBlock('Networx Webhook', 'POST /api/webhooks/networx - Home service leads', ['server/routes.ts']);
addCodeBlock('Angi Webhook', 'POST /api/webhooks/angi - Angi lead integration', ['server/routes.ts']);
addCodeBlock('Thumbtack Webhook', 'POST /api/webhooks/thumbtack - Basic auth protected', ['server/routes.ts']);
addCodeBlock('Inquirly Webhook', 'POST /api/webhooks/inquirly - Form submissions', ['server/routes.ts']);
addCodeBlock('Zapier Webhook', 'POST /api/webhooks/zapier/lead - Zapier automation', ['server/routes.ts']);

addSubheading('Twilio Communication');
addCodeBlock('Voice Forwarding', 'POST /api/webhooks/twilio/voice - Forwards calls to (630) 251-5628', ['server/routes.ts']);
addCodeBlock('SMS Forwarding', 'POST /api/webhooks/twilio/sms - Forwards texts + email notification', ['server/routes.ts']);
addCodeBlock('Voicemail', 'POST /api/webhooks/twilio/voicemail - Records and emails voicemails', ['server/routes.ts']);

addSubheading('Zapier SMS Automation');
addCodeBlock('Forward SMS', 'POST /api/webhooks/zapier/forward-sms - Bypass A2P verification', ['server/routes.ts']);
addCodeBlock('Send SMS', 'POST /api/webhooks/zapier/send-sms - Template-based messaging', ['server/routes.ts']);
addCodeBlock('Auto-Reply', 'POST /api/webhooks/zapier/auto-reply - Smart keyword detection', ['server/routes.ts']);
doc.addPage();

addHeading('5. BUILD & DEPLOYMENT');
addSubheading('Development');
addCodeBlock(
  'Vite Dev Server + tsx',
  'Hot module replacement for frontend, TypeScript execution for backend with live reload.',
  ['package.json', 'server/vite.ts']
);

addSubheading('Production Build');
addCodeBlock(
  'Vite + esbuild',
  'Frontend bundled with Vite, backend bundled with esbuild for optimized cold starts.',
  ['scripts/build.ts']
);

addSubheading('Deployment');
addCodeBlock(
  'Replit Hosting',
  'Automated deployments with health checks, TLS, and custom domain support.',
  ['.replit', 'replit.nix']
);
doc.addPage();

// CODE ORGANIZATION
addTitle('Code Organization');
addSeparator();

addHeading('Directory Structure');
doc.font('Courier').fontSize(9).fillColor(colors.text);
doc.text(`
project-root/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # shadcn/ui component library
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── pages/            # Route components
│   │   │   ├── admin/        # Admin-only pages
│   │   │   ├── dispatcher/   # Dispatcher pages
│   │   │   ├── technician/   # Technician pages
│   │   │   └── salesperson/  # Salesperson pages
│   │   ├── App.tsx           # Main app with routing
│   │   └── main.tsx          # Entry point
│   └── index.html            # HTML template
├── server/                    # Backend Express application
│   ├── services/             # Business logic services
│   │   ├── automation.ts     # Lead-to-job automation
│   │   ├── email.ts          # Resend email service
│   │   └── sms.ts            # Twilio/SignalWire SMS
│   ├── auth.ts               # Passport authentication
│   ├── db.ts                 # Database connection
│   ├── routes.ts             # API route handlers
│   ├── storage.ts            # Data access layer
│   └── index.ts              # Server entry point
├── shared/                    # Shared between client/server
│   └── schema.ts             # Drizzle ORM schemas + Zod
├── public/                    # Static assets
└── migrations/               # Database migrations
`);
doc.font('Helvetica');
doc.addPage();

// CODE TYPES
addTitle('Code Classification');
addSeparator();

addHeading('By Function Type');

addSubheading('1. SCHEMA DEFINITIONS');
addBody('Define data structures shared between frontend and backend.');
addCodeBlock('Drizzle Tables', 'PostgreSQL table definitions with types, constraints, and relations', ['shared/schema.ts']);
addCodeBlock('Zod Schemas', 'Runtime validation schemas generated from Drizzle tables', ['shared/schema.ts']);
addCodeBlock('TypeScript Types', 'Inferred types for insert and select operations', ['shared/schema.ts']);

addSubheading('2. API HANDLERS');
addBody('Process HTTP requests and return responses.');
addCodeBlock('CRUD Endpoints', 'Standard create, read, update, delete for all entities', ['server/routes.ts']);
addCodeBlock('Webhook Handlers', 'External integrations from lead sources and Twilio', ['server/routes.ts']);
addCodeBlock('Authentication Routes', 'Login, logout, session management', ['server/auth.ts']);

addSubheading('3. BUSINESS LOGIC');
addBody('Core application functionality and automation.');
addCodeBlock('Automation Pipeline', 'Lead intake, auto-contact, job creation, tech assignment', ['server/services/automation.ts']);
addCodeBlock('Commission Calculator', 'NET profit calculation: Revenue - (Labor + Materials + Travel + Equipment + Other)', ['server/services/automation.ts']);
addCodeBlock('Email Templates', 'Lead notifications, job assignments, reminders', ['server/services/email.ts']);
addCodeBlock('SMS Templates', 'Acknowledgment, reminders, completion notices', ['server/services/sms.ts']);

addSubheading('4. DATA ACCESS');
addBody('Abstracts database operations behind interfaces.');
addCodeBlock('IStorage Interface', 'Defines all CRUD operations available to routes', ['server/storage.ts']);
addCodeBlock('DbStorage Class', 'PostgreSQL implementation using Drizzle ORM', ['server/storage.ts']);
doc.addPage();

addSubheading('5. UI COMPONENTS');
addBody('Reusable interface elements following shadcn/ui patterns.');
addCodeBlock('Primitives', 'Button, Input, Card, Badge, Dialog, etc.', ['client/src/components/ui/*']);
addCodeBlock('Composite', 'DataTable, Form with validation, Sidebar navigation', ['client/src/components/ui/*']);
addCodeBlock('Domain-specific', 'LeadCard, JobTimeline, QuoteBuilder, TechnicianMap', ['client/src/pages/*']);

addSubheading('6. PAGE COMPONENTS');
addBody('Full page layouts for each user role and function.');
addCodeBlock('Admin Pages', 'Dashboard, Leads, Jobs, Analytics, Pricebook, Marketing ROI', ['client/src/pages/admin/*']);
addCodeBlock('Dispatcher Pages', 'Dispatch Center, Technician Map, Staffing Pool', ['client/src/pages/dispatcher/*']);
addCodeBlock('Technician Pages', 'My Jobs, Quote Builder, Earnings', ['client/src/pages/technician/*']);
addCodeBlock('Salesperson Pages', 'Sales Dashboard, Commission Tracker, Quote Tool', ['client/src/pages/salesperson/*']);

addSubheading('7. HOOKS & UTILITIES');
addBody('Reusable logic extracted into hooks and helper functions.');
addCodeBlock('useAuth', 'Authentication state and user info', ['client/src/hooks/use-auth.tsx']);
addCodeBlock('useToast', 'Toast notification system', ['client/src/hooks/use-toast.ts']);
addCodeBlock('useMobile', 'Responsive design detection', ['client/src/hooks/use-mobile.tsx']);
addCodeBlock('apiRequest', 'Typed fetch wrapper for API calls', ['client/src/lib/queryClient.ts']);
doc.addPage();

// API REFERENCE
addTitle('API Endpoint Reference');
addSeparator();

const endpoints = [
  { category: 'Authentication', routes: [
    'POST /api/login - User login',
    'POST /api/logout - User logout',
    'GET /api/user - Current user info'
  ]},
  { category: 'Leads', routes: [
    'GET /api/leads - List all leads',
    'POST /api/leads - Create lead',
    'GET /api/leads/:id - Get lead',
    'PATCH /api/leads/:id - Update lead',
    'POST /api/leads/:id/contact - Log contact attempt'
  ]},
  { category: 'Jobs', routes: [
    'GET /api/jobs - List all jobs',
    'POST /api/jobs - Create job',
    'GET /api/jobs/:id - Get job',
    'PATCH /api/jobs/:id - Update job',
    'POST /api/jobs/:id/assign - Assign technician',
    'POST /api/jobs/:id/complete - Complete job'
  ]},
  { category: 'Quotes', routes: [
    'GET /api/quotes - List quotes',
    'POST /api/quotes - Create quote',
    'GET /api/quotes/:id - Get quote',
    'GET /api/quotes/public/:publicId - Public quote view'
  ]},
  { category: 'Technicians', routes: [
    'GET /api/technicians - List technicians',
    'GET /api/technicians/available - Available techs',
    'POST /api/technicians/:id/location - Update GPS'
  ]},
  { category: 'Webhooks', routes: [
    'POST /api/webhooks/elocal - eLocal leads',
    'POST /api/webhooks/networx - Networx leads',
    'POST /api/webhooks/angi - Angi leads',
    'POST /api/webhooks/thumbtack - Thumbtack leads',
    'POST /api/webhooks/zapier/lead - Zapier leads',
    'POST /api/webhooks/zapier/forward-sms - SMS forwarding',
    'POST /api/webhooks/twilio/voice - Call forwarding'
  ]}
];

for (const group of endpoints) {
  addSubheading(group.category);
  for (const route of group.routes) {
    doc.fontSize(9).fillColor(colors.text).text('  ' + route);
  }
  doc.moveDown(0.3);
}
doc.addPage();

// FOOTER
addTitle('Document Information');
addSeparator();
addBody(`
Generated: ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Application: Chicago Sewer Experts CRM
Version: 1.0

For technical support or questions, refer to:
- OPERATIONS_MENU.md - Complete operations guide
- replit.md - Development documentation
- design_guidelines.md - UI/UX standards
`);

doc.end();

console.log(`PDF generated: ${outputPath}`);
