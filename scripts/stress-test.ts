/**
 * Stress Test Script for Chicago Sewer Experts CRM
 * Tests system performance under concurrent user load
 */

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface StressTestReport {
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
}

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - start;
    
    // For webhook endpoints, 201 is also success
    const successStatuses = [200, 201];
    
    return {
      endpoint,
      method,
      status: response.status,
      duration,
      success: successStatuses.includes(response.status),
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      endpoint,
      method,
      status: 0,
      duration,
      success: false,
      error: (error as Error).message,
    };
  }
}

function generateLeadData(index: number) {
  const sources = ['zapier', 'elocal', 'networx', 'angi', 'thumbtack', 'inquirly'];
  const services = ['Sewer Line Repair', 'Drain Cleaning', 'Sewer Inspection', 'Water Heater', 'Emergency Plumbing'];
  
  return {
    customerName: `Load Test Customer ${index}-${Date.now()}`,
    phone: `312-555-${String(1000 + index).slice(-4)}`,
    email: `loadtest${index}_${Date.now()}@example.com`,
    address: `${1000 + index} Test Street, Chicago, IL 606${String(10 + (index % 90)).slice(-2)}`,
    source: sources[index % sources.length],
    serviceType: services[index % services.length],
    notes: `Load test lead #${index}`,
    status: 'new',
  };
}

async function simulateUserWorkload(userId: number): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Each user performs a mix of read and write operations
  // Simulating realistic CRM usage patterns

  // 1. Health check
  results.push(await makeRequest('/api/health'));

  // 2. View leads list
  results.push(await makeRequest('/api/leads'));

  // 3. View jobs list
  results.push(await makeRequest('/api/jobs'));

  // 4. View technicians
  results.push(await makeRequest('/api/technicians'));

  // 5. View quotes
  results.push(await makeRequest('/api/quotes'));

  // 6. Create a new lead via webhook (simulating incoming lead)
  const webhookLead = generateLeadData(userId);
  results.push(await makeRequest('/api/webhooks/zapier', 'POST', webhookLead));

  // 7. Additional reads to simulate browsing
  results.push(await makeRequest('/api/leads'));
  results.push(await makeRequest('/api/jobs'));

  return results;
}

function calculateP95(durations: number[]): number {
  if (durations.length === 0) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(index, sorted.length - 1)];
}

