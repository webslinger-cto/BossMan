import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({ 
  size: 'LETTER',
  margins: { top: 72, bottom: 72, left: 72, right: 72 }
});

const outputPath = path.join(process.cwd(), 'public', '3-app-integration-guide.pdf');
const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

const primaryColor = '#1e40af';
const secondaryColor = '#3b82f6';
const textColor = '#1f2937';

doc.fontSize(28)
   .fillColor(primaryColor)
   .text('Emergency Chicago Sewer Experts', { align: 'center' })
   .fontSize(18)
   .fillColor(secondaryColor)
   .text('3-App Integration System Guide', { align: 'center' })
   .moveDown(0.5);

doc.fontSize(10)
   .fillColor(textColor)
   .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
   .moveDown(2);

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Overview')
   .moveDown(0.5);

doc.fontSize(11)
   .fillColor(textColor)
   .text('The Emergency Chicago Sewer Experts ecosystem consists of three interconnected applications that work together to manage leads, generate SEO content, and publish it to the public-facing website. This document explains how data flows between these applications.', { align: 'justify' })
   .moveDown(1.5);

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('The Three Applications')
   .moveDown(0.5);

doc.fontSize(13)
   .fillColor(secondaryColor)
   .text('1. Emergency Chicago Sewer Experts CRM')
   .moveDown(0.3);

doc.fontSize(11)
   .fillColor(textColor)
   .text('The central hub for all business operations. This application manages:', { continued: false })
   .moveDown(0.3);

const crmFeatures = [
  'Lead tracking and management from multiple sources',
  'Quote generation and customer approval workflow',
  'Job scheduling and dispatch operations',
  'Technician and salesperson management',
  'Commission tracking and payroll',
  'Customer outreach and campaign management',
  'Call logging with phone system integration'
];

crmFeatures.forEach(feature => {
  doc.fontSize(10)
     .fillColor(textColor)
     .text(`  • ${feature}`);
});

doc.moveDown(1);

doc.fontSize(13)
   .fillColor(secondaryColor)
   .text('2. Replit Builder 1 (SEO Content Generator)')
   .moveDown(0.3);

doc.fontSize(11)
   .fillColor(textColor)
   .text('URL: webslingeraiglassseo.com', { continued: false })
   .moveDown(0.3)
   .text('This application receives job data from the CRM and automatically generates SEO-optimized content based on completed jobs. Features include:', { continued: false })
   .moveDown(0.3);

const builder1Features = [
  'Receives job webhooks from CRM',
  'AI-powered SEO content generation',
  'Blog post and article creation',
  'Content queue management',
  'Pushes approved content to frontend website'
];

builder1Features.forEach(feature => {
  doc.fontSize(10)
     .fillColor(textColor)
     .text(`  • ${feature}`);
});

doc.moveDown(1);

doc.fontSize(13)
   .fillColor(secondaryColor)
   .text('3. EmergencyChicagoSewerExperts.replit.app')
   .moveDown(0.3);

doc.fontSize(11)
   .fillColor(textColor)
   .text('The public-facing website that customers see. This site:', { continued: false })
   .moveDown(0.3);

const frontendFeatures = [
  'Displays company services and information',
  'Publishes approved SEO content from Builder 1',
  'Provides contact forms for lead generation',
  'Shows service areas and testimonials'
];

frontendFeatures.forEach(feature => {
  doc.fontSize(10)
     .fillColor(textColor)
     .text(`  • ${feature}`);
});

doc.addPage();

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Data Flow Diagram')
   .moveDown(0.5);

doc.fontSize(11)
   .fillColor(textColor)
   .text('The following illustrates how data moves between the three applications:')
   .moveDown(1);

const boxWidth = 140;
const boxHeight = 60;
const startY = doc.y;

doc.rect(72, startY, boxWidth, boxHeight)
   .fillAndStroke('#e0f2fe', primaryColor);
doc.fontSize(9)
   .fillColor(primaryColor)
   .text('Emergency Chicago', 77, startY + 15, { width: boxWidth - 10, align: 'center' })
   .text('Sewer Experts CRM', 77, startY + 28, { width: boxWidth - 10, align: 'center' });

