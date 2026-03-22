# BossMan Sales Automation

Automated lead generation and outreach system for contractor sales. Designed to integrate with LinkedIn Sales Navigator and Apollo for systematic prospect management.

## Features

### 🎯 Lead Management
- Prospect tracking with automatic follow-up scheduling
- Source attribution (LinkedIn, Apollo, referrals, website)
- Status pipeline (New → Contacted → Responded → Demo → Trial → Converted)
- Overdue follow-up alerts

### 📱 Content Automation
- Fresh LinkedIn post generation (Monday/Wednesday/Friday schedule)
- Apollo email template rotation
- Response template library for common objections
- One-click copy-to-clipboard functionality

### 📊 Analytics
- Conversion tracking through entire funnel
- Performance metrics dashboard
- Prospect source analysis
- Follow-up success rates

### 🔌 API-Ready Architecture
- RESTful API for prospect management
- Webhook endpoints for external integrations
- JSON-based data exchange
- Ready for SealDeal integration

## Quick Start

### Standalone Version (No Server Required)
1. Open `sales-dashboard-standalone.html` in your browser
2. Start adding prospects and copying content templates
3. Data saves locally in browser storage

### Full Server Version
```bash
npm install
node app.js
```
Access dashboard at `http://localhost:3000`

## API Endpoints

### Prospects
- `GET /api/prospects` - List all prospects
- `POST /api/prospects` - Add new prospect
- `PUT /api/prospects/:id/status` - Update prospect status
- `GET /api/overdue` - Get overdue follow-ups

### Analytics
- `GET /api/stats` - Overall performance metrics
- `POST /api/log-outreach` - Log outreach activity

### Content
- `GET /api/content/this-week` - Get fresh content templates

## SealDeal Integration (Planned)

### Data Flow
```
Sales Dashboard → generates qualified leads → API → SealDeal → manages deals to close
```

### Integration Points
- **Lead Handoff**: When prospect reaches "Demo Scheduled" status
- **Status Sync**: Two-way status updates between systems
- **Analytics**: Combined funnel visibility from lead → close

### API Contract (Draft)
```javascript
// Send qualified lead to SealDeal
POST /api/sealdeal/leads
{
  "prospect_id": 123,
  "name": "John Smith",
  "company": "Smith Plumbing",
  "email": "john@smithplumbing.com",
  "phone": "+1234567890",
  "source": "linkedin",
  "qualification_notes": "Interested in MCTB, has 5 crew members",
  "demo_scheduled": "2026-03-25T14:00:00Z"
}

// Receive deal updates from SealDeal
POST /api/deals/status-update
{
  "prospect_id": 123,
  "deal_status": "proposal_sent",
  "value": 99.00,
  "close_probability": 0.75
}
```

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (portable, zero-config)
- **Frontend**: Vanilla JS (no framework dependencies)
- **Styling**: Tailwind-inspired utility CSS
- **Authentication**: API key based (for integrations)

## Deployment

### Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t bossman-sales .
docker run -p 3000:3000 bossman-sales
```

## Contributing

1. Keep API endpoints RESTful and consistent
2. All prospect data should flow through the database layer
3. Content templates should be easily customizable
4. Maintain compatibility with SealDeal integration points

## License

Private - WebSlingerAI Internal Tool