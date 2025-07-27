# Newsfeeder - Automated News Digest System
# Makefile for development automation

.PHONY: help setup install backend export_json copy_data frontend dev clean build deploy_prep test lint format check_deps

# Default target
help:
	@echo "Newsfeeder - Automated News Digest System"
	@echo ""
	@echo "Available commands:"
	@echo "  setup        - Initial project setup (install Python and Node.js dependencies)"
	@echo "  install      - Install/update all dependencies"
	@echo "  backend      - Run the Python news scraper and generate digest"
	@echo "  export_json  - Export topic JSONs from cache"
	@echo "  copy_data    - Copy generated JSON to React public folder"
	@echo "  frontend     - Start the React development server"
	@echo "  dev          - Full development workflow (scrape → copy → start React)"
	@echo "  build        - Build React app for production"
	@echo "  deploy_prep  - Prepare for GitHub Pages deployment"
	@echo "  clean        - Clean generated files and cache"
	@echo "  test         - Run tests (when available)"
	@echo "  lint         - Run linting on Python and JavaScript code"
	@echo "  format       - Format code with black and prettier"
	@echo "  check_deps   - Check for outdated dependencies"
	@echo ""

# Variables
PYTHON_SCRIPT = backend/generate_news_digest.py
JSON_OUTPUT = backend/matched_entries.json
HTML_OUTPUT = news_digest.html
BACKEND_DIR = backend
FRONTEND_DIR = frontend
FRONTEND_PUBLIC_DIR = $(FRONTEND_DIR)/public
FRONTEND_BUILD_DIR = $(FRONTEND_DIR)/build

# Setup - Initial project setup
setup: install
	@echo "🚀 Setting up Newsfeeder project..."
	@if [ ! -f models/phi-2.Q4_0.gguf ]; then \
		echo "⚠️  Warning: LLM model not found at models/phi-2.Q4_0.gguf"; \
		echo "   Please download the model manually if needed."; \
	fi
	@echo "✅ Setup complete!"

# Install dependencies
install:
	@echo "📦 Installing Python dependencies..."
	@poetry install
	@echo "📦 Installing Node.js dependencies..."
	@cd $(FRONTEND_DIR) && npm install
	@echo "✅ Dependencies installed!"

# Run backend (Python news scraper)
backend:
	@echo "🔍 Running backend (news scraper)..."
	@poetry run python $(PYTHON_SCRIPT)
	@if [ -d $(BACKEND_DIR)/topics ] && [ -f $(BACKEND_DIR)/topics/index.json ]; then \
		echo "✅ News digest generated successfully!"; \
		echo "   • Topics"
		echo "   📋 Index: $(BACKEND_DIR)/topics/index.json"; \
		echo "   📊 Topic files: $$(ls $(BACKEND_DIR)/topics/*.json | wc -l) files"; \
	else \
		echo "❌ Failed to generate news digest"; \
		echo "   Expected: $(BACKEND_DIR)/topics/ directory with index.json"; \
		exit 1; \
	fi

# Export topic JSONs from cache
export_json:
	@echo "📋 Exporting topic JSONs from cache..."
	@poetry run python $(BACKEND_DIR)/export_json_from_cache.py
	@echo "✅ Topic JSONs exported from cache."

