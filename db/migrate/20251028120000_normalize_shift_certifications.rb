class NormalizeShiftCertifications < ActiveRecord::Migration[7.0]
  def up
    say_with_time "Normalizing shifts to required_cert_id" do
      Shift.reset_column_information
      Shift.find_each(batch_size: 500) do |shift|
        next if shift.required_cert_id.present?
        # Map any known text-based location of certification names to ID
        name = nil
        if shift.respond_to?(:certification_name)
          name = shift.read_attribute(:certification_name)
        end
        if name.blank? && shift.respond_to?(:skill_requirement) && shift.skill_requirement&.respond_to?(:certification_name)
          name = shift.skill_requirement.certification_name
        end
        next if name.blank?
        cert = Certification.find_by(name: name)
        shift.update_column(:required_cert_id, cert.id) if cert
      end
    end
  end

  def down
    # no-op
  end
end


