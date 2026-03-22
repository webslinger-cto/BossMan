# Email Automation Setup - Fresh Content Delivered Weekly

## Overview
Get **fresh LinkedIn posts and Apollo templates emailed to you automatically** every Monday morning. No manual content generation - just copy, paste, and execute your sales strategy.

## Step 1: Set Up Google Apps Script Email Bot

### A. Open Your Existing Google Apps Script Project
1. Go to **script.google.com**
2. Open your **"BossMan Sales Integration"** project (from the Sheets setup)
3. Or create a new project if you haven't done the Sheets integration yet

### B. Add Email Automation Code
1. Click **+** to add a new script file
2. Name it: **"EmailAutomation"**
3. Copy the entire contents of `google-email-automation.js`
4. Paste into the new script file
5. **IMPORTANT**: Update line 4 with your email address:
   ```javascript
   const recipient = 'rashad@webslingerai.com'; // Replace with your actual email
   ```

### C. Set Up Automated Triggers
1. In the script editor, select the function: **`createAutomatedTriggers`**
2. Click **Run** (▶️)
3. **Grant permissions** when prompted
4. This sets up:
   - **Weekly content email**: Every Monday at 8 AM
   - **Daily check-in**: Every weekday at 9 AM

## Step 2: Test the Email System

### A. Send Test Email
1. In the script editor, select: **`sendWeeklyContentEmail`**  
2. Click **Run** (▶️)
3. **Check your email** - you should receive a formatted email with:
   - 3 LinkedIn posts (Monday/Wednesday/Friday)
   - 2 Apollo email templates
   - Weekly action items

### B. Verify Email Format
The email will include:
- **📱 LinkedIn Posts** - Ready to copy-paste with formatting
- **📧 Apollo Templates** - Complete with subject lines  
- **📊 Weekly Goals** - Checkbox format for tracking
- **🎯 Focus Areas** - Prioritized action items

## Step 3: Customize Your Content

### A. Add Your Own Templates
Edit the arrays in `google-email-automation.js`:

```javascript
// Add new Monday pain point posts
const mondayPosts = [
  "Your existing templates...",
  "NEW: Add your best performing posts here",
  "NEW: Industry-specific variations"
];

// Add new Apollo email templates  
const emailBodies1 = [
  "Your proven templates...",
  "NEW: Seasonal variations",
  "NEW: Industry-specific hooks"
];
```

### B. Customize Email Schedule
Modify the triggers in `createAutomatedTriggers()`:

```javascript
// Change to Tuesday at 7 AM instead
.onWeekDay(ScriptApp.WeekDay.TUESDAY)
.atHour(7)

// Or make it bi-weekly
.everyWeeks(2)
```

## Step 4: Your Weekly Workflow

### Monday Morning (8 AM)
1. **📧 Check email** - Fresh content delivered automatically
2. **📱 Copy Monday post** - Paste to LinkedIn  
3. **📊 Queue Apollo emails** - Load templates into sequences
4. **✅ Set weekly goals** - Use the checklist in email

### Throughout the Week
1. **Wednesday**: Copy Wednesday post from email
2. **Friday**: Copy Friday post from email
3. **Daily check-ins**: 9 AM email with action items
4. **Track progress**: Update goals in your dashboard

## Step 5: Advanced Automation

### A. Add Performance Tracking
```javascript
// Add this to track which templates perform best
function logContentPerformance(postType, engagement) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Content Performance');
  sheet.appendRow([new Date(), postType, engagement]);
}
```

### B. Seasonal Content Rotation
```javascript
// Add holiday/seasonal variations
const currentMonth = new Date().getMonth();
if (currentMonth === 11) { // December
  mondayPosts.push("Holiday emergency calls are the worst. Here's why...");
}
```

### C. A/B Test Email Templates
```javascript
// Automatically rotate between template variations
const templateVersion = Math.random() > 0.5 ? 'A' : 'B';
emailSubject = templateVersion === 'A' ? subjects_A : subjects_B;
```

## Step 6: Mobile Optimization

### A. Gmail Mobile App
- **Starred emails**: Star your weekly content emails for quick access
- **Labels**: Create "Sales Content" label for easy filtering
- **Copy on mobile**: Long-press text to copy directly to LinkedIn app

### B. iPhone Shortcuts (Optional)
Create Siri shortcut to:
1. Open Gmail → Find latest content email
2. Copy LinkedIn post text
3. Open LinkedIn → Paste and post

## Email Templates You'll Receive

### Weekly Content Email Format:
```
Subject: 🔨 Weekly Sales Content - Week of March 22

📱 LinkedIn Posts (Ready to Copy-Paste)
┌─ Monday - Pain Point Post ─┐
│ [Fully formatted post]     │
│ [Copy button]              │
└────────────────────────────┘

┌─ Wednesday - Industry Stats ─┐
│ [Fully formatted post]      │ 
│ [Copy button]               │
└─────────────────────────────┘

┌─ Friday - Success Story ─┐
│ [Fully formatted post]   │
│ [Copy button]            │
└──────────────────────────┘

📧 Apollo Email Templates
┌─ Template A - Problem Recognition ─┐
│ Subject: Quick question about...   │
│ Body: [Full email template]        │
└────────────────────────────────────┘

📊 This Week's Focus
☐ LinkedIn connections: Target 15 new prospects
☐ Apollo sequences: Launch 2 new campaigns  
☐ Follow-ups: Clear overdue list
☐ Content engagement: Monitor post performance
```

### Daily Check-in Email Format:
```
Subject: 🎯 Daily Sales Check-In

Today's Action Items:
☐ Send 5 LinkedIn connection requests
☐ Follow up with 3 recent connections  
☐ Check for prospect replies
☐ Update deal statuses in dashboard
☐ Post today's content (if scheduled)

Quick wins today: Focus on one overdue follow-up 
and one new connection request.
```

## Troubleshooting

**Emails not sending:**
- Check Apps Script execution log for errors
- Verify triggers are properly set up
- Ensure email permissions are granted

**Content not refreshing:**
- Templates randomize each run automatically
- Add new variations to the arrays for more diversity

**Mobile formatting issues:**
- Gmail handles HTML email formatting
- Copy text (not HTML) for best mobile experience

This gives you a **completely automated content generation system** that delivers fresh, professional sales content to your inbox every week. No more writer's block, no more scrambling for LinkedIn posts! 📧🎯