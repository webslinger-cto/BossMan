# Google Sheets Integration Setup

## Overview
This creates a **direct Google Sheets integration** using Google Apps Script as a bridge. No OAuth complexity - just a simple webhook that connects your sales dashboard to live Google Sheets.

## Step 1: Create Google Apps Script Web App

### A. Go to Google Apps Script
1. Visit **script.google.com**
2. Click **New Project**
3. Name it: "BossMan Sales Integration"

### B. Add the Integration Code
1. Delete the default `myFunction()` code
2. Copy the entire contents of `google-sheets-apps-script.js`
3. Paste into the script editor
4. **Save** (Ctrl+S)

### C. Deploy as Web App
1. Click **Deploy** → **New Deployment**
2. **Type**: Web app
3. **Description**: "BossMan Sales Webhook"
4. **Execute as**: Me
5. **Who has access**: Anyone
6. Click **Deploy**
7. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/.../exec`)

## Step 2: Create Your Spreadsheet

### A. Create New Spreadsheet
1. Go to **sheets.google.com**
2. Create **Blank spreadsheet**
3. Name it: "BossMan Sales Dashboard"

### B. Auto-Setup the Sheets
1. In your Apps Script, click **Run** → `setupSheets()`
2. **Grant permissions** when prompted
3. This creates properly formatted "Sales Tracking" and "Content Calendar" tabs

## Step 3: Connect to Your Sales Dashboard

### A. Update Your Node.js App
Add this to your `app.js`:

```javascript
const GoogleSheetsClient = require('./google-sheets-client');

// Replace with your actual Web App URL from Step 1C
const sheets = new GoogleSheetsClient('YOUR_WEB_APP_URL_HERE');

// Modified addProspect endpoint
app.post('/api/prospects', async (req, res) => {
  const { name, company, email, phone, linkedin, source, notes } = req.body;
  const nextFollowUp = new Date();
  nextFollowUp.setDate(nextFollowUp.getDate() + 3);
  
  // Add to local database
  db.run(
    'INSERT INTO prospects (name, company, email, phone, linkedin, source, notes, next_follow_up) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, company, email, phone, linkedin, source, notes, nextFollowUp.toISOString().split('T')[0]],
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Also add to Google Sheets
      try {
        await sheets.addProspect({
          name, company, email, phone, linkedin, source, notes
        });
      } catch (sheetsError) {
        console.log('Sheets sync failed (continuing):', sheetsError);
      }
      
      res.json({ id: this.lastID });
    }
  );
});

// Sync weekly content to sheets
app.get('/api/sync-content', async (req, res) => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
  
  try {
    const content = await fetch('/api/content/this-week');
    const weeklyContent = await content.json();
    
    await sheets.addWeeklyContent(weekStart.toISOString().split('T')[0], weeklyContent);
    res.json({ success: true, message: 'Content synced to sheets' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### B. Test the Integration
1. Add a test prospect through your dashboard
2. Check your Google Sheet - it should auto-populate
3. Visit `/api/sync-content` to push this week's content templates

## Step 4: Real-Time Dashboard Features

### A. Two-Way Sync (Optional)
Your Google Sheets can now:
- **Receive data** from your dashboard automatically
- **Send overdue alerts** back to your system
- **Track performance** with live formulas

### B. Automation Formulas in Sheets
Add these in your Google Sheet:

**Column Q (Days Since Follow-up):**
```
=IF(M2="","",TODAY()-M2)
```

**Column R (Status Alert):**
```
=IF(Q2>7,"🚨 OVERDUE",IF(Q2>3,"⚠️ DUE SOON","✅ ON TRACK"))
```

**Column S (Conversion Score):**
```
=IF(P2="Yes",100,IF(O2="Yes",75,IF(N2="Yes",50,IF(L2<>"",25,0))))
```

## Step 5: Advanced Features

### A. Automated Reporting
Set up Google Sheets to email you daily/weekly reports:
1. **Extensions** → **Apps Script**  
2. Add trigger for daily email digest
3. **Triggers** → **Add Trigger** → Time-driven

### B. Share with Team
1. **Share** your spreadsheet with team members
2. Set **Editor** permissions for full access
3. Use **Comments** for collaboration on specific prospects

### C. Mobile Access
- Install **Google Sheets mobile app**
- Enable **offline access**
- Update prospect status on-the-go

## Security Notes

- **Web App URL is public** but doesn't expose sensitive data
- **Spreadsheet access** controlled by Google account permissions  
- **Apps Script runs as you** so it has your Google account access
- Consider using a **service account** for production deployments

## Troubleshooting

**"Script not authorized"**:
- Re-run `setupSheets()` function
- Grant all requested permissions

**Web App not receiving data**:
- Check the Web App URL is correct
- Redeploy if you made changes to the Apps Script

**Sheets not updating**:
- Check execution transcript in Apps Script
- Verify sheet names match exactly ("Sales Tracking", "Content Calendar")

This gives you a **live, collaborative Google Sheets dashboard** that syncs automatically with your sales system. No CSV imports, no manual updates - everything flows seamlessly! 📊