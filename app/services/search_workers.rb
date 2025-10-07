class SearchWorkers < ApplicationService
  def initialize(query, filters = {})
    @query = query.to_s.strip
    @filters = filters
  end
  
  def call
    workers = Worker.active
    
    # Apply search if query present
    if @query.present?
      workers = search_by_query(workers)
    end
    
    # Apply additional filters
    workers = apply_filters(workers)
    
    # Apply ordering after all filters to avoid DISTINCT/ORDER BY conflicts
    workers = workers.order(:last_name, :first_name)
    
    success(workers: workers)
  end
  
  private
  
  def search_by_query(scope)
    if @query.length >= 3
      # Use full-text search for queries ≥3 characters
      tsquery = "#{@query}:*"
      scope.where("skills_tsvector @@ to_tsquery('simple', ?)", tsquery)
        .or(
          scope.where("first_name ILIKE ? OR last_name ILIKE ?", "%#{@query}%", "%#{@query}%")
        )
    else
      # Use ILIKE for short queries
      scope.where("first_name ILIKE ? OR last_name ILIKE ?", "#{@query}%", "#{@query}%")
    end
  end
  
  def apply_filters(scope)
    # Filter by certification if specified
    if @filters[:certification_id].present?
      # Use subquery to avoid DISTINCT/ORDER BY conflict
      certified_worker_ids = WorkerCertification
        .where(certification_id: @filters[:certification_id])
        .where("expires_at_utc >= ?", Time.current)
        .pluck(:worker_id)
      
      scope = scope.where(id: certified_worker_ids)
    end
    
    # Filter by availability for specific shift
    if @filters[:available_for_shift_id].present?
      shift = Shift.find(@filters[:available_for_shift_id])
      
      # Exclude workers with overlapping assignments
      overlapping_worker_ids = Assignment.joins(:shift)
        .where(status: 'assigned')
        .where(
          "(shifts.start_time_utc < ? AND shifts.end_time_utc > ?)",
          shift.end_time_utc,
          shift.start_time_utc
        )
        .pluck(:worker_id)
      
      scope = scope.where.not(id: overlapping_worker_ids)
    end
    
    scope
  end
end
