#!/usr/bin/env node

// BossMan Sales Automation Setup
// Configures automated email delivery

const cron = require('node-cron');
const { sendWeeklyEmail } = require('./email-sender');
const fs = require('fs');

console.log('🔨 BossMan Sales Automation Setup');
console.log('');

// Check email configuration
const emailPass = process.env.EMAIL_PASSWORD;
const emailUser = process.env.EMAIL_USER || 'cto@webslingerai.com';

if (!emailPass) {
    console.log('⚠️  Email credentials not configured');
    console.log('');
    console.log('To set up email automation:');
    console.log('1. Get Gmail app password: https://myaccount.google.com/security');
    console.log('2. Set environment variable: export EMAIL_PASSWORD="your-app-password"');
    console.log('3. Run this setup again: npm run setup-cron');
    console.log('');
    process.exit(1);
}

console.log('✅ Email credentials configured');
console.log(`📧 Email account: ${emailUser}`);
console.log('');

// Test email sending
console.log('📤 Testing email delivery...');

sendWeeklyEmail().then(success => {
    if (success) {
        console.log('✅ Test email sent successfully!');
        console.log('');
        
        // Set up automated scheduling
        console.log('⏰ Setting up automated email delivery...');
        
        // Schedule weekly emails every Monday at 8 AM
        cron.schedule('0 8 * * 1', () => {
            console.log('🔄 Sending weekly sales content email...');
            sendWeeklyEmail().then(success => {
                if (success) {
                    console.log('✅ Weekly email sent successfully');
                } else {
                    console.error('❌ Failed to send weekly email');
                }
            });
        }, {
            scheduled: true,
            timezone: "America/New_York"
        });

        // Schedule daily reminders every weekday at 9 AM
        cron.schedule('0 9 * * 1-5', () => {
            const dailyReminder = `
🎯 Daily Sales Check-In

Today's Action Items:
☐ Send 5 LinkedIn connection requests
☐ Follow up with 3 recent connections
☐ Check for prospect replies
☐ Update deal statuses in dashboard
☐ Post today's content (if scheduled)

Quick win today: Focus on one overdue follow-up and one new connection request.

🔨 BossMan Sales System
            `;

            // Could add daily email sending here if needed
            console.log('📅 Daily reminder time - check your action items!');
        });

        console.log('✅ Automation setup complete!');
        console.log('');
        console.log('📋 Scheduled tasks:');
        console.log('  • Weekly content emails: Every Monday at 8 AM EST');
        console.log('  • Daily check-ins: Every weekday at 9 AM EST');
        console.log('');
        console.log('🚀 System is now running. Keep this process alive for automation.');
        console.log('   Use PM2 or similar process manager for production deployment.');
        console.log('');
        
        // Create a simple daemon mode
        console.log('💤 Running in automation mode... (Press Ctrl+C to stop)');
        
        // Keep the process alive
        setInterval(() => {
            // Health check every hour
        }, 3600000);
        
    } else {
        console.error('❌ Email test failed. Check your credentials and try again.');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
});