doc.rect(252, startY, boxWidth, boxHeight)
   .fillAndStroke('#fef3c7', '#d97706');
doc.fontSize(9)
   .fillColor('#d97706')
   .text('Replit Builder 1', 257, startY + 15, { width: boxWidth - 10, align: 'center' })
   .text('(SEO Generator)', 257, startY + 28, { width: boxWidth - 10, align: 'center' });

doc.rect(432, startY, boxWidth, boxHeight)
   .fillAndStroke('#d1fae5', '#059669');
doc.fontSize(9)
   .fillColor('#059669')
   .text('Public Website', 437, startY + 15, { width: boxWidth - 10, align: 'center' })
   .text('(Customer Facing)', 437, startY + 28, { width: boxWidth - 10, align: 'center' });

doc.strokeColor(primaryColor)
   .moveTo(212, startY + 25)
   .lineTo(252, startY + 25)
   .stroke();
doc.fontSize(7)
   .fillColor(textColor)
   .text('Job Data', 215, startY + 10);

doc.strokeColor('#d97706')
   .moveTo(392, startY + 25)
   .lineTo(432, startY + 25)
   .stroke();
doc.fontSize(7)
   .fillColor(textColor)
   .text('SEO Content', 393, startY + 10);

doc.strokeColor('#059669')
   .moveTo(252, startY + 45)
   .lineTo(212, startY + 45)
   .stroke();
doc.fontSize(7)
   .fillColor(textColor)
   .text('Content Status', 215, startY + 50);

doc.y = startY + boxHeight + 40;
doc.moveDown(2);

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Integration Technical Details')
   .moveDown(0.5);

doc.fontSize(13)
   .fillColor(secondaryColor)
   .text('CRM → Builder 1 (Outbound Webhooks)')
   .moveDown(0.3);

doc.fontSize(11)
   .fillColor(textColor)
   .text('Endpoint: https://replit-builder-1--jcotham.replit.app/api/v1/inbound/job')
   .moveDown(0.2)
   .text('Authentication: API key in X-API-KEY header')
   .moveDown(0.2)
   .text('Secret: BUILDER1_API_KEY (stored in CRM secrets)')
   .moveDown(0.5);

doc.fontSize(11)
   .fillColor(textColor)
   .text('Events Pushed to Builder 1:', { underline: true })
   .moveDown(0.3);

doc.fontSize(10)
   .text('  • job_created - Triggered when a new job is created from an accepted quote')
   .text('  • job_completed - Triggered when a technician marks a job complete')
   .moveDown(0.5);

doc.fontSize(11)
   .text('Payload includes: Customer name, address, city, service type, job details, technician info, completion notes, and before/after photos.')
   .moveDown(1);

doc.fontSize(13)
   .fillColor(secondaryColor)
   .text('Builder 1 → CRM (Inbound Webhooks)')
   .moveDown(0.3);

doc.fontSize(11)
   .fillColor(textColor)
   .text('Endpoint: /api/webhooks/seo/content')
   .moveDown(0.2)
   .text('Authentication: HTTP Basic Auth')
   .moveDown(0.2)
   .text('Credentials: THUMBTACK_WEBHOOK_USER and THUMBTACK_WEBHOOK_PASS')
   .moveDown(0.5);

doc.fontSize(11)
   .text('Content received includes: Article title, body content, meta description, keywords, related job ID, and publication status.')
   .moveDown(1);

doc.addPage();

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Workflow: From Job to Published Content')
   .moveDown(0.5);

