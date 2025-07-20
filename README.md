# Newsfeeder - Automated News Digest System

An automated news digest system that scrapes RSS feeds, categorizes articles by topic using keyword matching and LLM validation and creates your own _personal and fully customistable_ **free** news minisite. **Works on a schedule, no manual updates necessarty**

Create _your own personal and customisable_ newsfeed app **using github pages** (free) via **github actions** (also free). There is **very** little technical knowledge or setup required for this.

Just branch, configure for the topics you care about and enjoy!

You can see _my_ newsfeeder site using the default topics (literally just stuff I happen to be interested in) here:

## Features

- 🔍 **RSS Feed Scraping**: Pulls in articles about your own areas of interest
- 🏷️ **Smart Categorization**: Two-stage filtering (keywords + LLM validation)
- 📰 **Automated updates**: You news feed periodically updates itself
- 🎨 **Modern UI**: Responsive mobile friendly react pages
- 🚀 **React Ready**: GitHub Pages deployment - free website with no setup or fees

## Setup

- Branch this github repo.


## Tech Stack

- **Backend**: Python with Poetry, feedparser, GPT4All (phi-2.Q4_0.gguf)
- **Frontend**: React with Tailwind CSS
- **Automation**: Makefile, shell scripts
- **Deployment**: GitHub Pages ready

## Quick Start

### Prerequisites

- Python 3.8+ with Poetry
- Node.js 16+ with npm
- GPT4All model: `models/phi-2.Q4_0.gguf`

### Setup

```bash
# Clone and setup the project
make setup
```

### Daily Workflow

```bash
# Full development workflow (scrape → copy data → start React)
make dev
```

## Available Commands

Run `make help` for a full list of available commands:

### Core Commands
- `make setup` - Initial project setup
- `make dev` - Full development workflow
- `make run-python` - Run news scraper only
- `make run-react` - Start React development server
- `make build` - Build React app for production

### Utilities
- `make copy-data` - Copy JSON to React public folder
- `make clean` - Clean generated files
- `make status` - Show project status
- `make stop` - Stop development servers

### Development
- `make lint` - Run code linting
- `make format` - Format code
- `make check-deps` - Check for outdated dependencies

## Project Structure

```
newsfeeder/
├── code/
│   ├── config.yaml              # RSS feeds and topic configuration
│   └── generate_news_digest.py  # Main Python scraper script
├── newsfeeder-ui/               # React web application
│   ├── public/
│   └── src/
│       ├── components/          # React components
│       ├── App.js
│       └── App.css
├── models/
│   └── phi-2.Q4_0.gguf         # GPT4All LLM model
├── Makefile                     # Development automation
├── poetry.lock
└── pyproject.toml
```

## Configuration

### RSS Feeds & Topics (`code/config.yaml`)

```yaml
feeds:
  - url: "https://example.com/rss.xml"
    name: "Example News"

topics:
  technology:
    keywords: ["AI", "machine learning", "software"]
    description: "Technology and software development news"
  # ... more topics
```

### Customization

1. **Add RSS Feeds**: Edit `config.yaml` to include your favorite news sources
2. **Configure Topics**: Define keywords and descriptions for article categorization
3. **Styling**: Modify Tailwind classes in React components or HTML template
4. **LLM Model**: Replace `models/phi-2.Q4_0.gguf` with a different GPT4All model if needed

## Development Workflow

### 1. Local Development

```bash
# Run the complete workflow
make dev
```

This will:
1. Run the Python scraper to fetch and categorize news
2. Copy the generated JSON to the React public folder
3. Start the React development server
4. Open the HTML digest in your browser

### 2. Manual Steps

```bash
# Just scrape news
make run-python

# Copy data to React
make copy-data

# Start React server
make run-react
```

### 3. Production Build

```bash
# Build for deployment
make build

# Prepare for GitHub Pages
make deploy-prep
```

## Deployment

### GitHub Pages Setup

1. Run `make deploy-prep` to build and prepare files
2. Push your code to GitHub
3. Go to repository Settings > Pages
4. Set source to "GitHub Actions"
5. Set up a workflow to build and deploy the React app

### Automation Options

- **Daily Scraping**: Set up GitHub Actions to run the scraper daily
- **Auto-deployment**: Automatically deploy updates to GitHub Pages
- **Local Scheduling**: Use cron jobs for regular local updates

## Troubleshooting

### Common Issues

1. **Missing LLM Model**: Download `phi-2.Q4_0.gguf` to the `models/` directory
2. **Python Dependencies**: Run `poetry install` or `make install`
3. **React Issues**: Run `cd newsfeeder-ui && npm install`
4. **Port Conflicts**: React runs on port 3000 by default

### Debugging

```bash
# Check project status
make status

# Clean and restart
make clean
make dev

# Stop all servers
make stop
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `make lint` and `make format`
5. Submit a pull request

---

Built with ❤️ for staying informed with automated news digests.
