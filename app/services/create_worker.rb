class CreateWorker < ApplicationService
  def initialize(worker_params:, created_by:)
    @worker_params = worker_params
    @created_by = created_by
  end

  def call
    # Set current user for activity logging
    Current.user = @created_by

    worker = Worker.new(@worker_params)

    if worker.save
      success(worker: worker)
    else
      failure(worker.errors.full_messages.join(", "))
    end
  rescue => e
    failure("Failed to create worker: #{e.message}")
  end
end
