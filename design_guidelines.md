# Design Guidelines: Emergency Chicago Sewer Experts CRM

## Design Approach

**System**: Custom Dark Dashboard System inspired by the existing field checklist tool
**Justification**: This is a utility-focused, data-heavy CRM requiring efficiency, clarity, and professional aesthetics. Building on the established dark theme ensures consistency with existing tools while creating a cohesive brand experience.

## Core Design Elements

### A. Typography

**Font Families**:
- Primary: System UI stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)

**Hierarchy**:
- Page Titles: 24px, font-weight 700, letter-spacing 0.08em, uppercase
- Section Headers: 13-14px, font-weight 600, letter-spacing 0.09em, uppercase
- Body Text: 13px, font-weight 400-500
- Metadata/Labels: 11-12px, font-weight 400, color muted
- Small Text: 10px for tags, badges, helper text

### B. Color System

**Backgrounds**:
- Primary: `#111217` (main background)
- Secondary: `#191b22` (elevated surfaces)
- Card: `#1f2129` (component backgrounds)
- Gradients: Radial gradients from `#1e1f28` to `#05060a` for depth

**Accents**:
- Primary Blue: `#3b82f6` (CTAs, important elements - Emergency Chicago Sewer Experts brand color)
- Hover Blue: `#60a5fa` (interactive states)
- Soft Blue: `rgba(59, 130, 246, 0.18)` (backgrounds)
- Emergency Red: `#ef4444` (emergency indicators, alerts, brand accent)
- Success Green: `#4caf50` (completed states, positive metrics)
- Danger Red: `#dc2626` (errors, critical alerts)
- Warning Amber: `#f59e0b` (caution states)

**Text**:
- Primary: `#f5f5f5`
- Muted: `#a3a7b5`
- On-accent: `#ffffff`

**Borders**: `#2a2d38` (subtle dividers)

### C. Layout System

**Spacing Units** (Tailwind-equivalent):
- Primary scale: 2, 4, 6, 8, 12, 16, 24 (use `gap-4`, `p-6`, `mt-8`, etc.)
- Card padding: 12-16px
- Section gaps: 14-18px
- Component spacing: 6-10px

**Grid Structure**:
- Desktop: Two-column layout for dashboard (1.6fr main content, 1.1fr sidebar)
- Tablet: Single column with wider cards
- Mobile: Full-width stacked layout
- Max-width: 1080-1200px container

**Border Radius**:
- Cards: 16-22px (large, dramatic)
- Buttons: 999px (pill-shaped)
- Small components: 9-12px
- Inputs: 12px

### D. Component Library

**Navigation**:
- Top header with logo, role indicator, user info
- Tabbed navigation for Admin/Technician views
- Breadcrumbs for deep navigation (optional)

**Dashboard Cards**:
- Elevated cards with `box-shadow: 0 10px 28px rgba(0,0,0,0.35)`
- Gradient overlays: `radial-gradient(circle at top left, rgba(255,255,255,0.02), transparent 55%)`
- Left accent bars (3px) that change color based on status

**KPI Widgets**:
- Large metric displays with labels
- Comparison indicators (up/down arrows, percentages)
- Mini sparkline charts for trends
- Color-coded based on performance (green=good, red=poor)

**Data Tables**:
- Zebra striping with subtle backgrounds
- Sortable headers with icons
- Row hover states with slight elevation
- Inline action buttons (edit, view, delete)
- Pagination at bottom

**Charts & Visualizations**:
- Line charts for trends (use Chart.js or similar)
- Bar charts for comparisons
- Donut charts for distributions
- Heat maps for geographic data
- Dark backgrounds with colored data points

**Buttons**:
- Primary: Blue background `#3b82f6`, pill-shaped, uppercase, 0.08em letter-spacing (Emergency Chicago Sewer Experts brand CTA)
- Secondary: Outlined with `rgba(244,244,244,0.3)` border
- Ghost: Transparent with muted text
- Danger: Red background `#ef4444` (emergency accent color)
- All buttons: Smooth hover lift with shadow

**Forms & Inputs**:
- Dark backgrounds `#161821`
- Subtle borders `#2a2d38`
- Focus state: Blue accent border `#3b82f6` (matches Emergency CSE brand)
- Labels above inputs (11px, muted)
- Validation states with color-coded borders

**Status Badges**:
- Pill-shaped with colored borders and backgrounds
- Done: Green (`#4caf50`)
- Issue/Problem: Red (`#f44336`)
- Pending: Blue (`#3b82f6`)
- Info: Blue-gray
- 10px font, uppercase, letter-spaced

**Quote Builder**:
- Line-item rows with inline editing
- Running totals sidebar (sticky)
- Add/remove item buttons
- Material/labor categorization
- Tax calculation display

**Modals & Overlays**:
- Dark backdrop: `rgba(0,0,0,0.75)`
- Centered card with dramatic shadow
- Close button (top-right)
- Action buttons at bottom

### E. Interactions & Animations

**Transitions**: `0.15s ease-out` for all interactive states

**Hover Effects**:
- Cards: Lift 1px, add shadow, brighten border
- Buttons: Lift 1px, intensify background
- Table rows: Subtle background change

**Loading States**:
- Skeleton loaders with shimmer effect
- Spinner for data fetching (blue accent)

**Micro-interactions**:
- Success checkmarks for completed actions
- Slide-in notifications (top-right)
- Smooth progress bar animations

## Application-Specific Patterns

**Admin Dashboard**:
- Hero stats row (4 KPI cards across)
- Chart section (2-column grid)
- Recent activity feed (right sidebar)
- Quick filters (top bar with dropdowns)

**Technician View**:
- Active jobs list (scrollable cards)
- Integrated quote tool (full-width modal or dedicated page)
- Quick actions (floating action button for new quote)

**Quote Tool Integration**:
- Maintain existing checklist aesthetic
- Add payment section at bottom
- Real-time calculation updates
- Save/send quote buttons

**Login Pages**:
- Centered card (max 400px)
- Logo at top
- Role selection (Admin/Technician)
- Password input with show/hide toggle
- Minimal, focused design

## Images

No hero images required. This is a utility application focused on data and functionality. Use icons from **Heroicons** (via CDN) for:
- Navigation items
- Status indicators  
- Action buttons
- Empty states

The Emergency Chicago Sewer Experts logo features a plumber with the Chicago skyline background, emergency red siren, and blue uniform. The brand colors are blue (#3b82f6) for primary CTAs and red (#ef4444) for emergency accents, reflecting the professional and urgent nature of the service.