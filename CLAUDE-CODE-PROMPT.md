# Claude Code Implementation Prompt: 14-Day Free Trial System

## Context
You are implementing a 14-day free trial system for BossMan, a contractor management SaaS platform. The codebase uses React + TypeScript frontend, Express backend, Drizzle ORM with PostgreSQL, and Stripe for payments.

## Requirements

### 1. Update Pricing Pages
**Replace all pricing page CTAs with:**
- Primary buttons: "Start Your FREE 14-Day Trial"  
- Secondary text: "Then $[price]/month. Cancel anytime."
- Add prominent banner: "🔥 Try ANY Plan FREE for 14 Days 🔥 No credit card required. Full platform access."

**Remove any testimonials or social proof that reference fake customers or made-up quotes.**

### 2. Homepage Updates  
**Add above main CTA:**
```
⚡ Start Your FREE 14-Day Trial ⚡
No credit card required. Full platform access.
See why contractors choose BossMan.
```

### 3. Stripe Integration Updates
- Modify all subscription plans to include 14-day trial periods
- Ensure no credit card collection during trial signup
- Current Price IDs to update:
  - Apprentice ($49): price_0TDTbU8dsivg9CAOW1Xrd52z
  - Foreman ($99): price_0TDeyF8dsivg9CAOXOODfBOd  
  - General Contractor ($199): price_0TDeyF8dsivg9CAOOX5c9bJO
  - Developer ($299): price_0TDUmY8dsivg9CAO9xlVpGTG

### 4. Database Schema Changes
Add to companies table:
```sql
trial_started_at TIMESTAMP
trial_ends_at TIMESTAMP  
trial_plan VARCHAR(50)
trial_converted BOOLEAN DEFAULT FALSE
```

### 5. Feature Limiting System
Implement usage limits during trial:
- Apprentice: 5 jobs max, 3 crew members max
- Foreman: 10 jobs max, 5 crew members max
- GC: 25 jobs max, 10 crew members max  
- Developer: 50 jobs max, 25 crew members max

Add soft warnings when approaching limits, upgrade prompts when limits reached.

### 6. Trial Dashboard Component
Create trial status indicator showing:
- Days remaining in trial
- Current usage vs. limits
- "Upgrade Now" call-to-action
- Progress indicators for setup completion

### 7. Signup Flow Updates
- Modify registration to capture trial plan selection
- Remove credit card requirements
- Add trial terms acceptance
- Set trial start/end dates automatically
- Create sample data for immediate value demonstration

### 8. Email Notification System (Future Enhancement)
Prepare hooks for:
- Welcome email (Day 1)
- Check-in email (Day 3) 
- Progress report (Day 7)
- Upgrade prompts (Day 10, 12, 14)

## Technical Specifications
- Use Stripe's built-in trial period functionality
- Implement feature gates with React components
- Add trial status checks to API middleware
- Create TypeScript interfaces for trial data
- Update existing UI components to show trial status
- Ensure MCTB functionality works fully during trial

## Key Files to Modify
- `client/src/pages/pricing/*` - Update pricing displays
- `client/src/pages/home/*` - Add trial messaging  
- `server/routes.ts` - Add trial logic to signup/subscription routes
- `shared/schema.ts` - Add trial fields to companies table
- `server/storage.ts` - Add trial-related database operations
- React components for trial status/limits

## Success Criteria
- Clean, professional trial messaging (no fake testimonials)
- Functional 14-day trial with no credit card required
- Feature limits enforced but not restrictive for evaluation
- Clear upgrade path with compelling messaging
- Technical implementation ready for real user testing

Focus on clean, honest implementation that builds trust and delivers immediate value to trial users.