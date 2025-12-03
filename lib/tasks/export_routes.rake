namespace :export do
  desc "Export Rails API routes to JSON for TypeScript generation"
  task routes_json: :environment do
    require "json"

    api_routes = []

    Rails.application.routes.routes.each do |route|
      next unless route.path.spec.to_s.start_with?("/api/v1")

      constraints = route.constraints
      verb = route.verb.downcase

      # Skip if not an API method
      next unless %w[get post put patch delete].include?(verb)

      path = route.path.spec.to_s

      # Convert Rails path parameters to TypeScript-friendly format
      # e.g., /api/v1/events/:id -> /api/v1/events/{id}
      ts_path = path.gsub(/:(\w+)/, '{\1}')

      api_routes << {
        name: route.name || route.defaults[:controller] || "unknown",
        verb: verb.upcase,
        path: path,
        ts_path: ts_path,
        controller: route.defaults[:controller],
        action: route.defaults[:action]
      }
    end

    # Group by controller for better organization
    grouped = api_routes.group_by { |r| r[:controller] }

    # Write to JSON file
    output = {
      generated_at: Time.current.utc.iso8601,
      routes: grouped
    }

    FileUtils.mkdir_p("tmp")
    File.write("tmp/routes.json", JSON.pretty_generate(output))

    puts "✅ Exported #{api_routes.count} API routes to tmp/routes.json"
    puts "   Controllers: #{grouped.keys.compact.sort.join(', ')}"
  end
end
