#!/usr/bin/env node

// BossMan Sales Email Automation
// Sends weekly sales content directly via email

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email templates and content
const weeklyContent = {
    linkedinPosts: {
        monday: [
            "Called 5 contractors this weekend about a kitchen emergency. 3 went to voicemail. 2 answered but were 'booked for weeks.' 0 had any follow-up system. Guess who got my $2,400 job? The ONE contractor with auto-text-back set up. If you're missing calls, you're missing money. Simple as that. #Contractors #CustomerService #SmallBusiness",
            
            "Weekend emergency: burst pipe, 9pm Saturday. Called 7 plumbers. 6 went straight to voicemail. 1 answered, said 'call back Monday.' Result? I fixed it myself and learned plumbing on YouTube. How much revenue are you losing to DIY tutorials? #EmergencyService #Plumbing #MissedOpportunities",
            
            "Reality check: Your phone rings at 7pm. You're covered in mud, hands full of tools. Customer hangs up. They call the next contractor on Google. That's $350 walking out the door. Every. Single. Time. Auto-text-back fixes this. #ContractorLife #TechSolutions"
        ],
        
        wednesday: [
            "Reality check for home service businesses: 📞 62% of calls to contractors go unanswered 📱 85% of customers won't call back if you miss them 💰 Average missed call = $350 lost revenue 📊 That's $3,500/week walking out the door. The solution? Auto-text-back in under 5 seconds. Technology isn't replacing contractors. It's helping the smart ones capture every opportunity. #ContractorLife #MissedCalls #SmallBizTech",
            
            "Why smart contractors are winning: They know that missed calls = missed money. Industry data: 12 missed calls per week × $350 average job = $4,200 in lost revenue. Solution: Auto-text-back in 5 seconds. Cost: $1.60 per day. ROI: Massive. #ContractorWins #Technology #SmallBusiness",
            
            "The $14,000 problem contractors don't track: Missed calls. Most contractors lose 40+ calls per month. At $350 average, that's $14K in revenue walking away because nobody picked up the phone. Auto-text-back recovers 70% of these lost opportunities. #MissedRevenue #Automation"
        ],
        
        friday: [
            "Week wrap-up win: Had a contractor tell me yesterday: 'First week with your system, I got 6 text responses from missed calls. 4 turned into jobs. That's $2,400 I would have lost.' The setup took 3 minutes. The cost is $49/month. The ROI paid for itself in one day. Sometimes the best business decisions are the simplest ones. #ContractorWins #SmallBusiness #Technology #FridayWin",
            
            "Quick Friday success story: HVAC contractor in Phoenix went from 15 missed calls per week to 3. The difference? Auto-text-back system that responds in 5 seconds. Revenue recovered: $4,200 monthly. Investment: $49 monthly. Sometimes technology just makes sense. #HVACSuccess #Automation #FridayThoughts",
            
            "Sometimes the best business decisions are the simplest ones. Had a client say: 'Your missed-call tool paid for itself in 4 hours. Now I wonder how much money I lost before this.' Smart contractors adapt. Stubborn ones keep missing calls. #FridayThoughts #BusinessGrowth"
        ]
    },
    
    apolloTemplates: [
        {
            subject: "Quick question about missed calls",
            body: `Hi {{first_name}},

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
WebSlingerAI`
        },
        {
            subject: "{{first_name}} - Chicago contractor's results",
            body: `Hi {{first_name}},

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

Rashad`
        }
    ]
};

function getRandomContent() {
    const monday = weeklyContent.linkedinPosts.monday[Math.floor(Math.random() * weeklyContent.linkedinPosts.monday.length)];
    const wednesday = weeklyContent.linkedinPosts.wednesday[Math.floor(Math.random() * weeklyContent.linkedinPosts.wednesday.length)];
    const friday = weeklyContent.linkedinPosts.friday[Math.floor(Math.random() * weeklyContent.linkedinPosts.friday.length)];
    const apollo = weeklyContent.apolloTemplates[Math.floor(Math.random() * weeklyContent.apolloTemplates.length)];
    
    return { monday, wednesday, friday, apollo };
}

function generateEmailHTML(content) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content-block { background: #f9fafb; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .apollo-block { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .copy-text { font-family: monospace; background: white; padding: 10px; border-radius: 4px; white-space: pre-wrap; }
        .goals { background: #dcfce7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔨 BossMan Weekly Sales Content</h1>
            <p>Week of ${new Date().toLocaleDateString()} - Fresh content ready to copy & paste</p>
        </div>

        <h2>📱 LinkedIn Posts (Ready to Copy-Paste)</h2>

        <div class="content-block">
            <h3>Monday - Pain Point Post</h3>
            <div class="copy-text">${content.monday}</div>
        </div>

        <div class="content-block">
            <h3>Wednesday - Industry Stats</h3>
            <div class="copy-text">${content.wednesday}</div>
        </div>

        <div class="content-block">
            <h3>Friday - Success Story</h3>
            <div class="copy-text">${content.friday}</div>
        </div>

        <h2>📧 Apollo Email Template</h2>

        <div class="apollo-block">
            <h3>${content.apollo.subject}</h3>
            <div class="copy-text">${content.apollo.body}</div>
        </div>

        <h2>📊 This Week's Focus</h2>
        
        <div class="goals">
            <h3>🎯 Weekly Goals</h3>
            <ul>
                <li><strong>LinkedIn connections:</strong> Target 15 new prospects</li>
                <li><strong>Apollo sequences:</strong> Launch 2 new campaigns</li>
                <li><strong>Follow-ups:</strong> Clear overdue list</li>
                <li><strong>Content engagement:</strong> Monitor post performance</li>
            </ul>

            <h3>🚀 Daily Actions</h3>
            <ul>
                <li><strong>Monday:</strong> Post pain point content + 5 connection requests</li>
                <li><strong>Wednesday:</strong> Share stats post + follow up with connections</li>
                <li><strong>Friday:</strong> Post success story + weekly review</li>
            </ul>
        </div>

        <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 0.9em;">
            🔨 Generated by BossMan Sales Automation System<br>
            Fresh content delivered automatically every Monday at 8 AM EST
        </p>
    </div>
</body>
</html>`;
}

async function sendWeeklyEmail(recipient = 'rabdulsalaam@gmail.com') {
    // Check for email credentials
    const emailUser = process.env.EMAIL_USER || 'cto@webslingerai.com';
    const emailPass = process.env.EMAIL_PASSWORD;
    
    if (!emailPass) {
        console.error('❌ EMAIL_PASSWORD environment variable not set');
        console.log('💡 Set your Gmail app password: export EMAIL_PASSWORD="your-app-password"');
        process.exit(1);
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });

    // Generate fresh content
    const content = getRandomContent();
    const emailHTML = generateEmailHTML(content);

    const mailOptions = {
        from: emailUser,
        to: recipient,
        subject: `🔨 BossMan Weekly Sales Content - Week of ${new Date().toLocaleDateString()}`,
        html: emailHTML
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Weekly sales content email sent successfully!');
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log(`📨 Sent to: ${recipient}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        if (error.code === 'EAUTH') {
            console.log('💡 Check your Gmail app password and make sure 2FA is enabled');
        }
        return false;
    }
}

// CLI usage
if (require.main === module) {
    const recipient = process.argv[2] || 'cto@webslingerai.com';
    
    console.log('🔨 BossMan Sales Email Automation');
    console.log(`📧 Sending weekly content to: ${recipient}`);
    console.log('');
    
    sendWeeklyEmail(recipient).then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { sendWeeklyEmail, getRandomContent, generateEmailHTML };