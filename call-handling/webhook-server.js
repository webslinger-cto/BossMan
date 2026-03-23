#!/usr/bin/env node

// BossMan MCTB Call Handling System
// Processes incoming calls via Twilio webhooks

const express = require('express');
const twilio = require('twilio');
const { Client } = require('@supabase/supabase-js');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Twilio credentials
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Supabase client
const supabase = new Client(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Webhook: Incoming call handler
app.post('/webhooks/voice/incoming', async (req, res) => {
  console.log('📞 Incoming call:', req.body);
  
  const {
    From: callerNumber,
    To: twilioNumber,
    CallSid,
    CallStatus
  } = req.body;

  try {
    // Look up which business this Twilio number belongs to
    const { data: business, error } = await supabase
      .from('mctb_customers')
      .select('*')
      .eq('twilio_number', twilioNumber)
      .single();

    if (error || !business) {
      console.error('❌ Business not found for number:', twilioNumber);
      return res.status(404).send('Business not found');
    }

    console.log(`📋 Call for: ${business.business_name} from ${callerNumber}`);

    // Log the incoming call
    await supabase.from('call_logs').insert({
      business_id: business.id,
      caller_number: callerNumber,
      twilio_number: twilioNumber,
      call_sid: CallSid,
      call_status: 'incoming',
      timestamp: new Date().toISOString()
    });

    // Create TwiML response
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // First, try to reach the business owner
    const dial = twiml.dial({
      timeout: 30,
      action: `/webhooks/voice/missed?business_id=${business.id}&caller=${callerNumber}`,
      method: 'POST'
    });

    // Ring the business owner's phone
    dial.number({
      statusCallbackEvent: 'answered completed',
      statusCallback: `/webhooks/voice/status?business_id=${business.id}`
    }, business.owner_phone);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling incoming call:', error);
    res.status(500).send('Internal server error');
  }
});

// Webhook: Handle missed calls (when owner doesn't answer)
app.post('/webhooks/voice/missed', async (req, res) => {
  console.log('📵 Missed call webhook:', req.body);

  const {
    DialCallStatus,
    CallStatus
  } = req.body;

  const businessId = req.query.business_id;
  const callerNumber = req.query.caller;

  try {
    // Get business details
    const { data: business } = await supabase
      .from('mctb_customers')
      .select('*')
      .eq('id', businessId)
      .single();

    // Only send text if the call was truly missed
    if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy' || DialCallStatus === 'failed') {
      
      // Log as missed call
      await supabase.from('call_logs').insert({
        business_id: businessId,
        caller_number: callerNumber,
        call_status: 'missed',
        timestamp: new Date().toISOString()
      });

      // Send missed call text to customer
      await sendMissedCallText(callerNumber, business);
      
      console.log(`✅ Missed call text sent to ${callerNumber} for ${business.business_name}`);
      
      // Update missed call counter
      await supabase
        .from('mctb_customers')
        .update({ 
          total_missed_calls: business.total_missed_calls + 1,
          last_missed_call: new Date().toISOString()
        })
        .eq('id', businessId);
    }

    // End the call gracefully
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling missed call:', error);
    res.status(500).send('Error processing missed call');
  }
});

// Webhook: Call status updates
app.post('/webhooks/voice/status', async (req, res) => {
  console.log('📊 Call status update:', req.body);
  
  const {
    CallSid,
    CallStatus,
    CallDuration
  } = req.body;

  const businessId = req.query.business_id;

  try {
    // Update call log with final status
    await supabase
      .from('call_logs')
      .update({
        call_status: CallStatus,
        duration_seconds: CallDuration || 0,
        completed_at: new Date().toISOString()
      })
      .eq('call_sid', CallSid);

    // If call was answered, update business stats
    if (CallStatus === 'completed' && CallDuration > 0) {
      const { data: business } = await supabase
        .from('mctb_customers')
        .select('total_answered_calls')
        .eq('id', businessId)
        .single();

      await supabase
        .from('mctb_customers')
        .update({ 
          total_answered_calls: (business.total_answered_calls || 0) + 1,
          last_answered_call: new Date().toISOString()
        })
        .eq('id', businessId);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error updating call status:', error);
    res.status(500).send('Error updating status');
  }
});

// Function: Send missed call text
async function sendMissedCallText(toNumber, business) {
  try {
    const message = business.missed_call_message || 
      `Hi! This is ${business.business_name}. Sorry we missed your call! We're on another job but will call you back within 1 hour. For emergencies, text URGENT and we'll respond immediately. - ${business.owner_name}`;

    const textMessage = await twilioClient.messages.create({
      body: message,
      from: business.twilio_number,
      to: toNumber,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_MCTB
    });

    console.log(`📱 Text sent: ${textMessage.sid}`);

    // Log the text message
    await supabase.from('text_logs').insert({
      business_id: business.id,
      to_number: toNumber,
      from_number: business.twilio_number,
      message_body: message,
      message_sid: textMessage.sid,
      message_status: 'sent',
      timestamp: new Date().toISOString()
    });

    // Update text counter
    await supabase
      .from('mctb_customers')
      .update({ 
        total_texts_sent: business.total_texts_sent + 1 
      })
      .eq('id', business.id);

    return textMessage;

  } catch (error) {
    console.error('❌ Error sending missed call text:', error);
    throw error;
  }
}

// Webhook: Handle incoming text responses
app.post('/webhooks/sms/incoming', async (req, res) => {
  console.log('📱 Incoming text:', req.body);

  const {
    From: customerNumber,
    To: twilioNumber,
    Body: messageBody,
    MessageSid
  } = req.body;

  try {
    // Find the business
    const { data: business } = await supabase
      .from('mctb_customers')
      .select('*')
      .eq('twilio_number', twilioNumber)
      .single();

    if (!business) {
      console.error('❌ Business not found for text to:', twilioNumber);
      return res.status(404).send('Business not found');
    }

    // Log incoming text
    await supabase.from('text_logs').insert({
      business_id: business.id,
      to_number: twilioNumber,
      from_number: customerNumber,
      message_body: messageBody,
      message_sid: MessageSid,
      message_status: 'received',
      timestamp: new Date().toISOString()
    });

    // Check for URGENT keyword
    if (messageBody.toUpperCase().includes('URGENT')) {
      // Forward urgent text to business owner immediately
      await twilioClient.messages.create({
        body: `🚨 URGENT from ${customerNumber}: ${messageBody}`,
        from: twilioNumber,
        to: business.owner_phone
      });

      // Auto-reply to customer
      await twilioClient.messages.create({
        body: `Got your urgent message! ${business.owner_name} has been notified and will call you within 15 minutes.`,
        from: twilioNumber,
        to: customerNumber
      });

    } else {
      // Forward normal text to business owner
      await twilioClient.messages.create({
        body: `Customer response from ${customerNumber}: ${messageBody}`,
        from: twilioNumber,
        to: business.owner_phone
      });
    }

    // Update response counter
    await supabase
      .from('mctb_customers')
      .update({ 
        total_responses: business.total_responses + 1,
        last_response: new Date().toISOString()
      })
      .eq('id', business.id);

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error handling incoming text:', error);
    res.status(500).send('Error processing text');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'MCTB Call Handler',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔨 BossMan MCTB Call Handler running on port ${PORT}`);
  console.log(`📞 Voice webhook: http://localhost:${PORT}/webhooks/voice/incoming`);
  console.log(`📱 SMS webhook: http://localhost:${PORT}/webhooks/sms/incoming`);
});

module.exports = app;