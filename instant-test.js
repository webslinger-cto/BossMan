#!/usr/bin/env node

// BossMan Sales Instant Test - Sends email immediately + schedules one for 5 minutes

const { sendWeeklyEmail } = require('./email-sender');

console.log('🔥 BossMan Sales INSTANT Test');
console.log('📧 Sending email NOW and scheduling another in 5 minutes...');
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

// Send immediate test
console.log('🚀 Sending INSTANT test email...');

sendWeeklyEmail().then(success => {
    if (success) {
        console.log('✅ INSTANT email sent successfully!');
        console.log('📧 Check your inbox: rabdulsalaam@gmail.com');
        console.log('');
        
        // Schedule second email in 5 minutes
        console.log('⏰ Scheduling second test email in 5 minutes...');
        
        let countdown = 300; // 5 minutes in seconds
        
        const timer = setInterval(() => {
            const mins = Math.floor(countdown / 60);
            const secs = countdown % 60;
            process.stdout.write(`\r⏰ Next email in: ${mins}:${secs.toString().padStart(2, '0')}`);
            countdown--;
            
            if (countdown < 0) {
                clearInterval(timer);
                console.log('\n');
                console.log('🚀 Sending second test email...');
                
                sendWeeklyEmail().then(success => {
                    if (success) {
                        console.log('✅ Second email sent successfully!');
                        console.log('🎯 Email automation is working perfectly!');
                    } else {
                        console.log('❌ Second email failed');
                    }
                    process.exit(0);
                });
            }
        }, 1000);
        
        // Handle Ctrl+C to send second email immediately
        process.on('SIGINT', () => {
            console.log('\n⚡ Sending second email immediately...');
            clearInterval(timer);
            
            sendWeeklyEmail().then(success => {
                console.log(success ? '✅ Second email sent!' : '❌ Second email failed');
                process.exit(0);
            });
        });
        
    } else {
        console.error('❌ INSTANT email failed. Check your credentials.');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});