// Google Apps Script Email Automation
// Add this to your Google Apps Script project for automated email delivery

function sendWeeklyContentEmail() {
  const recipient = 'your-email@domain.com'; // Replace with your email
  
  // Generate fresh content
  const content = generateWeeklyContent();
  
  // Create email body
  const emailBody = `
<h2>🔨 BossMan Weekly Sales Content - Week of ${content.weekStart}</h2>

<h3>📱 LinkedIn Posts (Ready to Copy-Paste)</h3>

<div style="background: #f0f8ff; padding: 15px; margin: 10px 0; border-left: 4px solid #0066cc;">
<h4>Monday - Pain Point Post</h4>
<p style="font-family: monospace; background: white; padding: 10px;">${content.monday}</p>
<button onclick="copyToClipboard('monday-text')">📋 Copy</button>
</div>

<div style="background: #f0f8ff; padding: 15px; margin: 10px 0; border-left: 4px solid #0066cc;">
<h4>Wednesday - Industry Stats</h4>
<p style="font-family: monospace; background: white; padding: 10px;">${content.wednesday}</p>
<button onclick="copyToClipboard('wed-text')">📋 Copy</button>
</div>

<div style="background: #f0f8ff; padding: 15px; margin: 10px 0; border-left: 4px solid #0066cc;">
<h4>Friday - Success Story</h4>
<p style="font-family: monospace; background: white; padding: 10px;">${content.friday}</p>
<button onclick="copyToClipboard('fri-text')">📋 Copy</button>
</div>

<h3>📧 Apollo Email Templates</h3>

<div style="background: #fff8f0; padding: 15px; margin: 10px 0; border-left: 4px solid #ff6600;">
<h4>Email Template A - Problem Recognition</h4>
<p><strong>Subject:</strong> ${content.emailSubject1}</p>
<p style="font-family: monospace; background: white; padding: 10px; white-space: pre-wrap;">${content.emailBody1}</p>
</div>

<div style="background: #fff8f0; padding: 15px; margin: 10px 0; border-left: 4px solid #ff6600;">
<h4>Email Template B - Social Proof</h4>
<p><strong>Subject:</strong> ${content.emailSubject2}</p>
<p style="font-family: monospace; background: white; padding: 10px; white-space: pre-wrap;">${content.emailBody2}</p>
</div>

<h3>📊 This Week's Focus</h3>
<ul>
<li>LinkedIn connections: Target 15 new prospects</li>
<li>Apollo sequences: Launch 2 new campaigns</li>
<li>Follow-ups: Clear overdue list</li>
<li>Content engagement: Monitor post performance</li>
</ul>

<p><em>Generated automatically by BossMan Sales System - ${new Date().toLocaleDateString()}</em></p>
`;

  // Send email
  MailApp.sendEmail({
    to: recipient,
    subject: `🔨 Weekly Sales Content - ${content.weekStart}`,
    htmlBody: emailBody
  });
  
  console.log('Weekly content email sent successfully');
}

