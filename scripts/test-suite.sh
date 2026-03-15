#!/bin/bash

# Chicago Sewer Experts CRM - Standard Test Suite
# Run this after every change to verify system functionality

BASE_URL="${BASE_URL:-http://localhost:5000}"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  Chicago Sewer Experts CRM - Test Suite"
echo "  Base URL: $BASE_URL"
echo "  Started: $(date)"
echo "=================================================="
echo ""

# Test function
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local method="$3"
    local endpoint="$4"
    local data="$5"
    local auth="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$auth" ]; then
        curl_cmd="$curl_cmd -u '$auth'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # Execute and capture response
    local response=$(eval $curl_cmd 2>/dev/null)
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}[PASS]${NC} $test_name (HTTP $status_code)"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $test_name"
        echo "       Expected: HTTP $expected_status, Got: HTTP $status_code"
        echo "       Response: $(echo "$body" | head -c 100)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

# Test function for JSON content validation
run_test_contains() {
    local test_name="$1"
    local endpoint="$2"
    local expected_content="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    local response=$(curl -s "$BASE_URL$endpoint" 2>/dev/null)
    
    if echo "$response" | grep -q "$expected_content"; then
        echo -e "${GREEN}[PASS]${NC} $test_name"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $test_name"
        echo "       Expected to contain: $expected_content"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

echo "=== 1. Health & Core Endpoints ==="
run_test "Health check" 200 "GET" "/api/health"
run_test "Get analytics" 200 "GET" "/api/analytics"
run_test "Get export data" 200 "GET" "/api/export"
echo ""

echo "=== 2. Authentication ==="
run_test "Admin login" 200 "POST" "/api/auth/login" '{"username":"admin","password":"demo123"}'
run_test "Dispatcher login" 200 "POST" "/api/auth/login" '{"username":"dispatcher","password":"demo123"}'
run_test "Tech mike login" 200 "POST" "/api/auth/login" '{"username":"mike","password":"demo123"}'
run_test "Tech carlos login" 200 "POST" "/api/auth/login" '{"username":"carlos","password":"demo123"}'
run_test "Tech james login" 200 "POST" "/api/auth/login" '{"username":"james","password":"demo123"}'
run_test "Invalid login rejected" 401 "POST" "/api/auth/login" '{"username":"fake","password":"wrong"}'
echo ""

echo "=== 3. Leads API ==="
run_test "List leads" 200 "GET" "/api/leads"
run_test "Create lead" 201 "POST" "/api/leads" '{"customerName":"Test Lead","customerPhone":"555-TEST-001","source":"Direct","serviceType":"Drain Cleaning"}'
echo ""

echo "=== 4. Jobs API ==="
run_test "List jobs" 200 "GET" "/api/jobs"
run_test "Create job" 201 "POST" "/api/jobs" '{"customerName":"Test Job Customer","customerPhone":"555-JOB-0001","address":"123 Test St","serviceType":"Drain Cleaning"}'
echo ""

echo "=== 5. Technicians API ==="
run_test "List technicians" 200 "GET" "/api/technicians"
run_test "List available technicians" 200 "GET" "/api/technicians/available"
run_test_contains "Technician Mike exists" "/api/technicians" "Mike Johnson"
run_test_contains "Technician Carlos exists" "/api/technicians" "Carlos Rodriguez"
run_test_contains "Technician James exists" "/api/technicians" "James Williams"
echo ""

echo "=== 6. Quotes API ==="
run_test "List quotes" 200 "GET" "/api/quotes"
run_test "List quote templates" 200 "GET" "/api/quote-templates"
echo ""

echo "=== 7. Webhook Endpoints ==="
run_test "eLocal webhook" 200 "POST" "/api/webhooks/elocal" '{"customer_name":"eLocal Test","phone":"555-ELOCAL","service":"Drain Cleaning"}'
run_test "Networx webhook" 200 "POST" "/api/webhooks/networx" '{"name":"Networx Test","phone":"555-NETWORX","service_type":"Sewer"}'
run_test "Inquirly webhook" 200 "POST" "/api/webhooks/inquirly" '{"contact_name":"Inquirly Test","contact_phone":"555-INQUIRLY"}'
run_test "Zapier webhook" 200 "POST" "/api/webhooks/zapier/lead" '{"name":"Zapier Test","phone":"555-ZAPIER","service":"Testing"}'
echo ""

echo "=== 8. Webhook Logs ==="
run_test "Get webhook logs" 200 "GET" "/api/webhook-logs"
echo ""

echo "=== 9. Export Validation ==="
run_test_contains "Export has leads" "/api/export" '"leads":'
run_test_contains "Export has jobs" "/api/export" '"jobs":'
run_test_contains "Export has technicians" "/api/export" '"technicians":'
run_test_contains "Export has quotes" "/api/export" '"quotes":'
echo ""

echo "=================================================="
echo "  TEST RESULTS"
echo "=================================================="
echo -e "  Total:  $TOTAL_TESTS"
echo -e "  ${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "  ${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Review output above.${NC}"
    exit 1
fi
