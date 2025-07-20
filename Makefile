# Newsfeeder - Automated News Digest System
# Makefile for development automation

.PHONY: help setup install run-python copy-data run-react dev clean build deploy-prep test lint format check-deps

# Default target
help:
	@echo "Newsfeeder - Automated News Digest System"
	@echo ""
	@echo "Available commands:"
	@echo "  setup        - Initial project setup (install Python and Node.js dependencies)"
	@echo "  install      - Install/update all dependencies"
	@echo "  run-python   - Run the Python news scraper and generate digest"
	@echo "  copy-data    - Copy generated JSON to React public folder"
	@echo "  run-react    - Start the React development server"
	@echo "  dev          - Full development workflow (scrape → copy → start React)"
	@echo "  build        - Build React app for production"
	@echo "  deploy-prep  - Prepare for GitHub Pages deployment"
	@echo "  clean        - Clean generated files and cache"
	@echo "  test         - Run tests (when available)"
	@echo "  lint         - Run linting on Python and JavaScript code"
	@echo "  format       - Format code with black and prettier"
	@echo "  check-deps   - Check for outdated dependencies"
	@echo ""

# Variables
PYTHON_SCRIPT = code/generate_news_digest.py
JSON_OUTPUT = code/matched_entries.json
HTML_OUTPUT = news_digest.html
REACT_DIR = newsfeeder-ui
REACT_PUBLIC_DIR = $(REACT_DIR)/public
REACT_BUILD_DIR = $(REACT_DIR)/build

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
	@cd $(REACT_DIR) && npm install
	@echo "✅ Dependencies installed!"

# Run Python news scraper
run-python:
	@echo "🔍 Running news scraper..."
	@poetry run python $(PYTHON_SCRIPT)
	@if [ -f $(JSON_OUTPUT) ]; then \
		echo "✅ News digest generated successfully!"; \
		echo "   📄 JSON: $(JSON_OUTPUT)"; \
		echo "   🌐 HTML: $(HTML_OUTPUT)"; \
	else \
		echo "❌ Failed to generate news digest"; \
		exit 1; \
	fi

# Copy JSON data to React public folder
copy-data:
	@echo "📋 Copying data to React app..."
	@if [ ! -f $(JSON_OUTPUT) ]; then \
		echo "❌ $(JSON_OUTPUT) not found. Run 'make run-python' first."; \
		exit 1; \
	fi
	@cp $(JSON_OUTPUT) $(REACT_PUBLIC_DIR)/
	@echo "✅ Data copied to $(REACT_PUBLIC_DIR)/$(JSON_OUTPUT)"

# Start React development server
run-react:
	@echo "🚀 Starting React development server..."
	@cd $(REACT_DIR) && npm start

# Full development workflow
dev: run-python copy-data
	@echo "🎯 Starting full development workflow..."
	@echo "📊 Opening HTML digest in browser..."
	@if command -v xdg-open > /dev/null; then \
		xdg-open $(HTML_OUTPUT) & \
	fi
	@echo "🚀 Starting React development server..."
	@cd $(REACT_DIR) && npm start

# Build React app for production
build:
	@echo "🏗️  Building React app for production..."
	@cd $(REACT_DIR) && npm run build
	@echo "✅ Production build complete at $(REACT_BUILD_DIR)/"

# Prepare for GitHub Pages deployment
deploy-prep: run-python build
	@echo "🚀 Preparing for GitHub Pages deployment..."
	@cp $(JSON_OUTPUT) $(REACT_BUILD_DIR)/
	@echo "✅ Deployment files ready in $(REACT_BUILD_DIR)/"
	@echo "📋 Next steps for GitHub Pages:"
	@echo "   1. Push your changes to the main branch"
	@echo "   2. Go to your repository Settings > Pages"
	@echo "   3. Set source to 'GitHub Actions'"
	@echo "   4. Set up a workflow to build and deploy the React app"

# Clean generated files
clean:
	@echo "🧹 Cleaning generated files..."
	@rm -f $(JSON_OUTPUT) $(HTML_OUTPUT)
	@rm -rf $(REACT_BUILD_DIR)
	@rm -rf $(REACT_DIR)/node_modules/.cache
	@poetry cache clear --all pypi
	@echo "✅ Cleanup complete!"

# Run tests (placeholder for future implementation)
test:
	@echo "🧪 Running tests..."
	@echo "⚠️  Tests not implemented yet"
	# @poetry run pytest
	# @cd $(REACT_DIR) && npm test

# Lint code
lint:
	@echo "🔍 Linting Python code..."
	@if command -v poetry > /dev/null && poetry show | grep -q flake8; then \
		poetry run flake8 code/; \
	else \
		echo "⚠️  flake8 not installed, skipping Python linting"; \
	fi
	@echo "🔍 Linting JavaScript code..."
	@if [ -f $(REACT_DIR)/node_modules/.bin/eslint ]; then \
		cd $(REACT_DIR) && npm run lint; \
	else \
		echo "⚠️  ESLint not configured, skipping JavaScript linting"; \
	fi

# Format code
format:
	@echo "✨ Formatting Python code..."
	@if command -v poetry > /dev/null && poetry show | grep -q black; then \
		poetry run black code/; \
	else \
		echo "⚠️  black not installed, skipping Python formatting"; \
	fi
	@echo "✨ Formatting JavaScript code..."
	@if [ -f $(REACT_DIR)/node_modules/.bin/prettier ]; then \
		cd $(REACT_DIR) && npm run format; \
	else \
		echo "⚠️  Prettier not configured, skipping JavaScript formatting"; \
	fi

# Check for outdated dependencies
check-deps:
	@echo "🔍 Checking Python dependencies..."
	@poetry show --outdated
	@echo "🔍 Checking Node.js dependencies..."
	@cd $(REACT_DIR) && npm outdated

# Quick commands for common tasks
scrape: run-python
update: copy-data
serve: run-react
start: dev

# Development helpers
watch-python:
	@echo "👀 Watching for Python file changes..."
	@if command -v entr > /dev/null; then \
		find code/ -name "*.py" | entr -r make run-python copy-data; \
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
	@echo "React app: $(if $(shell test -d $(REACT_DIR) && echo 1),✅ $(REACT_DIR),❌ Not found)"
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
