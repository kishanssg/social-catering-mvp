namespace :certs do
  desc "Normalize certifications on staging: ensure global list and map shift requirements by name to certification_id"
  task normalize: :environment do
    wanted = [
      "Food Handler Certificate",
      "Alcohol Server License",
      "ServSafe",
      "TIPS Certification",
      "Food Safety Manager"
    ]

    puts "Ensuring global certifications exist..."
    name_to_id = {}
    wanted.each do |name|
      cert = Certification.find_or_create_by!(name: name)
      name_to_id[name] = cert.id
    end
    puts "Catalog: #{name_to_id}"

    puts "Mapping shift requirements to certification_id where possible..."
    Shift.find_each do |s|
      if s.respond_to?(:required_cert_id) && s.required_cert_id.blank? && s.respond_to?(:skill_requirement) && s.skill_requirement&.certification_name.present?
        cid = name_to_id[s.skill_requirement.certification_name]
        next unless cid
        s.update_column(:required_cert_id, cid)
      end
    end

    puts "Done."
  end
end
