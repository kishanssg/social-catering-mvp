# Run with: rails runner scripts/verify_admin_accounts.rb

puts "🔍 ADMIN ACCOUNT VERIFICATION"
puts "=" * 70
puts "Environment: #{Rails.env}"
puts "Date: #{Time.current.utc.strftime('%Y-%m-%d %H:%M:%S UTC')}"
puts "=" * 70

expected_accounts = {
  'natalie@socialcatering.com' => 'Natalie (Operations Manager)',
  'madison@socialcatering.com' => 'Madison (Operations Manager)',
  'sarah@socialcatering.com' => 'Sarah (Operations Manager)',
  'gravyadmin@socialcatering.com' => 'Test Account (System Admin)'
}

puts "\n📋 EXPECTED ACCOUNTS:"
puts "-" * 70

results = []

expected_accounts.each do |email, description|
  user = User.find_by(email: email)
  if user
    puts "✅ #{email}"
    puts "   Description: #{description}"
    puts "   ID: #{user.id}"
    puts "   Created: #{user.created_at.utc.strftime('%Y-%m-%d')}"
    puts "   Can login: #{user.encrypted_password.present? ? 'Yes' : 'No'}"
    puts ""
    results << { email: email, status: 'EXISTS', user_id: user.id }
  else
    puts "❌ #{email} - NOT FOUND"
    puts "   Description: #{description}"
    puts "   Status: MISSING"
    puts ""
    results << { email: email, status: 'MISSING', user_id: nil }
  end
end

puts "\n🔍 UNEXPECTED ACCOUNTS:"
puts "-" * 70

all_users = User.all
unexpected = all_users.reject { |u| expected_accounts.keys.include?(u.email) }

if unexpected.any?
  unexpected.each do |user|
    puts "⚠️  #{user.email}"
    puts "   ID: #{user.id}"
    puts "   Created: #{user.created_at.utc.strftime('%Y-%m-%d')}"
    puts ""
  end
else
  puts "✅ No unexpected accounts found"
  puts ""
end

puts "\n📊 SUMMARY:"
puts "-" * 70
puts "Total expected: #{expected_accounts.count}"
puts "Found: #{results.count { |r| r[:status] == 'EXISTS' }}"
puts "Missing: #{results.count { |r| r[:status] == 'MISSING' }}"
puts "Unexpected: #{unexpected.count}"
puts ""

if results.all? { |r| r[:status] == 'EXISTS' } && unexpected.empty?
  puts "✅ ALL CHECKS PASSED"
else
  puts "⚠️  ISSUES FOUND - Review above"
end

puts "=" * 70
