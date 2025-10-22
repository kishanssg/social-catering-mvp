class Event < ApplicationRecord
  include Auditable

  # Associations
  belongs_to :venue
  has_many :event_skill_requirements, dependent: :destroy
  has_one :event_schedule, dependent: :destroy
  has_many :shifts, dependent: :destroy
  has_many :assignments, through: :shifts

  # Nested attributes
  accepts_nested_attributes_for :event_skill_requirements, allow_destroy: true
  accepts_nested_attributes_for :event_schedule

  # Validations
  validates :title, presence: true
  validates :status, inclusion: { in: %w[draft published assigned completed deleted] }
  validates :supervisor_phone, format: { 
    with: /\A\d{3}-\d{3}-\d{4}\z/, 
    message: "must be in format xxx-xxx-xxxx" 
  }, allow_blank: true

  # Scopes
  scope :draft, -> { where(status: 'draft') }
  scope :published, -> { where(status: 'published') }
  scope :assigned, -> { where(status: 'assigned') }
  scope :completed, -> { where(status: 'completed') }
  scope :active, -> { where.not(status: 'completed') }
  scope :recent, -> { order(created_at_utc: :desc) }
  scope :completed_recently, -> { completed.order(completed_at_utc: :desc) }
  scope :by_completion_date, ->(start_date, end_date) { 
    completed.where(completed_at_utc: start_date..end_date) 
  }
  
  # New scopes for unified Events page
  scope :upcoming, -> { 
    joins(:event_schedule)
      .where('event_schedules.start_time_utc > ?', Time.current)
      .order('event_schedules.start_time_utc ASC') 
  }
  
  scope :past_week, -> {
    joins(:event_schedule)
      .where('event_schedules.end_time_utc BETWEEN ? AND ?', 
             1.week.ago, Time.current)
  }
  
  scope :past_month, -> {
    joins(:event_schedule)
      .where('event_schedules.end_time_utc BETWEEN ? AND ?', 
             1.month.ago, Time.current)
  }
  
  scope :with_assignments, -> {
    includes(shifts: [:assignments, :workers])
  }

  # Callbacks for custom timestamp columns
  before_create :set_created_at_utc
  before_save :set_updated_at_utc

  # React to state changes
  after_update :generate_shifts_if_published, if: :saved_change_to_status?
  after_update :update_staffing_counts, if: :saved_change_to_status?
  after_update :update_completion_metrics, if: :should_update_completion_metrics?

  # Instance methods
  def total_workers_needed
    event_skill_requirements.sum(:needed_workers)
  end

  def skills_list
    event_skill_requirements.pluck(:skill_name).join(', ')
  end

  def duration_hours
    return 0 unless event_schedule
    ((event_schedule.end_time_utc - event_schedule.start_time_utc) / 1.hour).round(2)
  end

  def can_be_published?
    event_skill_requirements.any? && event_schedule.present? && venue.present?
  end

  def can_be_assigned?
    status == 'published'
  end

  def can_be_completed?
    status == 'published' && event_schedule.present? && Time.current > event_schedule.end_time_utc
  end

  def complete!(notes: nil)
    return false unless can_be_completed?
    
    update!(
      status: 'completed',
      completed_at_utc: Time.current,
      completion_notes: notes,
      total_hours_worked: calculate_total_hours_worked,
      total_pay_amount: calculate_total_pay_amount
    )
  end

  def calculate_total_hours_worked
    shifts.joins(:assignments).where.not(assignments: { hours_worked: nil }).sum('assignments.hours_worked')
  end

  def calculate_total_pay_amount
    shifts.joins(:assignments).where.not(assignments: { hours_worked: nil }).sum('assignments.hours_worked * COALESCE(assignments.hourly_rate, shifts.pay_rate)')
  end

  # Assignment metrics
  def assigned_workers_count
    shifts.joins(:assignments).count
  end

  def staffing_percentage
    total = total_workers_needed
    return 0 if total.zero?
    (assigned_workers_count.to_f / total * 100).round(0)
  end

  def staffing_progress
    {
      assigned: assigned_workers_count,
      required: total_workers_needed,
      percentage: staffing_percentage
    }
  end

  def publish!
    update!(status: 'published')
  end

  def staffing_status
    return 'completed' if status == 'completed'
    return 'draft' if status == 'draft'

    pct = staffing_percentage
    return 'fully_staffed' if pct >= 100
    return 'partially_staffed' if pct > 0
    'needs_workers'
  end

  def staffing_summary
    "#{assigned_workers_count} of #{total_workers_needed} workers"
  end

  def unfilled_roles_count
    total_workers_needed - assigned_workers_count
  end

  # Shift generation from requirements
  def generate_shifts!
    return unless can_be_published?
    
    # Use a database lock to prevent race conditions
    with_lock do
      # Double-check if shifts already exist (prevents race conditions)
      if shifts.any?
        return shifts
      end

      generated = []
      event_skill_requirements.find_each do |skill_req|
        skill_req.needed_workers.times do
          generated << shifts.create!(
            client_name: title,
            role_needed: skill_req.skill_name,
            start_time_utc: event_schedule.start_time_utc,
            end_time_utc: event_schedule.end_time_utc,
            capacity: 1,
            pay_rate: 0,
            notes: check_in_instructions,
            event_skill_requirement_id: skill_req.id,
            auto_generated: true,
            required_skill: skill_req.skill_name,
            uniform_name: skill_req.uniform_name,
            status: 'published',
            created_by: Current.user || User.first
          )
        end
      end

      update_columns(
        total_shifts_count: shifts.count,
        published_at_utc: Time.current,
        shifts_generated: true
      )

      generated
    end
  end

  private

  def set_created_at_utc
    self.created_at_utc ||= Time.current
  end

  def set_updated_at_utc
    self.updated_at_utc = Time.current
  end

  def generate_shifts_if_published
    return unless status == 'published'
    generate_shifts!
  end

  def update_staffing_counts
    update_columns(
      total_shifts_count: shifts.count,
      assigned_shifts_count: shifts.joins(:assignments).count
    )
  end

  def should_update_completion_metrics?
    status == 'completed' && (saved_change_to_status? || assignments.any?)
  end

  def update_completion_metrics
    return unless status == 'completed'
    
    update_columns(
      total_hours_worked: calculate_total_hours_worked,
      total_pay_amount: calculate_total_pay_amount
    )
  end
end
