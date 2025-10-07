class ApplicationService
  def self.call(*args, **kwargs, &block)
    if args.any? && kwargs.any?
      raise ArgumentError, "Cannot mix positional and keyword arguments"
    elsif args.any?
      new(*args, &block).call
    else
      new(**kwargs, &block).call
    end
  end
  
  private
  
  def success(data = {})
    { success: true, data: data }
  end
  
  def failure(error, status: :unprocessable_entity)
    { success: false, error: error, status: status }
  end
end
