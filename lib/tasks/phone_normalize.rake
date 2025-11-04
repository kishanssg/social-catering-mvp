# lib/tasks/phone_normalize.rake
namespace :phones do
  desc "Normalize all worker phone numbers to digits-only (10-15 digits)"
  task normalize: :environment do
    puts "Normalizing phone numbers..."
    count = 0
    invalid = 0
    Worker.find_each do |w|
      next if w.phone.blank?
      normalized = w.phone.to_s.gsub(/\D/, '')
      if normalized != w.phone
        w.update_columns(phone: normalized)
        count += 1
      end
      invalid += 1 unless normalized.length.between?(10, 15)
    end
    puts "Updated #{count} workers. Invalid-length phones remaining: #{invalid}."
  end
end
