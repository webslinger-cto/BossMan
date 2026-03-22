const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Initialize database
const db = new sqlite3.Database('sales.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    linkedin TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_contact DATETIME,
    next_follow_up DATE,
    notes TEXT,
    demo_scheduled BOOLEAN DEFAULT 0,
    trial_started BOOLEAN DEFAULT 0,
    converted BOOLEAN DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS outreach_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prospect_id INTEGER,
    type TEXT,
    template TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    opened BOOLEAN DEFAULT 0,
    replied BOOLEAN DEFAULT 0,
    FOREIGN KEY (prospect_id) REFERENCES prospects (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS content_calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start DATE,
    linkedin_monday TEXT,
    linkedin_wednesday TEXT,
    linkedin_friday TEXT,
    apollo_template TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API Routes
app.get('/api/prospects', (req, res) => {
  db.all('SELECT * FROM prospects ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/prospects', (req, res) => {
  const { name, company, email, phone, linkedin, source, notes } = req.body;
  const nextFollowUp = new Date();
  nextFollowUp.setDate(nextFollowUp.getDate() + 3);
  
  db.run(
    'INSERT INTO prospects (name, company, email, phone, linkedin, source, notes, next_follow_up) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, company, email, phone, linkedin, source, notes, nextFollowUp.toISOString().split('T')[0]],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/prospects/:id/status', (req, res) => {
  const { status } = req.body;
  const now = new Date().toISOString();
  
  db.run(
    'UPDATE prospects SET status = ?, last_contact = ? WHERE id = ?',
    [status, now, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.get('/api/overdue', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  db.all(
    'SELECT * FROM prospects WHERE next_follow_up < ? AND status NOT IN ("converted", "not_interested")',
    [today],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/stats', (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as total FROM prospects', (err, row) => {
    stats.total_prospects = row.total;
    
    db.get('SELECT COUNT(*) as demos FROM prospects WHERE demo_scheduled = 1', (err, row) => {
      stats.demos = row.demos;
      
      db.get('SELECT COUNT(*) as trials FROM prospects WHERE trial_started = 1', (err, row) => {
        stats.trials = row.trials;
        
        db.get('SELECT COUNT(*) as conversions FROM prospects WHERE converted = 1', (err, row) => {
          stats.conversions = row.conversions;
          res.json(stats);
        });
      });
    });
  });
});

app.post('/api/log-outreach', (req, res) => {
  const { prospect_id, type, template } = req.body;
  
  db.run(
    'INSERT INTO outreach_log (prospect_id, type, template) VALUES (?, ?, ?)',
    [prospect_id, type, template],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Update prospect's last contact
      db.run(
        'UPDATE prospects SET last_contact = CURRENT_TIMESTAMP WHERE id = ?',
        [prospect_id]
      );
      
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/content/this-week', (req, res) => {
  const templates = {
    monday: [
      "Called 5 contractors this weekend about an emergency. 3 went to voicemail. 2 answered but were 'booked for weeks.' 0 had any follow-up system. Guess who got my $2,400 job? The ONE guy with auto-text-back set up. #Contractors #CustomerService",
      
      "Reality check: Your phone rings at 7pm. You're covered in mud, hands full of tools. Customer hangs up. They call the next contractor on Google. That's $350 walking out the door. Every. Single. Time. Auto-text-back fixes this. #ContractorLife #MissedOpportunities",
      
      "Weekend emergency: burst pipe, 9pm Saturday. Called 7 plumbers. 6 went straight to voicemail. 1 answered, said 'call back Monday.' Result? I fixed it myself and learned plumbing on YouTube. How much revenue are you losing to DIY tutorials? #EmergencyService #Plumbing"
    ],
    
    wednesday: [
      "Home service businesses reality check: 📞 62% of calls go unanswered 📱 85% of customers won't call back 💰 Average missed call = $350 lost 📊 That's $3,500/week walking out your door. The solution costs $49/month. Do the math. #ContractorStats #SmallBusiness",
      
      "Why smart contractors are winning: They know that missed calls = missed money. Industry data: 12 missed calls per week × $350 average job = $4,200 in lost revenue. Solution: Auto-text-back in 5 seconds. Cost: $1.60 per day. ROI: Massive. #ContractorWins #Technology",
      
      "The $14,000 problem contractors don't track: Missed calls. Most contractors lose 40+ calls per month. At $350 average, that's $14K in revenue walking away because nobody picked up the phone. Auto-text-back recovers 70% of these lost opportunities. #MissedRevenue #Automation"
    ],
    
    friday: [
      "Week wrap-up win: Contractor told me yesterday - 'First week with your auto-text system, I got 8 callbacks from missed calls. 6 became jobs. That's $2,100 I would have lost.' Setup time: 3 minutes. Monthly cost: $49. ROI: Immediate. #ContractorSuccess #WeeklyWin",
      
      "Sometimes the best business decisions are the simplest ones. Had a client say: 'Your missed-call tool paid for itself in 4 hours. Now I wonder how much money I lost before this.' Smart contractors adapt. Stubborn ones keep missing calls. #FridayThoughts #BusinessGrowth",
      
      "Quick Friday success story: HVAC contractor in Phoenix went from 15 missed calls per week to 3. The difference? Auto-text-back system that responds in 5 seconds. Revenue recovered: $4,200 monthly. Investment: $49 monthly. Sometimes technology just makes sense. #HVACSuccess #Automation"
    ]
  };
  
  // Randomly select one from each day
  const content = {
    monday: templates.monday[Math.floor(Math.random() * templates.monday.length)],
    wednesday: templates.wednesday[Math.floor(Math.random() * templates.wednesday.length)],
    friday: templates.friday[Math.floor(Math.random() * templates.friday.length)]
  };
  
  res.json(content);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sales automation app running on port ${PORT}`);
});