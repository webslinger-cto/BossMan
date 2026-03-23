import type { Express } from "express";
import path from "path";

export function registerSEORoutes(app: Express) {
  // SEO Landing Pages - serve static HTML files
  const seoPages = [
    '/missed-call-text-back-contractors',
    '/contractor-revenue-calculator',
    '/blog/contractor-business-growth-guide'
  ];

  seoPages.forEach(route => {
    app.get(route, (req, res) => {
      const fileName = route === '/missed-call-text-back-contractors' 
        ? 'missed-call-text-back-contractors.html'
        : route === '/contractor-revenue-calculator'
        ? 'contractor-revenue-calculator.html'
        : route === '/blog/contractor-business-growth-guide'
        ? 'blog/contractor-business-growth-guide.html'
        : 'index.html';
        
      const filePath = path.resolve(__dirname, 'public', fileName);
      res.sendFile(filePath);
    });
  });

  // SEO sitemap
  app.get('/sitemap.xml', (req, res) => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://grantsmaster.onrender.com/</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://grantsmaster.onrender.com/missed-call-text-back-contractors</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://grantsmaster.onrender.com/contractor-revenue-calculator</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://grantsmaster.onrender.com/blog/contractor-business-growth-guide</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://grantsmaster.onrender.com/sms-opt-in</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://grantsmaster.onrender.com/pricing</loc>
    <lastmod>2026-03-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // SEO robots.txt
  app.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /
Allow: /missed-call-text-back-contractors
Allow: /contractor-revenue-calculator
Allow: /blog/
Allow: /sms-opt-in
Allow: /pricing

Disallow: /api/
Disallow: /admin/
Disallow: /login

Sitemap: https://grantsmaster.onrender.com/sitemap.xml`;
    
    res.set('Content-Type', 'text/plain');
    res.send(robots);
  });
}