const steps = [
  { title: 'Step 1: Quote Created', desc: 'Dispatcher or salesperson creates a quote in the CRM with customer information and service line items from the pricebook.' },
  { title: 'Step 2: Customer Accepts Quote', desc: 'Customer receives quote via email/SMS, views it through a public link, and accepts it. A job is automatically created.' },
  { title: 'Step 3: Job Webhook Sent', desc: 'CRM sends job_created webhook to Builder 1 with all job details.' },
  { title: 'Step 4: Technician Completes Job', desc: 'Field technician arrives, performs work, uploads photos, and marks job complete in the CRM.' },
  { title: 'Step 5: Completion Webhook Sent', desc: 'CRM sends job_completed webhook to Builder 1 with completion details and photos.' },
  { title: 'Step 6: SEO Content Generated', desc: 'Builder 1 uses AI to generate SEO-optimized content based on the completed job (blog posts, service pages, testimonials).' },
  { title: 'Step 7: Content Review', desc: 'Generated content is sent back to CRM for admin review. Admin can approve, edit, or reject.' },
  { title: 'Step 8: Publication', desc: 'Approved content is pushed to the public website (EmergencyChicagoSewerExperts.replit.app) for publication.' }
];

steps.forEach((step, index) => {
  doc.fontSize(12)
     .fillColor(secondaryColor)
     .text(step.title)
     .moveDown(0.2);
  doc.fontSize(10)
     .fillColor(textColor)
     .text(step.desc, { align: 'justify' })
     .moveDown(0.7);
});

doc.moveDown(1);

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Security Considerations')
   .moveDown(0.5);

const securityPoints = [
  'All webhook communications use HTTPS encryption',
  'API keys are stored securely as environment secrets',
  'Basic authentication protects inbound webhook endpoints',
  'Content must be approved by admin before publication',
  'All API calls are logged for audit purposes'
];

securityPoints.forEach(point => {
  doc.fontSize(10)
     .fillColor(textColor)
     .text(`  ✓ ${point}`)
     .moveDown(0.3);
});

doc.addPage();

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Required Secrets Configuration')
   .moveDown(0.5);

doc.fontSize(11)
   .fillColor(textColor)
   .text('The following secrets must be configured in the CRM for the integration to work:')
   .moveDown(0.5);

const secrets = [
  { name: 'BUILDER1_API_KEY', desc: 'API key for authenticating outbound requests to Builder 1' },
  { name: 'THUMBTACK_WEBHOOK_USER', desc: 'Username for Basic Auth on inbound SEO content webhook' },
  { name: 'THUMBTACK_WEBHOOK_PASS', desc: 'Password for Basic Auth on inbound SEO content webhook' }
];

secrets.forEach(secret => {
  doc.fontSize(11)
     .fillColor(secondaryColor)
     .text(secret.name)
     .moveDown(0.1);
  doc.fontSize(10)
     .fillColor(textColor)
     .text(secret.desc)
     .moveDown(0.5);
});

doc.moveDown(1);

doc.fontSize(16)
   .fillColor(primaryColor)
   .text('Troubleshooting')
   .moveDown(0.5);

const troubleshooting = [
  { issue: 'Job webhooks not reaching Builder 1', solution: 'Check BUILDER1_API_KEY is correctly configured. Verify Builder 1 is running and accessible.' },
  { issue: 'SEO content not appearing in CRM', solution: 'Verify THUMBTACK_WEBHOOK_USER and THUMBTACK_WEBHOOK_PASS match on both ends. Check CRM webhook logs.' },
  { issue: 'Content not publishing to website', solution: 'Ensure content is approved in CRM. Check Builder 1 has correct website API credentials.' }
];

troubleshooting.forEach(item => {
  doc.fontSize(11)
     .fillColor(secondaryColor)
     .text(`Issue: ${item.issue}`)
     .moveDown(0.1);
  doc.fontSize(10)
     .fillColor(textColor)
     .text(`Solution: ${item.solution}`)
     .moveDown(0.5);
});

doc.moveDown(2);

doc.fontSize(10)
   .fillColor('#6b7280')
   .text('Emergency Chicago Sewer Experts', { align: 'center' })
   .text('3-App Integration System Documentation', { align: 'center' })
   .text('Confidential - Internal Use Only', { align: 'center' });

doc.end();

writeStream.on('finish', () => {
  console.log(`PDF generated successfully at: ${outputPath}`);
});

writeStream.on('error', (err) => {
  console.error('Error generating PDF:', err);
});
