// SealDeal Integration Module
// Handles data exchange between Sales Dashboard and SealDeal

class SealDealIntegration {
  constructor(sealDealApiUrl, apiKey) {
    this.apiUrl = sealDealApiUrl;
    this.apiKey = apiKey;
  }

  // Send qualified lead to SealDeal when demo is scheduled
  async sendQualifiedLead(prospect) {
    if (prospect.demo_scheduled !== 1) {
      throw new Error('Prospect must have demo scheduled to send to SealDeal');
    }

    const leadData = {
      prospect_id: prospect.id,
      name: prospect.name,
      company: prospect.company,
      email: prospect.email,
      phone: prospect.phone,
      linkedin: prospect.linkedin,
      source: prospect.source,
      qualification_notes: prospect.notes,
      demo_scheduled: prospect.demo_date,
      created_at: prospect.created_at,
      last_contact: prospect.last_contact
    };

    try {
      const response = await fetch(`${this.apiUrl}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) {
        throw new Error(`SealDeal API error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to send lead to SealDeal:', error);
      throw error;
    }
  }

  // Receive deal status updates from SealDeal
  async handleDealStatusUpdate(req, res) {
    try {
      const { prospect_id, deal_status, value, close_probability, notes } = req.body;

      // Update prospect in local database
      const db = req.app.get('db');
      
      // Map SealDeal statuses to our prospect statuses
      const statusMap = {
        'proposal_sent': 'proposal',
        'negotiation': 'negotiation', 
        'closed_won': 'converted',
        'closed_lost': 'not_interested'
      };

      const ourStatus = statusMap[deal_status] || 'demo';

      db.run(
        'UPDATE prospects SET status = ?, deal_value = ?, close_probability = ?, notes = ? WHERE id = ?',
        [ourStatus, value, close_probability, notes, prospect_id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database update failed' });
          }

          res.json({ 
            success: true, 
            updated: this.changes,
            prospect_id,
            new_status: ourStatus
          });
        }
      );

    } catch (error) {
      console.error('Deal status update error:', error);
      res.status(500).json({ error: 'Failed to process status update' });
    }
  }

  // Sync all qualified leads to SealDeal (bulk operation)
  async syncQualifiedLeads(db) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM prospects WHERE demo_scheduled = 1 AND sealdeal_synced = 0',
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const results = [];
          for (const prospect of rows) {
            try {
              const result = await this.sendQualifiedLead(prospect);
              
              // Mark as synced
              db.run(
                'UPDATE prospects SET sealdeal_synced = 1, sealdeal_deal_id = ? WHERE id = ?',
                [result.deal_id, prospect.id]
              );

              results.push({ prospect_id: prospect.id, success: true });
            } catch (error) {
              results.push({ prospect_id: prospect.id, success: false, error: error.message });
            }
          }

          resolve(results);
        }
      );
    });
  }
}

// Webhook endpoint for receiving SealDeal updates
function setupSealDealWebhooks(app, integration) {
  // Receive deal status updates
  app.post('/api/webhooks/sealdeal/deal-update', (req, res) => {
    integration.handleDealStatusUpdate(req, res);
  });

  // Receive deal closed notifications
  app.post('/api/webhooks/sealdeal/deal-closed', (req, res) => {
    const { prospect_id, status, final_value, close_date } = req.body;
    
    const db = req.app.get('db');
    const finalStatus = status === 'won' ? 'converted' : 'not_interested';
    
    db.run(
      'UPDATE prospects SET status = ?, converted = ?, deal_value = ?, close_date = ? WHERE id = ?',
      [finalStatus, status === 'won' ? 1 : 0, final_value, close_date, prospect_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database update failed' });
        }
        res.json({ success: true, prospect_id, final_status: finalStatus });
      }
    );
  });
}

module.exports = { SealDealIntegration, setupSealDealWebhooks };