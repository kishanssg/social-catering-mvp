module PhoneNormalizable
  extend ActiveSupport::Concern

  included do
    before_validation :normalize_phone_number
  end

  # Format phone number for display (e.g., "3864568799" -> "386-456-8799")
  def phone_formatted
    return nil if phone.blank?
    
    digits = phone.to_s.gsub(/\D/, '')
    return phone if digits.length != 10
    
    "#{digits[0..2]}-#{digits[3..5]}-#{digits[6..9]}"
  end

  private

  def normalize_phone_number
    return if phone.blank?
    
    # Strip all non-numeric characters
    normalized = phone.to_s.gsub(/\D/, '')
    
    # Only keep if it's 10 digits (US phone number)
    if normalized.length == 10
      self.phone = normalized
    elsif normalized.length > 0
      # If it has digits but not exactly 10, keep as-is but strip non-digits
      # This allows for international numbers or partial entries
      self.phone = normalized
    end
  end
end

