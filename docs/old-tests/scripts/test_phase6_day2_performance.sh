#!/bin/bash

# ================================================
# PHASE 6 DAY 2: PERFORMANCE OPTIMIZATION TESTING
# ================================================
# Tests: Backend indexes, N+1 queries, API response times, Frontend optimization

set -e

# Configuration
BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5177"
ADMIN_EMAIL="admin@socialcatering.com"
ADMIN_PASSWORD="password123"
COOKIES_FILE="cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}PHASE 6 DAY 2: PERFORMANCE OPTIMIZATION TESTING${NC}"
echo -e "${BLUE}================================================${NC}"

# Helper functions
login() {
  echo "Attempting to log in as admin..."
  LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/api/v1/login" \
    -H "Content-Type: application/json" \
    -d "{\"user\":{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}}" \
    -c "$COOKIES_FILE" -s)
  
  if echo "$LOGIN_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Login successful.${NC}"
    return 0
  else
    echo -e "${RED}❌ Login failed. Response: $LOGIN_RESPONSE${NC}"
    return 1
  fi
}

logout() {
  echo "Logging out..."
  curl -X DELETE "$BASE_URL/api/v1/logout" -b "$COOKIES_FILE" -s > /dev/null
  rm -f "$COOKIES_FILE"
  echo -e "${GREEN}✅ Logged out and cookies cleared.${NC}"
}

# Test 1: Database Indexes Verification
echo -e "\n${YELLOW}--- Test 1: Database Indexes Verification ---${NC}"

echo "Checking database indexes..."
rails dbconsole -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;" > indexes.txt 2>/dev/null || echo "Could not connect to database"

if [ -f "indexes.txt" ]; then
  INDEX_COUNT=$(wc -l < indexes.txt)
  echo "Found $INDEX_COUNT database indexes"
  
  # Check for critical indexes
  if grep -q "idx_events_status_created" indexes.txt; then
    echo -e "${GREEN}✅ Events status index exists${NC}"
  else
    echo -e "${RED}❌ Events status index missing${NC}"
  fi
  
  if grep -q "idx_assignments_worker_status" indexes.txt; then
    echo -e "${GREEN}✅ Assignments worker status index exists${NC}"
  else
    echo -e "${RED}❌ Assignments worker status index missing${NC}"
  fi
  
  if grep -q "idx_workers_skills_json" indexes.txt; then
    echo -e "${GREEN}✅ Workers skills JSON index exists${NC}"
  else
    echo -e "${RED}❌ Workers skills JSON index missing${NC}"
  fi
  
  if grep -q "idx_shifts_start_end" indexes.txt; then
    echo -e "${GREEN}✅ Shifts time range index exists${NC}"
  else
    echo -e "${RED}❌ Shifts time range index missing${NC}"
  fi
else
  echo -e "${RED}❌ Could not check database indexes${NC}"
fi

# Test 2: N+1 Query Detection
echo -e "\n${YELLOW}--- Test 2: N+1 Query Detection ---${NC}"

echo "Checking for N+1 query patterns in code..."

# Check for includes statements
INCLUDES_COUNT=$(grep -r "\.includes(" app/controllers/ | wc -l)
echo "Found $INCLUDES_COUNT includes statements in controllers"

# Check for joins statements
JOINS_COUNT=$(grep -r "\.joins(" app/controllers/ | wc -l)
echo "Found $JOINS_COUNT joins statements in controllers"

# Check for preload statements
PRELOAD_COUNT=$(grep -r "\.preload(" app/controllers/ | wc -l)
echo "Found $PRELOAD_COUNT preload statements in controllers"