# Copy JSON data to React public folder
copy_data:
	@echo "📋 Copying data to frontend app..."
	@if [ ! -d $(BACKEND_DIR)/topics ]; then \
		echo "❌ $(BACKEND_DIR)/topics directory not found. Run 'make export_json' first."; \
		exit 1; \
	fi
	@mkdir -p $(FRONTEND_PUBLIC_DIR)/topics
	@cp -r $(BACKEND_DIR)/topics/* $(FRONTEND_PUBLIC_DIR)/topics/
	@echo "✅ Topic data copied to $(FRONTEND_PUBLIC_DIR)/topics/"

# Start frontend (React development server)
frontend: clean export_json copy_data
	@echo "🚀 Starting frontend (React development server)..."
	@cd $(FRONTEND_DIR) && npm start

# Full development workflow
dev: backend copy_data
	@echo "🎯 Starting full development workflow..."
	@echo "📊 Opening HTML digest in browser..."
	@if command -v xdg-open > /dev/null; then \
		xdg-open $(HTML_OUTPUT) & \
	fi
	@echo "🚀 Starting frontend (React development server)..."
	@cd $(FRONTEND_DIR) && npm start

# Build React app for production
build:
	@echo "🏗️  Building frontend for production..."
	@cd $(FRONTEND_DIR) && npm run build
	@echo "✅ Production build complete at $(FRONTEND_BUILD_DIR)/"

# Prepare for GitHub Pages deployment
deploy_prep: backend build
	@echo "🚀 Preparing for GitHub Pages deployment..."
	@cp $(JSON_OUTPUT) $(FRONTEND_BUILD_DIR)/
	@echo "✅ Deployment files ready in $(FRONTEND_BUILD_DIR)/"
	@echo "📋 Next steps for GitHub Pages:"
	@echo "   1. Push your changes to the main branch"
	@echo "   2. Go to your repository Settings > Pages"
	@echo "   3. Set source to 'GitHub Actions'"
	@echo "   4. Set up a workflow to build and deploy the React app"

# Clean generated files
clean:
	@echo "🧹 Cleaning generated files..."
	@rm -f $(JSON_OUTPUT) $(HTML_OUTPUT)
	@rm -rf $(FRONTEND_BUILD_DIR)
	@rm -rf $(FRONTEND_DIR)/node_modules/.cache
	@poetry cache clear --all pypi
	@echo "✅ Cleanup complete!"

# Run tests (placeholder for future implementation)
test:
	@echo "🧪 Running tests..."
	@echo "⚠️  Tests not implemented yet"
	# @poetry run pytest
	# @cd $(FRONTEND_DIR) && npm test

# Lint code
lint:
	@echo "🔍 Linting Python code..."
	@if command -v poetry > /dev/null && poetry show | grep -q flake8; then \
		poetry run flake8 $(BACKEND_DIR)/; \
	else \
		echo "⚠️  flake8 not installed, skipping Python linting"; \
	fi
	@echo "🔍 Linting JavaScript code..."
	@if [ -f $(FRONTEND_DIR)/node_modules/.bin/eslint ]; then \
		cd $(FRONTEND_DIR) && npm run lint; \
	else \
		echo "⚠️  ESLint not configured, skipping JavaScript linting"; \
	fi

# Format code
format:
	@echo "✨ Formatting Python code..."
	@if command -v poetry > /dev/null && poetry show | grep -q black; then \
		poetry run black $(BACKEND_DIR)/; \
	else \
		echo "⚠️  black not installed, skipping Python formatting"; \
	fi
	@echo "✨ Formatting JavaScript code..."
	@if [ -f $(FRONTEND_DIR)/node_modules/.bin/prettier ]; then \
		cd $(FRONTEND_DIR) && npm run format; \
	else \
		echo "⚠️  Prettier not configured, skipping JavaScript formatting"; \
	fi

# Check for outdated dependencies
check_deps:
	@echo "🔍 Checking Python dependencies..."
	@poetry show --outdated
	@echo "🔍 Checking Node.js dependencies..."
	@cd $(FRONTEND_DIR) && npm outdated

# Quick commands for common tasks
scrape: backend
update: copy_data
serve: frontend
start: dev

# Development helpers
watch-python:
	@echo "👀 Watching for Python file changes..."
	@if command -v entr > /dev/null; then \
		find $(BACKEND_DIR)/ -name "*.py" | entr -r make backend copy_data; \
	else \
		echo "❌ 'entr' command not found. Install it for file watching."; \
		echo "   On Ubuntu/Debian: sudo apt install entr"; \
		echo "   On macOS: brew install entr"; \
	fi

# Show project status
status:
	@echo "📊 Newsfeeder Project Status"
	@echo "=========================="
	@echo "Python script: $(PYTHON_SCRIPT)"
	@echo "JSON output: $(if $(shell test -f $(JSON_OUTPUT) && echo 1),✅ $(JSON_OUTPUT),❌ Not generated)"
	@echo "HTML output: $(if $(shell test -f $(HTML_OUTPUT) && echo 1),✅ $(HTML_OUTPUT),❌ Not generated)"
	@echo "React app: $(if $(shell test -d $(FRONTEND_DIR) && echo 1),✅ $(FRONTEND_DIR),❌ Not found)"
	@echo "LLM model: $(if $(shell test -f models/phi-2.Q4_0.gguf && echo 1),✅ models/phi-2.Q4_0.gguf,❌ Not found)"
	@echo ""
	@echo "Recent files:"
	@ls -lat | head -5

# Emergency stop (kill React dev server)
stop:
	@echo "🛑 Stopping development servers..."
	@pkill -f "react-scripts start" || true
	@pkill -f "npm start" || true
	@echo "✅ Servers stopped"
