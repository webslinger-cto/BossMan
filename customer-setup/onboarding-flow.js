#!/usr/bin/env node

// BossMan Customer Onboarding System
// Handles new MCTB customer setup and call forwarding configuration

const express = require('express');
const { Client } = require('@supabase/supabase-js');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Initialize clients
const supabase = new Client(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Customer onboarding API endpoints
app.post('/api/customers/signup', async (req, res) => {
  console.log('🆕 New customer signup:', req.body);

  const {
    email,
    business_name,
    owner_name,
    business_phone,
    owner_phone,
    industry,
    trial = true
  } = req.body;

  try {
    // Check if customer already exists
    const { data: existing } = await supabase
      .from('mctb_customers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ 
        error: 'Customer already exists',
        customer_id: existing.id 
      });
    }

    // Assign available Twilio number
    const assignedNumber = await assignTwilioNumber();
    
    if (!assignedNumber) {
      return res.status(500).json({ 
        error: 'No Twilio numbers available' 
      });
    }

    // Calculate trial end date
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Create customer record
    const { data: customer, error } = await supabase
      .from('mctb_customers')
      .insert({
        email,
        business_name,
        owner_name,
        business_phone,
        owner_phone,
        industry,
        twilio_number: assignedNumber,
        status: trial ? 'trial' : 'active',
        trial_start: trial ? new Date().toISOString() : null,
        trial_end: trial ? trialEndDate.toISOString() : null,
        total_missed_calls: 0,
        total_answered_calls: 0,
        total_texts_sent: 0,
        total_responses: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating customer:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }

    // Configure Twilio webhook for the assigned number
    await configureTwilioWebhook(assignedNumber);

    console.log(`✅ Customer created: ${customer.id} with number ${assignedNumber}`);

    // Send welcome/setup instructions
    // await sendWelcomeEmail(customer);

    res.status(201).json({
      success: true,
      customer_id: customer.id,
      twilio_number: assignedNumber,
      setup_instructions: generateSetupInstructions(customer),
      trial_end: customer.trial_end
    });

  } catch (error) {
    console.error('❌ Customer signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer setup status
app.get('/api/customers/:id/status', async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('mctb_customers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if they've received any calls yet (indicates setup is working)
    const { data: recentCalls } = await supabase
      .from('call_logs')
      .select('*')
      .eq('business_id', customer.id)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    const setupComplete = recentCalls && recentCalls.length > 0;

    res.json({
      customer_id: customer.id,
      business_name: customer.business_name,
      twilio_number: customer.twilio_number,
      setup_complete: setupComplete,
      trial_days_remaining: customer.trial_end ? 
        Math.max(0, Math.ceil((new Date(customer.trial_end) - new Date()) / (1000 * 60 * 60 * 24))) : null,
      stats: {
        total_calls: customer.total_missed_calls + customer.total_answered_calls,
        missed_calls: customer.total_missed_calls,
        texts_sent: customer.total_texts_sent,
        responses: customer.total_responses,
        capture_rate: customer.total_missed_calls > 0 ? 
          (customer.total_responses / customer.total_missed_calls * 100).toFixed(1) : 0
      },
      recent_activity: recentCalls || []
    });

  } catch (error) {
    console.error('❌ Error getting customer status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer settings
app.put('/api/customers/:id/settings', async (req, res) => {
  const {
    missed_call_message,
    business_hours,
    emergency_keywords
  } = req.body;

  try {
    const { data: customer, error } = await supabase
      .from('mctb_customers')
      .update({
        missed_call_message,
        business_hours,
        emergency_keywords,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json({ 
      success: true,
      customer: customer 
    });

  } catch (error) {
    console.error('❌ Error updating customer settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test call endpoint - for customer to verify setup
app.post('/api/customers/:id/test-call', async (req, res) => {
  try {
    const { data: customer } = await supabase
      .from('mctb_customers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Initiate a test call to their Twilio number
    const call = await twilioClient.calls.create({
      to: customer.twilio_number,
      from: customer.owner_phone,
      url: `${process.env.BASE_URL}/webhooks/voice/test-call?business_id=${customer.id}`,
      method: 'POST'
    });

    res.json({
      success: true,
      message: 'Test call initiated',
      call_sid: call.sid,
      instructions: 'Let the call ring to voicemail to test the missed call text system'
    });

  } catch (error) {
    console.error('❌ Error initiating test call:', error);
    res.status(500).json({ error: 'Failed to initiate test call' });
  }
});

// Helper function: Assign available Twilio number
async function assignTwilioNumber() {
  try {
    // Check for available numbers in our pool
    const { data: availableNumbers } = await supabase
      .from('twilio_numbers')
      .select('phone_number')
      .eq('assigned', false)
      .limit(1);

    if (availableNumbers && availableNumbers.length > 0) {
      const number = availableNumbers[0].phone_number;
      
      // Mark as assigned
      await supabase
        .from('twilio_numbers')
        .update({ assigned: true })
        .eq('phone_number', number);

      return number;
    }

    // If no pre-purchased numbers, buy a new one
    const newNumber = await purchaseNewTwilioNumber();
    return newNumber;

  } catch (error) {
    console.error('❌ Error assigning Twilio number:', error);
    return null;
  }
}

// Helper function: Purchase new Twilio number
async function purchaseNewTwilioNumber() {
  try {
    // Search for available numbers (US local)
    const numbers = await twilioClient.availablePhoneNumbers('US')
      .local
      .list({ limit: 1 });

    if (numbers.length === 0) {
      throw new Error('No available numbers');
    }

    // Purchase the number
    const purchasedNumber = await twilioClient.incomingPhoneNumbers
      .create({ phoneNumber: numbers[0].phoneNumber });

    // Add to our database
    await supabase.from('twilio_numbers').insert({
      phone_number: purchasedNumber.phoneNumber,
      assigned: true,
      purchased_at: new Date().toISOString()
    });

    console.log(`📞 New number purchased: ${purchasedNumber.phoneNumber}`);
    return purchasedNumber.phoneNumber;

  } catch (error) {
    console.error('❌ Error purchasing Twilio number:', error);
    return null;
  }
}

// Helper function: Configure Twilio webhook
async function configureTwilioWebhook(phoneNumber) {
  try {
    const numbers = await twilioClient.incomingPhoneNumbers
      .list({ phoneNumber });

    if (numbers.length > 0) {
      await twilioClient.incomingPhoneNumbers(numbers[0].sid)
        .update({
          voiceUrl: `${process.env.BASE_URL}/webhooks/voice/incoming`,
          voiceMethod: 'POST',
          smsUrl: `${process.env.BASE_URL}/webhooks/sms/incoming`,
          smsMethod: 'POST'
        });

      console.log(`✅ Webhook configured for ${phoneNumber}`);
    }

  } catch (error) {
    console.error('❌ Error configuring webhook:', error);
  }
}

// Helper function: Generate setup instructions
function generateSetupInstructions(customer) {
  return {
    step_1: {
      title: "Set up call forwarding",
      instruction: `On your business phone (${customer.business_phone}), dial: *72${customer.twilio_number.replace(/\D/g, '')}#`,
      description: "This forwards missed calls to our system"
    },
    step_2: {
      title: "Test the system",
      instruction: "Call your business number from a different phone and let it ring to voicemail",
      description: "You should receive an automated text response"
    },
    step_3: {
      title: "Customize your message",
      instruction: "Visit your dashboard to customize the automated response message",
      description: "Make it sound like you and include your business details"
    },
    forwarding_codes: {
      enable: `*72${customer.twilio_number.replace(/\D/g, '')}#`,
      disable: "*73#",
      conditional: `*71${customer.twilio_number.replace(/\D/g, '')}# (only when busy/no answer)`
    }
  };
}

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🔨 BossMan Customer Setup running on port ${PORT}`);
  console.log(`📋 Signup endpoint: http://localhost:${PORT}/api/customers/signup`);
});

module.exports = app;