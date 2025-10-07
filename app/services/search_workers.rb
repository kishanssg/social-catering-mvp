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
    
    success(workers: workers.order(:last_name, :first_name))
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
      scope = scope.joins(:worker_certifications)
        .where(worker_certifications: { certification_id: @filters[:certification_id] })
        .where("worker_certifications.expires_at_utc >= ?", Time.current)
        .distinct
    end
    
    scope
  end
end
