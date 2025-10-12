class UpdateWorker < ApplicationService
  def initialize(worker:, worker_params:, updated_by:)
    @worker = worker
    @worker_params = worker_params
    @updated_by = updated_by
  end

  def call
    # Set current user for activity logging
    Current.user = @updated_by

    if @worker.update(@worker_params)
      success(worker: @worker)
    else
      failure(@worker.errors.full_messages.join(", "))
    end
  rescue => e
    failure("Failed to update worker: #{e.message}")
  end
end
