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

ActiveRecord::Schema[7.2].define(version: 2025_10_07_004631) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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
    t.index ["shift_id", "worker_id"], name: "index_assignments_on_shift_id_and_worker_id", unique: true
    t.index ["shift_id"], name: "index_assignments_on_shift_id"
    t.index ["worker_id", "status"], name: "index_assignments_on_worker_id_and_status"
    t.index ["worker_id"], name: "index_assignments_on_worker_id"
    t.check_constraint "status::text = ANY (ARRAY['assigned'::character varying, 'completed'::character varying, 'no_show'::character varying, 'cancelled'::character varying]::text[])", name: "assignments_valid_status"
  end

  create_table "certifications", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_certifications_on_name", unique: true
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
    t.index ["required_cert_id"], name: "index_shifts_on_required_cert_id"
    t.index ["start_time_utc", "end_time_utc"], name: "index_shifts_on_start_time_utc_and_end_time_utc"
    t.index ["start_time_utc", "status"], name: "index_shifts_on_start_time_utc_and_status"
    t.index ["status"], name: "index_shifts_on_status"
    t.check_constraint "capacity > 0", name: "shifts_positive_capacity"
    t.check_constraint "end_time_utc > start_time_utc", name: "shifts_valid_time_range"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'assigned'::character varying, 'completed'::character varying]::text[])", name: "shifts_valid_status"
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
    t.index ["active"], name: "index_workers_on_active"
    t.index ["email"], name: "index_workers_on_email", unique: true, where: "(email IS NOT NULL)"
    t.index ["last_name", "first_name"], name: "index_workers_on_last_name_and_first_name"
    t.index ["skills_json"], name: "index_workers_on_skills_json", using: :gin
    t.index ["skills_tsvector"], name: "idx_workers_search", using: :gin
  end

  add_foreign_key "activity_logs", "users", column: "actor_user_id", on_delete: :nullify
  add_foreign_key "assignments", "shifts", on_delete: :cascade
  add_foreign_key "assignments", "users", column: "assigned_by_id"
  add_foreign_key "assignments", "workers", on_delete: :restrict
  add_foreign_key "shifts", "certifications", column: "required_cert_id", on_delete: :nullify
  add_foreign_key "shifts", "users", column: "created_by_id"
  add_foreign_key "worker_certifications", "certifications", on_delete: :restrict
  add_foreign_key "worker_certifications", "workers", on_delete: :cascade
end
