#!/usr/bin/env node

// BossMan Sales Quick Test - Sends email in 5 minutes
// Run this to test email automation immediately

const { sendWeeklyEmail } = require('./email-sender');

console.log('🔨 BossMan Sales Quick Test');
console.log('⏰ Email will be sent in 5 minutes...');
console.log('📧 Recipient: rabdulsalaam@gmail.com');
console.log('');

// Check email credentials
const emailPass = process.env.EMAIL_PASSWORD;
if (!emailPass) {
    console.error('❌ EMAIL_PASSWORD environment variable not set');
    console.log('💡 Run: export EMAIL_PASSWORD="your-gmail-app-password"');
    process.exit(1);
}

console.log('✅ Email credentials configured');
console.log('');

// Countdown timer
let minutes = 5;
let seconds = 0;

const countdown = setInterval(() => {
    process.stdout.write(`\r⏰ Email sending in: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    
    if (seconds === 0) {
        if (minutes === 0) {
            clearInterval(countdown);
            console.log('\n');
            console.log('🚀 Sending test email now...');
            
            sendWeeklyEmail().then(success => {
                if (success) {
                    console.log('✅ Test email sent successfully!');
                    console.log('📧 Check your inbox: rabdulsalaam@gmail.com');
                    console.log('');
                    console.log('🎯 If you received the email, the automation is working perfectly!');
                } else {
                    console.error('❌ Test email failed. Check your credentials.');
                }
                process.exit(success ? 0 : 1);
            });
            return;
        }
        minutes--;
        seconds = 59;
    } else {
        seconds--;
    }
}, 1000);

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n');
    console.log('⚡ Sending test email immediately...');
    clearInterval(countdown);
    
    sendWeeklyEmail().then(success => {
        console.log(success ? '✅ Email sent!' : '❌ Email failed');
        process.exit(0);
    });
});