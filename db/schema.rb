# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2025_10_20_121023) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "activity_logs", force: :cascade do |t|
    t.bigint "actor_user_id"
    t.string "entity_type", null: false
    t.bigint "entity_id", null: false
    t.string "action", null: false
    t.jsonb "before_json"
    t.jsonb "after_json"
    t.datetime "created_at_utc", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_user_id"], name: "index_activity_logs_on_actor_user_id"
    t.index ["created_at_utc"], name: "index_activity_logs_on_created_at_utc"
    t.index ["entity_type", "entity_id"], name: "index_activity_logs_on_entity_type_and_entity_id"
  end

  create_table "assignments", force: :cascade do |t|
    t.bigint "shift_id", null: false
    t.bigint "worker_id", null: false
    t.bigint "assigned_by_id"
    t.datetime "assigned_at_utc", null: false
    t.string "status", default: "assigned", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "hours_worked", precision: 5, scale: 2
    t.decimal "hourly_rate", precision: 8, scale: 2
    t.text "notes"
    t.timestamptz "clock_in_time"
    t.timestamptz "clock_out_time"
    t.integer "break_duration_minutes", default: 0
    t.decimal "overtime_hours", precision: 5, scale: 2, default: "0.0"
    t.integer "performance_rating"
    t.index ["created_at"], name: "index_assignments_on_created_at"
    t.index ["hourly_rate"], name: "index_assignments_on_hourly_rate"
    t.index ["shift_id", "worker_id"], name: "index_assignments_on_shift_id_and_worker_id", unique: true
    t.index ["shift_id"], name: "index_assignments_on_shift"
    t.index ["shift_id"], name: "index_assignments_on_shift_id"
    t.index ["worker_id", "created_at"], name: "index_assignments_on_worker_id_and_created_at"
    t.index ["worker_id", "shift_id"], name: "index_assignments_unique_worker_shift", unique: true
    t.index ["worker_id", "status", "created_at"], name: "index_assignments_on_worker_status_time"
    t.index ["worker_id", "status"], name: "index_assignments_on_worker_id_and_status"
    t.index ["worker_id"], name: "index_assignments_on_worker_id"
    t.check_constraint "hours_worked IS NULL OR hours_worked >= 0::numeric", name: "assignments_positive_hours"
    t.check_constraint "status::text = ANY (ARRAY['assigned'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])", name: "assignments_valid_status"
  end

  create_table "certifications", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_certifications_on_name", unique: true
  end

  create_table "event_schedules", force: :cascade do |t|
    t.bigint "event_id", null: false
    t.timestamptz "start_time_utc", null: false
    t.timestamptz "end_time_utc", null: false
    t.integer "break_minutes", default: 0
    t.timestamptz "created_at_utc", null: false
    t.timestamptz "updated_at_utc", null: false
    t.index ["event_id"], name: "index_event_schedules_on_event_id"
    t.index ["start_time_utc", "end_time_utc"], name: "index_event_schedules_on_start_time_utc_and_end_time_utc"
  end

  create_table "event_skill_requirements", force: :cascade do |t|
    t.bigint "event_id", null: false
    t.string "skill_name", null: false
    t.integer "needed_workers", default: 1, null: false
    t.text "description"
    t.string "uniform_name"
    t.string "certification_name"
    t.timestamptz "created_at_utc", null: false
    t.timestamptz "updated_at_utc", null: false
    t.decimal "pay_rate", precision: 10, scale: 2
    t.index ["event_id", "skill_name"], name: "index_event_skill_requirements_on_event_id_and_skill_name", unique: true
    t.index ["event_id"], name: "index_event_skill_requirements_on_event_id"
  end

  create_table "events", force: :cascade do |t|
    t.string "title", null: false
    t.string "status", default: "draft", null: false
    t.bigint "venue_id"
    t.text "check_in_instructions"
    t.string "supervisor_name"
    t.string "supervisor_phone"
    t.timestamptz "created_at_utc", null: false
    t.timestamptz "updated_at_utc", null: false
    t.timestamptz "published_at_utc"
    t.boolean "shifts_generated", default: false, null: false
    t.integer "total_shifts_count", default: 0, null: false
    t.integer "assigned_shifts_count", default: 0, null: false
    t.timestamptz "completed_at_utc"
    t.decimal "total_hours_worked", precision: 8, scale: 2, default: "0.0"
    t.decimal "total_pay_amount", precision: 10, scale: 2, default: "0.0"
    t.text "completion_notes"
    t.index ["completed_at_utc"], name: "index_events_on_completed_at_utc"
    t.index ["published_at_utc"], name: "index_events_on_published_at_utc"
    t.index ["shifts_generated"], name: "index_events_on_shifts_generated"
    t.index ["status", "created_at_utc"], name: "index_events_on_status_and_created_at"
    t.index ["status"], name: "index_events_on_status"
    t.index ["venue_id"], name: "index_events_on_venue_id"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'assigned'::character varying, 'completed'::character varying]::text[])", name: "valid_job_status"
  end

  create_table "locations", force: :cascade do |t|
    t.string "name", null: false
    t.text "address"
    t.string "city", null: false
    t.string "state", null: false
    t.string "zip_code"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "display_order", default: 0
    t.index ["active"], name: "index_locations_on_active"
    t.index ["city", "state"], name: "index_locations_on_city_and_state"
    t.index ["display_order"], name: "index_locations_on_display_order"
    t.index ["name"], name: "index_locations_on_name"
  end

  create_table "shifts", force: :cascade do |t|
    t.string "client_name", null: false
    t.string "role_needed", null: false
    t.string "location"
    t.datetime "start_time_utc", null: false
    t.datetime "end_time_utc", null: false
    t.decimal "pay_rate"
    t.integer "capacity", default: 1, null: false
    t.string "status", default: "draft"
    t.text "notes"
    t.bigint "created_by_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "required_cert_id"
    t.bigint "location_id"
    t.bigint "event_id"
    t.bigint "event_skill_requirement_id"
    t.boolean "auto_generated", default: false, null: false
    t.string "required_skill"
    t.string "uniform_name"
    t.index ["auto_generated"], name: "index_shifts_on_auto_generated"
    t.index ["event_id", "status", "start_time_utc"], name: "index_shifts_on_event_status_time"
    t.index ["event_id"], name: "index_shifts_on_event_id"
    t.index ["event_skill_requirement_id"], name: "index_shifts_on_event_skill_requirement_id"
    t.index ["location_id"], name: "index_shifts_on_location_id"
    t.index ["required_cert_id"], name: "index_shifts_on_required_cert_id"
    t.index ["required_skill"], name: "index_shifts_on_required_skill"
    t.index ["start_time_utc", "end_time_utc"], name: "index_shifts_on_start_time_utc_and_end_time_utc"
    t.index ["start_time_utc", "end_time_utc"], name: "index_shifts_on_time_range"
    t.index ["start_time_utc", "status"], name: "index_shifts_on_start_time_utc_and_status"
    t.index ["status"], name: "index_shifts_on_status"
    t.check_constraint "capacity > 0", name: "shifts_positive_capacity"
    t.check_constraint "end_time_utc > start_time_utc", name: "shifts_valid_time_range"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying]::text[])", name: "shifts_valid_status"
  end

  create_table "skills", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "display_order", default: 0
    t.index ["active"], name: "index_skills_on_active"
    t.index ["display_order"], name: "index_skills_on_display_order"
    t.index ["name"], name: "index_skills_on_name", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "role", default: "admin", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "venues", force: :cascade do |t|
    t.string "place_id", null: false
    t.string "name", null: false
    t.text "address"
    t.decimal "latitude", precision: 10, scale: 6
    t.decimal "longitude", precision: 10, scale: 6
    t.text "arrival_instructions"
    t.text "parking_info"
    t.string "phone"
    t.string "website"
    t.text "formatted_address", null: false
    t.timestamptz "last_synced_at_utc"
    t.timestamptz "created_at_utc", null: false
    t.timestamptz "updated_at_utc", null: false
    t.index ["last_synced_at_utc"], name: "index_venues_on_last_synced_at_utc"
    t.index ["name"], name: "index_venues_on_name"
    t.index ["place_id"], name: "index_venues_on_place_id", unique: true
  end

  create_table "worker_certifications", force: :cascade do |t|
    t.bigint "worker_id", null: false
    t.bigint "certification_id", null: false
    t.datetime "expires_at_utc", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["certification_id"], name: "index_worker_certifications_on_certification_id"
    t.index ["expires_at_utc"], name: "index_worker_certifications_on_expires_at_utc"
    t.index ["worker_id", "certification_id"], name: "index_worker_certifications_on_worker_id_and_certification_id", unique: true
    t.index ["worker_id"], name: "index_worker_certifications_on_worker_id"
  end

  create_table "worker_skills", force: :cascade do |t|
    t.bigint "worker_id", null: false
    t.bigint "skill_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["skill_id"], name: "index_worker_skills_on_skill_id"
    t.index ["worker_id", "skill_id"], name: "index_worker_skills_on_worker_id_and_skill_id", unique: true
    t.index ["worker_id"], name: "index_worker_skills_on_worker_id"
  end

  create_table "workers", force: :cascade do |t|
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.string "email"
    t.string "phone"
    t.jsonb "skills_json"
    t.text "skills_text"
    t.text "notes"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.tsvector "skills_tsvector"
    t.string "address_line1"
    t.string "address_line2"
    t.string "profile_photo_url"
    t.index ["active", "created_at"], name: "index_workers_on_active_and_created"
    t.index ["active"], name: "index_workers_on_active"
    t.index ["email"], name: "index_workers_on_email", unique: true, where: "(email IS NOT NULL)"
    t.index ["last_name", "first_name"], name: "index_workers_on_last_name_and_first_name"
    t.index ["skills_json"], name: "index_workers_on_skills_json", using: :gin
    t.index ["skills_tsvector"], name: "idx_workers_search", using: :gin
    t.index ["skills_tsvector"], name: "index_workers_on_skills_tsvector", using: :gin
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "activity_logs", "users", column: "actor_user_id", on_delete: :nullify
  add_foreign_key "assignments", "shifts", on_delete: :cascade
  add_foreign_key "assignments", "users", column: "assigned_by_id"
  add_foreign_key "assignments", "workers", on_delete: :restrict
  add_foreign_key "event_schedules", "events", on_delete: :cascade
  add_foreign_key "event_skill_requirements", "events", on_delete: :cascade
  add_foreign_key "events", "venues", on_delete: :restrict
  add_foreign_key "shifts", "certifications", column: "required_cert_id", on_delete: :nullify
  add_foreign_key "shifts", "event_skill_requirements", on_delete: :nullify
  add_foreign_key "shifts", "events", on_delete: :cascade
  add_foreign_key "shifts", "locations", on_delete: :nullify
  add_foreign_key "shifts", "users", column: "created_by_id"
  add_foreign_key "worker_certifications", "certifications", on_delete: :restrict
  add_foreign_key "worker_certifications", "workers", on_delete: :cascade
  add_foreign_key "worker_skills", "skills"
  add_foreign_key "worker_skills", "workers"
end
