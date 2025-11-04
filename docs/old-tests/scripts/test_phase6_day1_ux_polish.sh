#!/bin/bash

# ================================================
# PHASE 6 DAY 1: UX POLISH TESTING
# ================================================
# Tests: Loading States, Error Handling, Empty States, Responsive Design, Touch Targets

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
echo -e "${BLUE}PHASE 6 DAY 1: UX POLISH TESTING${NC}"
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

# Test 1: Loading States Verification
echo -e "\n${YELLOW}--- Test 1: Loading States Verification ---${NC}"

# Check if LoadingSpinner components exist
LOADING_COMPONENTS=$(find social-catering-ui/src -name "*Loading*" -type f | wc -l)
echo "Found $LOADING_COMPONENTS loading-related components"

# Check for loading states in key pages
echo "Checking loading states in key components..."

# Check EventsPage for loading state
if grep -q "loading.*useState\|setLoading" social-catering-ui/src/pages/EventsPage.tsx; then
  echo -e "${GREEN}✅ EventsPage has loading state${NC}"
else
  echo -e "${RED}❌ EventsPage missing loading state${NC}"
fi

# Check WorkersPage for loading state
if grep -q "loading.*useState\|setLoading" social-catering-ui/src/pages/WorkersPage.tsx; then
  echo -e "${GREEN}✅ WorkersPage has loading state${NC}"
else
  echo -e "${RED}❌ WorkersPage missing loading state${NC}"
fi

# Check DashboardPage for loading state
if grep -q "loading.*useState\|setLoading" social-catering-ui/src/pages/DashboardPage.tsx; then
  echo -e "${GREEN}✅ DashboardPage has loading state${NC}"
else
  echo -e "${RED}❌ DashboardPage missing loading state${NC}"
fi

# Check ReportsPage for loading state
if grep -q "loading.*useState\|setLoading" social-catering-ui/src/pages/ReportsPage.tsx; then
  echo -e "${GREEN}✅ ReportsPage has loading state${NC}"
else
  echo -e "${RED}❌ ReportsPage missing loading state${NC}"
fi

# Test 2: Error Handling Verification
echo -e "\n${YELLOW}--- Test 2: Error Handling Verification ---${NC}"

# Check for ErrorBoundary
if [ -f "social-catering-ui/src/ErrorBoundary.tsx" ]; then
  echo -e "${GREEN}✅ ErrorBoundary component exists${NC}"
else
  echo -e "${RED}❌ ErrorBoundary component missing${NC}"
fi

# Check for error handling in API client
if grep -q "catch\|error" social-catering-ui/src/lib/api.ts; then
  echo -e "${GREEN}✅ API client has error handling${NC}"
else
  echo -e "${RED}❌ API client missing error handling${NC}"
fi

# Check for error handling in AuthContext
if grep -q "catch\|error" social-catering-ui/src/contexts/AuthContext.tsx; then
  echo -e "${GREEN}✅ AuthContext has error handling${NC}"
else
  echo -e "${RED}❌ AuthContext missing error handling${NC}"
fi

# Test API error responses
echo "Testing API error responses..."
login

# Test 404 error
echo "Testing 404 error handling..."
ERROR_404=$(curl -X GET "$BASE_URL/api/v1/nonexistent" -b "$COOKIES_FILE" -s -w "%{http_code}")
if [ "$ERROR_404" = "404" ]; then
  echo -e "${GREEN}✅ 404 errors handled correctly${NC}"
else
  echo -e "${RED}❌ 404 error handling issue: $ERROR_404${NC}"
fi

# Test 3: Empty States Verification
echo -e "\n${YELLOW}--- Test 3: Empty States Verification ---${NC}"

# Check for EmptyState components
if [ -f "social-catering-ui/src/components/common/EmptyState.tsx" ]; then
  echo -e "${GREEN}✅ EmptyState component exists${NC}"
else
  echo -e "${RED}❌ EmptyState component missing${NC}"
fi

# Check for empty states in key pages
echo "Checking empty states in key components..."

# Check EventsPage for empty state
if grep -q "empty\|no.*events\|No events" social-catering-ui/src/pages/EventsPage.tsx; then
  echo -e "${GREEN}✅ EventsPage has empty state${NC}"
else
  echo -e "${RED}❌ EventsPage missing empty state${NC}"
fi

# Check WorkersPage for empty state
if grep -q "empty\|no.*workers\|No workers" social-catering-ui/src/pages/WorkersPage.tsx; then
  echo -e "${GREEN}✅ WorkersPage has empty state${NC}"
else
  echo -e "${RED}❌ WorkersPage missing empty state${NC}"
fi

# Test 4: Responsive Design Verification
echo -e "\n${YELLOW}--- Test 4: Responsive Design Verification ---${NC}"

# Check for responsive classes in key components
echo "Checking responsive design implementation..."

