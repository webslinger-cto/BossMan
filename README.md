# BossMan Sales Automation

Complete LinkedIn + Apollo sales automation system with automated email content delivery.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Email (Required)
Get Gmail app password:
1. Go to: https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Generate App Password for "Mail"
4. Set environment variable:
```bash
export EMAIL_PASSWORD="your-16-character-app-password"
```

### 3. Test Email Delivery
```bash
npm run send-email
```
This sends you a test email with weekly sales content.

### 4. Set Up Automation
```bash
npm run setup-cron
```
This configures:
- **Weekly emails**: Every Monday at 8 AM EST
- **Daily check-ins**: Every weekday at 9 AM EST

### 5. Use Sales Dashboard
```bash
npm run dev
```
Access dashboard at: http://localhost:3000

Or use standalone version: `open sales-dashboard-standalone.html`

## 📧 Email Automation Features

### Weekly Content Email
**Every Monday at 8 AM EST**, you receive:
- 3 LinkedIn posts (Monday/Wednesday/Friday)
- 2 Apollo email templates
- Weekly goals and action plan
- Performance tracking reminders

### Fresh Content Every Week
- **LinkedIn posts**: 9+ variations that rotate randomly
- **Apollo emails**: Different hooks, stats, and social proof
- **Always fresh**: Never send the same content twice

## 📱 Sales Dashboard Features

### Prospect Tracking
- Add prospects from LinkedIn/Apollo
- Track status (New → Contacted → Demo → Trial → Converted)
- Overdue follow-up alerts
- Performance analytics

### Content Templates
- Ready-to-copy LinkedIn posts
- Apollo email sequences
- Response templates for objections
- All optimized for contractor outreach

## 🔌 Integration Ready

### Google Sheets (Optional)
Follow `GOOGLE-SHEETS-SETUP.md` for live spreadsheet sync.

### SealDeal Integration (Planned)
API-ready architecture for connecting to SealDeal when prospects reach demo stage.

## 🎯 Daily Workflow

### Monday Morning (8 AM)
1. **Check email** → Fresh content delivered automatically
2. **Copy Monday LinkedIn post** → Paste and publish
3. **Queue Apollo emails** → Load templates into sequences
4. **Set weekly goals** → Use dashboard for tracking

### Throughout Week
- **Wednesday/Friday**: Copy posts from Monday's email
- **Daily**: Track new prospects in dashboard
- **No content creation stress** → Everything pre-written!

## 📊 Performance Tracking

Track these metrics weekly:
- **LinkedIn**: Connection acceptance rate, post engagement
- **Apollo**: Email open rates, reply rates
- **Conversions**: Demo requests, trial signups
- **Pipeline**: Prospects added, status progression

## 🔧 Advanced Setup

### Production Deployment
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start setup-automation.js --name "bossman-automation"
pm2 startup
pm2 save
```

### Custom Email Recipients
```bash
# Send to different email
node email-sender.js team@webslingerai.com
```

### Multiple LinkedIn Accounts
Edit templates in `email-sender.js` to customize for different accounts/industries.

## 🛠️ Troubleshooting

### Email Not Sending
1. Check Gmail app password is correct
2. Verify 2FA is enabled on Gmail
3. Test with: `npm run send-email`

### Dashboard Not Loading
1. Rebuild dependencies: `rm -rf node_modules && npm install`
2. Use standalone version: `open sales-dashboard-standalone.html`

### Automation Not Running
1. Check process is alive: `ps aux | grep node`
2. Restart: `npm run setup-cron`
3. Use PM2 for production reliability

## 🎯 Results to Expect

After 30 days of consistent use:
- **LinkedIn**: 60+ new connections, 30% acceptance rate
- **Apollo**: 200+ emails sent, 15%+ reply rate
- **Pipeline**: 50+ prospects tracked, 10+ demos scheduled
- **Content**: Zero time spent on content creation

## 📞 Support

Issues? Check:
1. `GOOGLE-SHEETS-SETUP.md` for spreadsheet integration
2. `EMAIL-AUTOMATION-SETUP.md` for detailed email setup
3. GitHub issues on the sales-automation branch

---

**Built by Jarvis for WebSlingerAI contractor outreach automation** 🔨