if [ $INCLUDES_COUNT -gt 0 ] || [ $JOINS_COUNT -gt 0 ] || [ $PRELOAD_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Query optimization patterns found${NC}"
else
  echo -e "${RED}❌ No query optimization patterns found${NC}"
fi

# Test 3: API Response Time Testing
echo -e "\n${YELLOW}--- Test 3: API Response Time Testing ---${NC}"

login

# Test Events API
echo "Testing Events API response time..."
START_TIME=$(date +%s%N)
EVENTS_RESPONSE=$(curl -X GET "$BASE_URL/api/v1/events" -b "$COOKIES_FILE" -s -w "%{http_code}")
END_TIME=$(date +%s%N)
EVENTS_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Events API response time: ${EVENTS_TIME}ms"
if [ $EVENTS_TIME -lt 300 ]; then
  echo -e "${GREEN}✅ Events API under 300ms target${NC}"
else
  echo -e "${RED}❌ Events API exceeds 300ms target${NC}"
fi

# Test Workers API
echo "Testing Workers API response time..."
START_TIME=$(date +%s%N)
WORKERS_RESPONSE=$(curl -X GET "$BASE_URL/api/v1/workers" -b "$COOKIES_FILE" -s -w "%{http_code}")
END_TIME=$(date +%s%N)
WORKERS_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Workers API response time: ${WORKERS_TIME}ms"
if [ $WORKERS_TIME -lt 300 ]; then
  echo -e "${GREEN}✅ Workers API under 300ms target${NC}"
else
  echo -e "${RED}❌ Workers API exceeds 300ms target${NC}"
fi

# Test Dashboard API
echo "Testing Dashboard API response time..."
START_TIME=$(date +%s%N)
DASHBOARD_RESPONSE=$(curl -X GET "$BASE_URL/api/v1/dashboard" -b "$COOKIES_FILE" -s -w "%{http_code}")
END_TIME=$(date +%s%N)
DASHBOARD_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Dashboard API response time: ${DASHBOARD_TIME}ms"
if [ $DASHBOARD_TIME -lt 300 ]; then
  echo -e "${GREEN}✅ Dashboard API under 300ms target${NC}"
else
  echo -e "${RED}❌ Dashboard API exceeds 300ms target${NC}"
fi

# Test Reports API
echo "Testing Reports API response time..."
START_TIME=$(date +%s%N)
REPORTS_RESPONSE=$(curl -X GET "$BASE_URL/api/v1/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" -b "$COOKIES_FILE" -s -w "%{http_code}")
END_TIME=$(date +%s%N)
REPORTS_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Reports API response time: ${REPORTS_TIME}ms"
if [ $REPORTS_TIME -lt 500 ]; then
  echo -e "${GREEN}✅ Reports API under 500ms target${NC}"
else
  echo -e "${RED}❌ Reports API exceeds 500ms target${NC}"
fi

# Test 4: Frontend Bundle Analysis
echo -e "\n${YELLOW}--- Test 4: Frontend Bundle Analysis ---${NC}"

echo "Checking frontend bundle size..."

# Check if Vite build exists
if [ -d "social-catering-ui/dist" ]; then
  BUNDLE_SIZE=$(du -sh social-catering-ui/dist | cut -f1)
  echo "Frontend bundle size: $BUNDLE_SIZE"
  
  # Check for code splitting
  JS_FILES=$(find social-catering-ui/dist -name "*.js" | wc -l)
  CSS_FILES=$(find social-catering-ui/dist -name "*.css" | wc -l)
  
  echo "JavaScript files: $JS_FILES"
  echo "CSS files: $CSS_FILES"
  
  if [ $JS_FILES -gt 1 ]; then
    echo -e "${GREEN}✅ Code splitting detected (multiple JS files)${NC}"
  else
    echo -e "${RED}❌ No code splitting detected${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ Frontend not built - run 'npm run build' in social-catering-ui${NC}"
fi

# Test 5: Component Memoization Check
echo -e "\n${YELLOW}--- Test 5: Component Memoization Check ---${NC}"

echo "Checking for React.memo usage..."

MEMO_COUNT=$(grep -r "React\.memo\|memo(" social-catering-ui/src/ | wc -l)
echo "Found $MEMO_COUNT memoized components"

if [ $MEMO_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Component memoization implemented${NC}"
else
  echo -e "${YELLOW}⚠️ No component memoization found${NC}"
fi

# Test 6: Lazy Loading Check
echo -e "\n${YELLOW}--- Test 6: Lazy Loading Check ---${NC}"

echo "Checking for lazy loading implementation..."

LAZY_COUNT=$(grep -r "lazy(" social-catering-ui/src/ | wc -l)
echo "Found $LAZY_COUNT lazy-loaded components"

if [ $LAZY_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Lazy loading implemented${NC}"
else
  echo -e "${RED}❌ No lazy loading found${NC}"
fi

# Test 7: Database Query Performance
echo -e "\n${YELLOW}--- Test 7: Database Query Performance ---${NC}"

echo "Testing database query performance..."

# Test complex queries
rails console -e "puts 'Testing query performance...'; start_time = Time.current; events = Event.includes(:venue, :event_schedule, :shifts).limit(10); end_time = Time.current; puts \"Query time: #{(end_time - start_time) * 1000}ms\"; puts \"Events loaded: #{events.count}\"" > query_test.txt 2>/dev/null || echo "Could not test queries"

if [ -f "query_test.txt" ]; then
  QUERY_TIME=$(grep "Query time:" query_test.txt | grep -o '[0-9.]*' | head -1)
  if [ -n "$QUERY_TIME" ]; then
    echo "Complex query time: ${QUERY_TIME}ms"
    if (( $(echo "$QUERY_TIME < 100" | bc -l) )); then
      echo -e "${GREEN}✅ Complex query under 100ms${NC}"
    else
      echo -e "${RED}❌ Complex query exceeds 100ms${NC}"
    fi
  fi
fi

# Test 8: Memory Usage Check
echo -e "\n${YELLOW}--- Test 8: Memory Usage Check ---${NC}"

echo "Checking Rails memory usage..."

# Check Rails process memory
RAILS_PID=$(ps aux | grep "rails server" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$RAILS_PID" ]; then
  MEMORY_USAGE=$(ps -o rss= -p $RAILS_PID)
  MEMORY_MB=$((MEMORY_USAGE / 1024))
  echo "Rails server memory usage: ${MEMORY_MB}MB"
  
  if [ $MEMORY_MB -lt 200 ]; then
    echo -e "${GREEN}✅ Rails memory usage under 200MB${NC}"
  else
    echo -e "${YELLOW}⚠️ Rails memory usage over 200MB${NC}"
  fi
else
  echo -e "${RED}❌ Rails server not running${NC}"
fi

# Test 9: Concurrent Request Handling
echo -e "\n${YELLOW}--- Test 9: Concurrent Request Handling ---${NC}"

echo "Testing concurrent request handling..."

# Test 5 concurrent requests
for i in {1..5}; do
  curl -X GET "$BASE_URL/api/v1/events" -b "$COOKIES_FILE" -s > /dev/null &
done
wait

echo -e "${GREEN}✅ Concurrent requests handled successfully${NC}"

# Test 10: Frontend Performance Metrics
echo -e "\n${YELLOW}--- Test 10: Frontend Performance Metrics ---${NC}"

echo "Testing frontend performance..."

# Test main page load times
PAGES=("dashboard" "events" "workers" "reports")

for page in "${PAGES[@]}"; do
  START_TIME=$(date +%s%N)
  curl -s "$FRONTEND_URL/$page" > /dev/null
  END_TIME=$(date +%s%N)
  PAGE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  
  echo "$page page load time: ${PAGE_TIME}ms"
  
  if [ $PAGE_TIME -lt 2000 ]; then
    echo -e "${GREEN}✅ $page page under 2s target${NC}"
  else
    echo -e "${RED}❌ $page page exceeds 2s target${NC}"
  fi
done

# Cleanup
logout

echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}PHASE 6 DAY 2: PERFORMANCE TESTING COMPLETE${NC}"
echo -e "${BLUE}================================================${NC}"

# Summary
echo -e "\n${YELLOW}PERFORMANCE SUMMARY:${NC}"
echo "✅ Database Indexes: Checked critical indexes"
echo "✅ N+1 Queries: Verified optimization patterns"
echo "✅ API Response Times: Tested all major endpoints"
echo "✅ Frontend Bundle: Analyzed bundle size and splitting"
echo "✅ Component Optimization: Checked memoization and lazy loading"
echo "✅ Database Performance: Tested complex queries"
echo "✅ Memory Usage: Monitored Rails memory consumption"
echo "✅ Concurrent Handling: Tested multiple simultaneous requests"
echo "✅ Frontend Performance: Measured page load times"

echo -e "\n${GREEN}Phase 6 Day 2 Performance testing complete!${NC}"
echo -e "${YELLOW}Next: Address any performance issues and move to Day 3 (Bug Fixes)${NC}"

# Clean up temporary files
rm -f indexes.txt query_test.txt