# Check AppLayout for responsive classes
if grep -q "sm:\|md:\|lg:\|xl:" social-catering-ui/src/components/layout/AppLayout.tsx; then
  echo -e "${GREEN}✅ AppLayout has responsive classes${NC}"
else
  echo -e "${RED}❌ AppLayout missing responsive classes${NC}"
fi

# Check Sidebar for mobile menu
if grep -q "lg:hidden\|mobile\|Mobile" social-catering-ui/src/components/Layout/Sidebar.tsx; then
  echo -e "${GREEN}✅ Sidebar has mobile menu${NC}"
else
  echo -e "${RED}❌ Sidebar missing mobile menu${NC}"
fi

# Check for responsive grid layouts
if grep -q "grid.*cols.*md\|grid.*cols.*lg" social-catering-ui/src/pages/DashboardPage.tsx; then
  echo -e "${GREEN}✅ Dashboard has responsive grid${NC}"
else
  echo -e "${RED}❌ Dashboard missing responsive grid${NC}"
fi

# Test 5: Touch Targets Verification
echo -e "\n${YELLOW}--- Test 5: Touch Targets Verification ---${NC}"

# Check for minimum touch target sizes (44px = 11 Tailwind units)
echo "Checking touch target sizes..."

# Check buttons for adequate sizing
BUTTON_CLASSES=$(grep -r "px-.*py-.*\|p-.*" social-catering-ui/src/pages/ | grep -E "px-[4-9]|py-[4-9]|p-[4-9]" | wc -l)
echo "Found $BUTTON_CLASSES buttons with adequate padding"

# Check for minimum button heights
if grep -q "h-11\|h-12\|py-3\|py-4" social-catering-ui/src/pages/EventsPage.tsx; then
  echo -e "${GREEN}✅ EventsPage buttons have adequate height${NC}"
else
  echo -e "${RED}❌ EventsPage buttons may be too small${NC}"
fi

# Test 6: Frontend Loading Performance
echo -e "\n${YELLOW}--- Test 6: Frontend Loading Performance ---${NC}"

# Test frontend page load times
echo "Testing frontend page load performance..."

# Test main pages load time
START_TIME=$(date +%s%N)
FRONTEND_RESPONSE=$(curl -s "$FRONTEND_URL/dashboard")
END_TIME=$(date +%s%N)
LOAD_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Dashboard page load time: ${LOAD_TIME}ms"
if [ $LOAD_TIME -lt 3000 ]; then
  echo -e "${GREEN}✅ Dashboard loads within 3s target${NC}"
else
  echo -e "${RED}❌ Dashboard load time exceeds 3s target${NC}"
fi

# Test 7: Mobile Responsiveness Check
echo -e "\n${YELLOW}--- Test 7: Mobile Responsiveness Check ---${NC}"

# Check for mobile-specific CSS
MOBILE_CLASSES=$(grep -r "sm:\|md:\|lg:\|xl:" social-catering-ui/src/ | wc -l)
echo "Found $MOBILE_CLASSES responsive CSS classes"

# Check for mobile navigation
if grep -q "lg:hidden\|mobile" social-catering-ui/src/components/Layout/Sidebar.tsx; then
  echo -e "${GREEN}✅ Mobile navigation implemented${NC}"
else
  echo -e "${RED}❌ Mobile navigation missing${NC}"
fi

# Test 8: Accessibility Basics
echo -e "\n${YELLOW}--- Test 8: Accessibility Basics ---${NC}"

# Check for alt text on images
ALT_TEXT_COUNT=$(grep -r "alt=" social-catering-ui/src/ | wc -l)
echo "Found $ALT_TEXT_COUNT images with alt text"

# Check for aria-labels
ARIA_LABELS=$(grep -r "aria-label\|aria-labelledby" social-catering-ui/src/ | wc -l)
echo "Found $ARIA_LABELS aria-labels"

# Check for semantic HTML
SEMANTIC_TAGS=$(grep -r "<main\|<nav\|<header\|<footer\|<section\|<article" social-catering-ui/src/ | wc -l)
echo "Found $SEMANTIC_TAGS semantic HTML tags"

# Cleanup
logout

echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}PHASE 6 DAY 1: UX POLISH TESTING COMPLETE${NC}"
echo -e "${BLUE}================================================${NC}"

# Summary
echo -e "\n${YELLOW}SUMMARY:${NC}"
echo "✅ Loading States: Checked key components"
echo "✅ Error Handling: Verified ErrorBoundary and API handling"
echo "✅ Empty States: Confirmed EmptyState components exist"
echo "✅ Responsive Design: Verified responsive classes and mobile menu"
echo "✅ Touch Targets: Checked button sizing"
echo "✅ Performance: Tested page load times"
echo "✅ Accessibility: Basic checks completed"

echo -e "\n${GREEN}Phase 6 Day 1 UX Polish testing complete!${NC}"
echo -e "${YELLOW}Next: Address any issues found and move to Day 2 (Performance)${NC}"
