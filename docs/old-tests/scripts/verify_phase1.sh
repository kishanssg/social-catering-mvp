#!/bin/bash
echo "================================"
echo "PHASE 1 VERIFICATION COMPLETE"
echo "================================"

# Check database
echo "\n1. Checking database..."
rails runner "
  puts 'Workers: ' + Worker.count.to_s + ' (expected: 25)'
  puts 'Events: ' + Event.count.to_s + ' (expected: 10-15)'
  puts 'Venues: ' + Venue.count.to_s + ' (expected: 10)'
  puts 'Shifts: ' + Shift.count.to_s + ' (expected: 20+)'
  puts 'Assignments: ' + Assignment.count.to_s + ' (expected: 10+)'
"

# Check servers
echo "\n2. Checking servers..."
if lsof -ti:3000 > /dev/null; then
  echo "✅ Backend server running (port 3000)"
else
  echo "❌ Backend server not running"
fi

if lsof -ti:5173 > /dev/null; then
  echo "✅ Frontend server running (port 5173)"
else
  echo "❌ Frontend server not running"
fi

echo "\n================================"
echo "Phase 1 verification complete!"
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:3000"
echo "================================"
