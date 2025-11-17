class AddRequiredCertificationToEventSkillRequirements < ActiveRecord::Migration[7.1]
  def up
    add_reference :event_skill_requirements,
                  :required_certification,
                  foreign_key: { to_table: :certifications },
                  null: true

    execute <<~SQL.squish
      UPDATE event_skill_requirements esr
      SET required_certification_id = cert.id
      FROM certifications cert
      WHERE esr.certification_name IS NOT NULL
        AND LOWER(cert.name) = LOWER(esr.certification_name)
        AND esr.required_certification_id IS NULL
    SQL
  end

  def down
    remove_reference :event_skill_requirements, :required_certification, foreign_key: true
  end
end

