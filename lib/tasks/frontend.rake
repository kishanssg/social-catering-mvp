# Production-ready Rake tasks for React + Rails integration
namespace :frontend do
  desc "Build React frontend into Rails asset pipeline"
  task :build do
    puts "🏗️  Building React frontend into Rails asset pipeline..."

    # Check if pre-built assets exist
    if File.exist?(Rails.root.join("app/assets/builds/application.js")) && 
       File.exist?(Rails.root.join("app/assets/builds/application.css"))
      puts "✅ Using pre-built React frontend assets"
      return
    end

    # Try different npm paths
    npm_paths = [
      "/usr/local/bin/npm",
      "/app/.heroku/node/bin/npm", 
      "npm"
    ]
    
    npm_path = nil
    npm_paths.each do |path|
      if system("which #{path} > /dev/null 2>&1")
        npm_path = path
        break
      end
    end
    
    if npm_path.nil?
      puts "❌ ERROR: npm not found in any expected location"
      exit 1
    end
    
    puts "📦 Using npm at: #{npm_path}"

    # Build React app
    success = system("cd social-catering-ui && #{npm_path} run build")
    
    unless success
      puts "❌ ERROR: React build failed"
      exit 1
    end

    # Verify build files exist
    unless File.exist?(Rails.root.join("app/assets/builds/application.js"))
      raise "❌ ERROR: application.js not found in app/assets/builds/"
    end

    unless File.exist?(Rails.root.join("app/assets/builds/application.css"))
      raise "❌ ERROR: application.css not found in app/assets/builds/"
    end

    puts "✅ React frontend built successfully into Rails asset pipeline"
  end

  desc "Build and precompile assets for production"
  task build_production: :build do
    puts "⚙️  Precompiling Rails assets for production..."

    # Precompile assets
    system("RAILS_ENV=production bundle exec rails assets:precompile")

    # Verify precompiled assets
    unless Dir.exist?(Rails.root.join("public/assets"))
      raise "❌ ERROR: public/assets directory not created"
    end

    js_asset = Dir.glob(Rails.root.join("public/assets/application-*.js")).first
    css_asset = Dir.glob(Rails.root.join("public/assets/application-*.css")).first

    unless js_asset
      raise "❌ ERROR: No fingerprinted JavaScript asset found"
    end

    unless css_asset
      raise "❌ ERROR: No fingerprinted CSS asset found"
    end

    puts "✅ Production build completed successfully!"
    puts "📁 JavaScript: #{File.basename(js_asset)}"
    puts "📁 CSS: #{File.basename(css_asset)}"
  end

  desc "Verify frontend assets are properly served"
  task :verify do
    puts "🔍 Verifying frontend asset serving..."

    # Check if assets exist
    js_asset = Dir.glob(Rails.root.join("public/assets/application-*.js")).first
    css_asset = Dir.glob(Rails.root.join("public/assets/application-*.css")).first

    unless js_asset && css_asset
      puts "❌ ERROR: Frontend assets not found. Run 'rails frontend:build_production' first."
      exit 1
    end

    puts "✅ Frontend assets verified:"
    puts "  📁 JavaScript: #{File.basename(js_asset)}"
    puts "  📁 CSS: #{File.basename(css_asset)}"
    puts "  🚀 Ready for production!"
  end
end

# Integrate with Rails asset precompilation
Rake::Task["assets:precompile"].enhance([ "frontend:build" ])