function generateWeeklyContent() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week
  
  // Monday pain point posts
  const mondayPosts = [
    "Called 5 contractors this weekend about a kitchen emergency. 3 went to voicemail. 2 answered but were 'booked for weeks.' 0 had any follow-up system. Guess who got my $2,400 job? The ONE contractor with auto-text-back set up. If you're missing calls, you're missing money. Simple as that. #Contractors #CustomerService #SmallBusiness",
    
    "Weekend emergency: burst pipe, 9pm Saturday. Called 7 plumbers. 6 went straight to voicemail. 1 answered, said 'call back Monday.' Result? I fixed it myself and learned plumbing on YouTube. How much revenue are you losing to DIY tutorials? #EmergencyService #Plumbing #MissedOpportunities",
    
    "Reality check: Your phone rings at 7pm. You're covered in mud, hands full of tools. Customer hangs up. They call the next contractor on Google. That's $350 walking out the door. Every. Single. Time. Auto-text-back fixes this. #ContractorLife #TechSolutions"
  ];
  
  // Wednesday stats posts  
  const wednesdayPosts = [
    "Reality check for home service businesses: 📞 62% of calls to contractors go unanswered 📱 85% of customers won't call back if you miss them 💰 Average missed call = $350 lost revenue 📊 That's $3,500/week walking out the door. The solution? Auto-text-back in under 5 seconds. Technology isn't replacing contractors. It's helping the smart ones capture every opportunity. #ContractorLife #MissedCalls #SmallBizTech",
    
    "Why smart contractors are winning: They know that missed calls = missed money. Industry data: 12 missed calls per week × $350 average job = $4,200 in lost revenue. Solution: Auto-text-back in 5 seconds. Cost: $1.60 per day. ROI: Massive. #ContractorWins #Technology #SmallBusiness",
    
    "The $14,000 problem contractors don't track: Missed calls. Most contractors lose 40+ calls per month. At $350 average, that's $14K in revenue walking away because nobody picked up the phone. Auto-text-back recovers 70% of these lost opportunities. #MissedRevenue #Automation"
  ];
  
  // Friday success posts
  const fridayPosts = [
    "Week wrap-up win: Had a contractor tell me yesterday: 'First week with your system, I got 6 text responses from missed calls. 4 turned into jobs. That's $2,400 I would have lost.' The setup took 3 minutes. The cost is $49/month. The ROI paid for itself in one day. Sometimes the best business decisions are the simplest ones. #ContractorWins #SmallBusiness #Technology #FridayWin",
    
    "Quick Friday success story: HVAC contractor in Phoenix went from 15 missed calls per week to 3. The difference? Auto-text-back system that responds in 5 seconds. Revenue recovered: $4,200 monthly. Investment: $49 monthly. Sometimes technology just makes sense. #HVACSuccess #Automation #FridayThoughts",
    
    "Sometimes the best business decisions are the simplest ones. Had a client say: 'Your missed-call tool paid for itself in 4 hours. Now I wonder how much money I lost before this.' Smart contractors adapt. Stubborn ones keep missing calls. #FridayThoughts #BusinessGrowth"
  ];
  
  // Email templates
  const emailSubjects1 = [
    "Quick question about missed calls",
    "{{first_name}} - Emergency call question",
    "Lost revenue question"
  ];
  
  const emailBodies1 = [
    `Hi {{first_name}},

I was calling local contractors this weekend about a kitchen emergency.

Out of 5 businesses I called:
- 3 went to voicemail
- 2 answered but were "booked for weeks"
- 0 had any system to follow up

Guess who got my $2,400 job? The ONE guy with an auto-text system.

Built something similar for contractors like {{company}}. Takes 2 minutes to set up, costs $49/month.

Worth a quick look? 14-day free trial, no credit card needed.

webslingerai.com

Best,
Rashad
WebSlingerAI`,

    `Hi {{first_name}},

Quick question: How many calls did {{company}} miss last week?

Industry average is 12 per week. At $350 per job, that's $4,200 in lost revenue monthly.

Built an auto-text-back system that recovers 70% of missed calls. Setup: 2 minutes. Cost: $49/month.

{{first_name}}, even if it saves you just ONE job per month, it pays for itself 7x over.

Free 14-day trial: webslingerai.com

Worth testing?

Rashad`
  ];
  
  const emailSubjects2 = [
    "{{first_name}} - Chicago contractor's results", 
    "How a plumber recovered $2,400 in one week",
    "Quick follow-up on missed calls"
  ];
  
  const emailBodies2 = [
    `Hi {{first_name}},

Quick follow-up on the missed-call solution I mentioned.

Just got this text from a plumber in Chicago:
"First week with your system - 6 callbacks from missed calls, 4 became jobs. $2,400 I would've lost."

The math is simple:
- Miss 10 calls/week  
- Lose 8 potential customers (85% won't call back)
- Average job: $350
- Lost revenue: $2,800/week

Our tool: $49/month = $1.63/day

{{first_name}}, even if it only saves you 1 job per month, it pays for itself 7x over.

Free 14-day trial: webslingerai.com
(Setup takes 2 minutes)

Rashad`,

    `Hi {{first_name}},

Hope this finds you well. Following up on our chat about missed calls.

Just heard from an HVAC contractor in Phoenix:
"Went from 15 missed calls per week to 3. Auto-text system recovered $4,200 monthly."

The setup literally takes 2 minutes. The cost is less than what you spend on coffee.

{{first_name}}, want to see if this works for {{company}}? 

14-day free trial: webslingerai.com

No risk, huge upside.

Rashad`
  ];
  
  return {
    weekStart: weekStart.toLocaleDateString(),
    monday: mondayPosts[Math.floor(Math.random() * mondayPosts.length)],
    wednesday: wednesdayPosts[Math.floor(Math.random() * wednesdayPosts.length)],
    friday: fridayPosts[Math.floor(Math.random() * fridayPosts.length)],
    emailSubject1: emailSubjects1[Math.floor(Math.random() * emailSubjects1.length)],
    emailBody1: emailBodies1[Math.floor(Math.random() * emailBodies1.length)],
    emailSubject2: emailSubjects2[Math.floor(Math.random() * emailSubjects2.length)],
    emailBody2: emailBodies2[Math.floor(Math.random() * emailBodies2.length)]
  };
}

function sendDailyFollowUpReminder() {
  const recipient = 'your-email@domain.com'; // Replace with your email
  
  const emailBody = `
<h2>🔔 Daily Sales Check-In</h2>

<h3>Today's Action Items:</h3>
<ul>
<li>✅ Send 5 LinkedIn connection requests</li>
<li>✅ Follow up with 3 recent connections</li>
<li>✅ Check for prospect replies</li>
<li>✅ Update deal statuses in dashboard</li>
<li>✅ Post today's content (if scheduled)</li>
</ul>

<h3>🎯 Weekly Goals Check:</h3>
<ul>
<li>LinkedIn connections: __ / 15</li>
<li>Apollo emails sent: __ / 50</li>
<li>Demos scheduled: __ / 3</li>
<li>Trials started: __ / 2</li>
</ul>

<p><strong>Quick wins today:</strong> Focus on one overdue follow-up and one new connection request.</p>

<p><em>Daily reminder from BossMan Sales System</em></p>
`;

  MailApp.sendEmail({
    to: recipient,
    subject: '🎯 Daily Sales Check-In',
    htmlBody: emailBody
  });
}

// Set up automatic triggers
function createAutomatedTriggers() {
  // Delete existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Weekly content email - Every Monday at 8 AM
  ScriptApp.newTrigger('sendWeeklyContentEmail')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();
    
  // Daily check-in - Every weekday at 9 AM  
  ScriptApp.newTrigger('sendDailyFollowUpReminder')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
    
  console.log('Automated triggers created successfully');
  return 'Email automation triggers set up!';
}