async function runStressTest(concurrentUsers: number): Promise<StressTestReport> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STRESS TEST: ${concurrentUsers} CONCURRENT USERS`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Run all user workloads concurrently
  const userPromises: Promise<TestResult[]>[] = [];
  for (let i = 0; i < concurrentUsers; i++) {
    userPromises.push(simulateUserWorkload(i));
  }

  const allResults = await Promise.all(userPromises);
  const results = allResults.flat();
  const totalDuration = Date.now() - startTime;

  // Calculate statistics
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const durations = results.map(r => r.duration).filter(d => d > 0);
  const avgResponseTime = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const maxResponseTime = durations.length > 0 ? Math.max(...durations) : 0;
  const minResponseTime = durations.length > 0 ? Math.min(...durations) : 0;
  const p95ResponseTime = calculateP95(durations);
  const requestsPerSecond = results.length / (totalDuration / 1000);

  const report: StressTestReport = {
    concurrentUsers,
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    avgResponseTime: Math.round(avgResponseTime),
    maxResponseTime,
    minResponseTime,
    p95ResponseTime,
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    totalDuration,
  };

  // Print results
  const successRate = ((successfulRequests / results.length) * 100).toFixed(1);
  console.log(`\nRESULTS:`);
  console.log(`  Total Requests:     ${report.totalRequests}`);
  console.log(`  Successful:         ${report.successfulRequests} (${successRate}%)`);
  console.log(`  Failed:             ${report.failedRequests}`);
  console.log(`  Avg Response Time:  ${report.avgResponseTime}ms`);
  console.log(`  Min Response Time:  ${report.minResponseTime}ms`);
  console.log(`  Max Response Time:  ${report.maxResponseTime}ms`);
  console.log(`  P95 Response Time:  ${report.p95ResponseTime}ms`);
  console.log(`  Requests/Second:    ${report.requestsPerSecond}`);
  console.log(`  Total Duration:     ${report.totalDuration}ms`);

  // Breakdown by endpoint
  const endpointStats = new Map<string, { success: number; fail: number; totalTime: number }>();
  results.forEach(r => {
    const key = `${r.method} ${r.endpoint}`;
    const stat = endpointStats.get(key) || { success: 0, fail: 0, totalTime: 0 };
    if (r.success) stat.success++;
    else stat.fail++;
    stat.totalTime += r.duration;
    endpointStats.set(key, stat);
  });

  console.log(`\nENDPOINT BREAKDOWN:`);
  endpointStats.forEach((stat, endpoint) => {
    const total = stat.success + stat.fail;
    const avgTime = Math.round(stat.totalTime / total);
    const rate = ((stat.success / total) * 100).toFixed(0);
    console.log(`  ${endpoint}: ${stat.success}/${total} (${rate}%) avg ${avgTime}ms`);
  });

  // Show failures if any
  if (failedRequests > 0) {
    console.log(`\nFAILURES:`);
    const failures = results.filter(r => !r.success);
    const uniqueFailures = new Map<string, number>();
    failures.forEach(f => {
      const key = `${f.method} ${f.endpoint}: ${f.error || `HTTP ${f.status}`}`;
      uniqueFailures.set(key, (uniqueFailures.get(key) || 0) + 1);
    });
    uniqueFailures.forEach((count, msg) => {
      console.log(`  ${msg} (x${count})`);
    });
  }

  return report;
}

async function main() {
  console.log('Chicago Sewer Experts CRM - Stress Test Suite');
  console.log('='.repeat(60));
  console.log(`Server: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');
  console.log('Test Pattern: Each user performs 8 operations');
  console.log('  - 6 GET requests (leads, jobs, technicians, quotes, health)');
  console.log('  - 1 POST request (create lead via Zapier webhook)');
  console.log('  - 1 additional GET (simulating navigation)');

  // Warm up
  console.log('\nWarming up...');
  await makeRequest('/api/health');
  await makeRequest('/api/leads');
  console.log('Server ready.\n');

  const reports: StressTestReport[] = [];

  // Run stress tests with increasing load
  for (const userCount of [10, 15, 20]) {
    reports.push(await runStressTest(userCount));
    // Cool down between tests
    await new Promise(r => setTimeout(r, 1500));
  }

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('STRESS TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log('| Users | Requests | Success | Avg Time | P95 Time | Max Time | RPS    |');
  console.log('|-------|----------|---------|----------|----------|----------|--------|');
  
  reports.forEach(r => {
    const successRate = ((r.successfulRequests / r.totalRequests) * 100).toFixed(0) + '%';
    console.log(
      `| ${String(r.concurrentUsers).padStart(5)} | ${String(r.totalRequests).padStart(8)} | ${successRate.padStart(7)} | ${String(r.avgResponseTime + 'ms').padStart(8)} | ${String(r.p95ResponseTime + 'ms').padStart(8)} | ${String(r.maxResponseTime + 'ms').padStart(8)} | ${String(r.requestsPerSecond).padStart(6)} |`
    );
  });

  // Performance Analysis
  console.log('\n' + '='.repeat(70));
  console.log('PERFORMANCE ANALYSIS');
  console.log('='.repeat(70));
  
  const allPassed = reports.every(r => (r.successfulRequests / r.totalRequests) >= 0.95);
  const goodPerformance = reports.every(r => r.avgResponseTime < 200 && r.p95ResponseTime < 500);
  
  if (allPassed && goodPerformance) {
    console.log('\nOVERALL: EXCELLENT');
    console.log('  - All tests passed with >95% success rate');
    console.log('  - Response times within acceptable thresholds');
    console.log('  - System handles concurrent load efficiently');
  } else if (allPassed) {
    console.log('\nOVERALL: GOOD');
    console.log('  - All tests passed with >95% success rate');
    console.log('  - Response times may increase under heavy load');
  } else {
    console.log('\nOVERALL: NEEDS ATTENTION');
    console.log('  - Some requests failed under load');
    console.log('  - Review endpoint performance and error handling');
  }

  // Scaling recommendation
  const lastReport = reports[reports.length - 1];
  const estimatedMaxUsers = Math.floor(20 * (1000 / lastReport.avgResponseTime));
  console.log(`\nEstimated capacity: ~${estimatedMaxUsers} concurrent users at current performance`);
  
  console.log('='.repeat(70));
}

main().catch(console.error);
