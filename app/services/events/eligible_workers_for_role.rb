module Events
  class EligibleWorkersForRole
    attr_reader :event, :requirement, :shift

    def initialize(event:, requirement:, shift: nil)
      @event = event
      @requirement = requirement
      @shift = shift
    end

    def call
      {
        role: role_payload,
        shift: shift_payload,
        workers: eligible_workers
      }
    end

    private

    def eligible_workers
      Worker
        .eligible_for_requirement(event: event, role: requirement, shift: shift)
        .includes(worker_certifications: :certification)
    end

    def role_payload
      {
        id: requirement.id,
        name: requirement.skill_name,
        required_certification: requirement.required_certification&.slice(:id, :name)
      }
    end

    def shift_payload
      selected_shift = shift || default_shift

      if selected_shift
        {
          id: selected_shift.id,
          start_time_utc: selected_shift.start_time_utc,
          end_time_utc: selected_shift.end_time_utc
        }
      else
        schedule = event.event_schedule
        {
          id: nil,
          start_time_utc: schedule&.start_time_utc,
          end_time_utc: schedule&.end_time_utc
        }
      end
    end

    def default_shift
      event.shifts.where(role_needed: requirement.skill_name).order(:start_time_utc).first
    end
  end
end
