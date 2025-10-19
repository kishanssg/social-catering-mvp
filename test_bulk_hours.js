#!/usr/bin/env node

// Test script to verify bulk hours calculation logic
// This simulates the calculation logic from the BulkHoursModal component

function calculateTotal(entries) {
  return entries.reduce((sum, entry) => {
    const hours = parseFloat(entry.hours) || 0;
    const rate = parseFloat(entry.rate) || 0;
    return sum + (hours * rate);
  }, 0).toFixed(2);
}

// Test cases
const testCases = [
  {
    name: "All workers with same hours and rate",
    entries: [
      { hours: "6", rate: "25" },
      { hours: "6", rate: "25" },
      { hours: "6", rate: "25" }
    ],
    expected: "450.00"
  },
  {
    name: "Different hours and rates",
    entries: [
      { hours: "5.5", rate: "25" },
      { hours: "6", rate: "30" },
      { hours: "4", rate: "20" }
    ],
    expected: "397.50"
  },
  {
    name: "Mixed with zero values",
    entries: [
      { hours: "8", rate: "25" },
      { hours: "0", rate: "25" },
      { hours: "6", rate: "0" }
    ],
    expected: "200.00"
  },
  {
    name: "Empty entries",
    entries: [],
    expected: "0.00"
  },
  {
    name: "Invalid string values",
    entries: [
      { hours: "abc", rate: "25" },
      { hours: "6", rate: "xyz" }
    ],
    expected: "0.00"
  }
];

console.log("Testing Bulk Hours Calculation Logic");
console.log("=" * 50);

let allPassed = true;

testCases.forEach((testCase, index) => {
  const result = calculateTotal(testCase.entries);
  const passed = result === testCase.expected;
  
  if (!passed) {
    allPassed = false;
  }
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Entries: ${JSON.stringify(testCase.entries)}`);
  console.log(`  Expected: $${testCase.expected}`);
  console.log(`  Got: $${result}`);
  console.log(`  ${passed ? "✓ PASS" : "✗ FAIL"}`);
  console.log("");
});

console.log("=" * 50);
if (allPassed) {
  console.log("🎉 All tests passed! Bulk hours calculation logic is correct.");
} else {
  console.log("❌ Some tests failed. Check the logic above.");
}
