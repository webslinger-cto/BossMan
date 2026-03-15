import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface Screenshot {
  name: string;
  path: string;
  description: string;
  uniqueFeature?: string;
}

const screenshots: Screenshot[] = [];

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function login(page: puppeteer.Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await delay(1000);
  
  await page.waitForSelector('[data-testid="input-username"]', { timeout: 10000 });
  await page.type('[data-testid="input-username"]', username);
  await page.type('[data-testid="input-password"]', password);
  await page.click('[data-testid="button-signin"]');
  
  await delay(3000);
}

async function clickSidebarLink(page: puppeteer.Page, linkText: string) {
  try {
    const links = await page.$$('a');
    for (const link of links) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && text.toLowerCase().includes(linkText.toLowerCase())) {
        await link.click();
        await delay(2000);
        return true;
      }
    }
  } catch (e) {
    console.log(`Could not click link: ${linkText}`);
  }
  return false;
}

async function captureScreenshot(page: puppeteer.Page, name: string, description: string, uniqueFeature?: string) {
  const filename = `${name}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  screenshots.push({ name, path: filename, description, uniqueFeature });
  console.log(`Captured: ${name}`);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // LOGIN PAGE
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await delay(1500);
    await captureScreenshot(page, '00_login', 'Login Page - Chicago Sewer Experts CRM');

    // ADMIN ROLE
    console.log('\n--- ADMIN ROLE ---');
    await login(page, 'admin', 'demo123');
    await captureScreenshot(page, '01_admin_dashboard', 'Admin Dashboard - KPI Overview', 'Real-time business metrics');

    await clickSidebarLink(page, 'leads');
    await captureScreenshot(page, '02_admin_leads', 'Lead Management', 'Multi-source: eLocal, Networx, Angi, Thumbtack');

    await clickSidebarLink(page, 'jobs');
    await captureScreenshot(page, '03_admin_jobs', 'Job Management', 'Complete cost tracking');

    await clickSidebarLink(page, 'technicians');
    await captureScreenshot(page, '04_admin_technicians', 'Technician Management', 'Skill-based assignment');

    await clickSidebarLink(page, 'analytics');
    await delay(1000);
    await captureScreenshot(page, '05_admin_analytics', 'Analytics Dashboard', 'ROI and profitability metrics');

    await clickSidebarLink(page, 'pricebook');
    await captureScreenshot(page, '06_admin_pricebook', 'Pricebook Management', 'UNIQUE: Service catalog with labor estimates');

    await clickSidebarLink(page, 'marketing');
    await captureScreenshot(page, '07_admin_marketing', 'Marketing ROI', 'UNIQUE: Cost-per-lead by source');

    await clickSidebarLink(page, 'import');
    await captureScreenshot(page, '08_admin_import', 'Data Import', 'Bulk import leads');

    await clickSidebarLink(page, 'outreach');
    await captureScreenshot(page, '09_admin_outreach', 'Outreach Campaigns', 'Automated communication');

    // DISPATCHER ROLE - new browser context
    console.log('\n--- DISPATCHER ROLE ---');
    const dispatcherPage = await browser.newPage();
    await dispatcherPage.setViewport({ width: 1400, height: 900 });
    await login(dispatcherPage, 'dispatcher', 'demo123');
    await captureScreenshot(dispatcherPage, '10_dispatcher_dashboard', 'Dispatch Center', 'Real-time coordination');

    await clickSidebarLink(dispatcherPage, 'leads');
    await captureScreenshot(dispatcherPage, '11_dispatcher_leads', 'Dispatcher Leads', 'Quick assignment');

    await clickSidebarLink(dispatcherPage, 'jobs');
    await captureScreenshot(dispatcherPage, '12_dispatcher_jobs', 'Job Scheduling', 'Status tracking');

    await clickSidebarLink(dispatcherPage, 'quotes');
    await captureScreenshot(dispatcherPage, '13_dispatcher_quotes', 'Quotes', 'Shareable links');

    await clickSidebarLink(dispatcherPage, 'map');
    await delay(2000);
    await captureScreenshot(dispatcherPage, '14_dispatcher_map', 'GPS Map', 'UNIQUE: Live technician tracking');

    await clickSidebarLink(dispatcherPage, 'staffing');
    await captureScreenshot(dispatcherPage, '15_dispatcher_staffing', 'Staffing Pool', 'Workload management');
    await dispatcherPage.close();

    // TECHNICIAN ROLE - new browser context
    console.log('\n--- TECHNICIAN ROLE ---');
    const techPage = await browser.newPage();
    await techPage.setViewport({ width: 1400, height: 900 });
    await login(techPage, 'mike', 'demo123');
    await captureScreenshot(techPage, '16_tech_dashboard', 'Technician Dashboard', 'Personal job queue');

    await clickSidebarLink(techPage, 'jobs');
    await captureScreenshot(techPage, '17_tech_jobs', 'My Jobs', 'Job claim functionality');

    await clickSidebarLink(techPage, 'quote');
    await delay(1500);
    await captureScreenshot(techPage, '18_tech_quote_builder', 'Quote Builder', 'UNIQUE: On-site quoting with pricebook');

    await clickSidebarLink(techPage, 'earnings');
    await captureScreenshot(techPage, '19_tech_earnings', 'Earnings', 'Personal tracking');
    await techPage.close();

    // SALESPERSON ROLE - new browser context
    console.log('\n--- SALESPERSON ROLE ---');
    const salesPage = await browser.newPage();
    await salesPage.setViewport({ width: 1400, height: 900 });
    await login(salesPage, 'sarah', 'demo123');
    await captureScreenshot(salesPage, '20_sales_dashboard', 'Sales Dashboard', 'UNIQUE: NET profit commission');

    await clickSidebarLink(salesPage, 'leads');
    await captureScreenshot(salesPage, '21_sales_leads', 'Sales Leads', 'Ownership tracking');

    await clickSidebarLink(salesPage, 'jobs');
    await captureScreenshot(salesPage, '22_sales_jobs', 'Sales Jobs', 'Commission attribution');

    await clickSidebarLink(salesPage, 'quotes');
    await captureScreenshot(salesPage, '23_sales_quotes', 'Sales Quotes', 'Quote management');

    await clickSidebarLink(salesPage, 'quote tool');
    await delay(1500);
    await captureScreenshot(salesPage, '24_sales_quote_tool', 'Quote Tool', 'Quick generation');
    await salesPage.close();

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  }

  await browser.close();

  // Generate HTML gallery
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSE CRM Screenshots</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111; color: #fff; margin: 0; padding: 20px; }
    h1 { text-align: center; color: #b22222; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; max-width: 1600px; margin: 0 auto; }
    .screenshot { background: #222; border-radius: 8px; overflow: hidden; }
    .screenshot img { width: 100%; height: auto; display: block; }
    .screenshot .info { padding: 15px; }
    .screenshot h3 { margin: 0 0 5px 0; color: #fff; }
    .screenshot p { margin: 0; color: #888; font-size: 14px; }
    .screenshot .unique { color: #b22222; font-weight: bold; font-size: 12px; margin-top: 5px; }
  </style>
</head>
<body>
  <h1>Chicago Sewer Experts CRM - Screenshot Gallery</h1>
  <div class="gallery">
    ${screenshots.map(s => `
    <div class="screenshot">
      <a href="${s.path}" target="_blank"><img src="${s.path}" alt="${s.name}" loading="lazy"></a>
      <div class="info">
        <h3>${s.name}</h3>
        <p>${s.description}</p>
        ${s.uniqueFeature ? `<p class="unique">${s.uniqueFeature}</p>` : ''}
      </div>
    </div>`).join('\n')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
  console.log(`\nGenerated gallery: ${path.join(OUTPUT_DIR, 'index.html')}`);
  console.log(`Total screenshots: ${screenshots.length}`);
}

main();
