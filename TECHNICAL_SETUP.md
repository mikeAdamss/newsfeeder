# Technical Setup – Newsfeeder

This guide will help you set up your own automated news digest using Newsfeeder. You’ll get a working backend (Python, LLM, SQLite), a modern React frontend, and automated updates via GitHub Actions.

---

# Fork the Repository

To use Newsfeeder with your own GitHub Actions workflow and deploy your own site, simply **fork** this repository to your own GitHub account.

### Configure your feeds and topics

By default, Newsfeeder uses `backend/config.yaml` for configuration and `backend/processing_cache.db` for caching. **If you want to customize your setup and avoid merge conflicts when pulling upstream changes, create your own `custom_config.yaml` and/or `custom_processing_cache.db` in the same directory.**

- If `custom_config.yaml` exists, it will be used instead of `config.yaml`.
- If `custom_processing_cache.db` exists, it will be used instead of `processing_cache.db`.
- This lets you safely pull updates from the main repository without overwriting your own config or cache.

Edit `backend/config.yaml` to add your own RSS feeds and topic definitions.

#### Structure of `config.yaml`

- **feeds:** (top-level list) – All RSS feeds you want to pull articles from. You can comment/uncomment feeds as needed.
- **topics:** (mapping) – Each topic is a key with a nested mapping containing:
  - **description:** (string, required) – A human-readable description of the topic. This is used for UI display and helps LLMs and users understand what the topic covers.
  - **keywords:** (list, required) – List of keywords and phrases used for classic topic matching.

#### Example:

```yaml
feeds:
  - https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml
  - https://feeds.bbci.co.uk/news/world/rss.xml
  # ...more feeds...

topics:
  AI:
    description: "Articles about artificial intelligence, machine learning, language models, AI companies like OpenAI and Anthropic, AI research breakthroughs, automation technology, computer vision, natural language processing, and AI applications across various industries. Includes news about specific AI models like GPT, Claude, and Gemini."
    keywords:
      - openai
      - llm
      - chatbot
      - artificial intelligence
      # ...more keywords...
  Climate:
    description: "Articles about climate change, environmental issues, renewable energy developments, sustainability initiatives, carbon emissions and reduction efforts, climate policy and agreements, green technology innovations, electric vehicles, and environmental impact of various industries and technologies."
    keywords:
      - carbon
      - emissions
      - net zero
      # ...more keywords...
```

- You can add as many topics as you like. Each must have a `description` and a `keywords` list.
- Descriptions are important for both the UI and for LLM-based topic classification.
- Comment/uncomment feeds and topics as needed to customize your news experience.

---

### Scheduling and Processing Time

- **How to set the schedule:**
  - The run frequency is controlled by the `cron` value in `.github/workflows/daily-digest.yml` (default: every 2 hours).
  - Example: `cron: '0 */2 * * *'` runs the workflow every 2 hours, on the hour (UTC).
- **How to set the processing time per run:**
  - The maximum time to spend processing articles per run is set in `backend/config.yaml` as `max_processing_time` (in seconds). Default: 3600 (1 hour).

