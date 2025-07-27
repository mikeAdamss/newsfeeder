# Technical Setup – Newsfeeder

This guide will help you set up your own automated news digest using Newsfeeder. You’ll get a working backend (Python, LLM, SQLite), a modern React frontend, and automated updates via GitHub Actions.

---

## Scheduling and Processing Time

- **How to set the schedule:**
  - The run frequency is controlled by the `cron` value in `.github/workflows/daily-digest.yml` (default: every 2 hours).
  - Example: `cron: '0 */2 * * *'` runs the workflow every 2 hours, on the hour (UTC).
- **How to set the processing time per run:**
  - The maximum time to spend processing articles per run is set in `backend/config.yaml` as `max_processing_time` (in seconds). Default: 3600 (1 hour).
---

# Using Newsfeeder Yourself

## Option 1 (Recommended): Fork the Repository

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

## Option 2: Running or Changing Newsfeeder Locally

### Download the LLM model

The workflow uses a quantized model from Hugging Face. To download manually:

```sh
poetry run huggingface-cli download QuantFactory/phi-2-GGUF phi-2.Q4_0.gguf \
  --local-dir ./models --local-dir-use-symlinks False
```

*(You can use any GGUF model supported by your summarizer code. See `backend/generate_news_digest.py` for details.)*

### Install dependencies

```sh
poetry install
```

### Run the backend script

```sh
poetry run python backend/generate_news_digest.py
```

This will fetch articles, classify, summarize, and output per-topic JSON files in `backend/topics/`.

---

## 3. Frontend Setup (React)

```sh
cd frontend
npm install
npm run start
```

- The app will run at [http://localhost:3000](http://localhost:3000)
- It loads topic JSONs from the backend output (copy them to `frontend/public/topics/` for local dev)

---

## 4. Automated Deploy with GitHub Actions

- The workflow `.github/workflows/daily-digest.yml` automates the whole process:
  - Installs dependencies
  - Downloads/caches the LLM model
  - Runs the backend to generate new digests
  - Builds the React frontend
  - Deploys to GitHub Pages

### Enable GitHub Pages

- Go to your repo **Settings > Pages**
- Set the source to **GitHub Actions**

### Customize for your fork

- Update `backend/config.yaml` with your feeds/topics
- (Optional) Change the model or summarization logic in `backend/generate_news_digest.py`
- Push changes to your fork – the workflow will run automatically (or you can trigger it manually)

---

## 5. Troubleshooting

- **Cache versioning warning:**
  - The cache is versioned per version of `generate_news_digest.py`. When you update the code, old cached articles are kept until they are replaced by new results. This is intentional: it avoids losing all your data on an update, but means you may see a mix of old and new summaries until the cache is fully refreshed.
  - **To start over with a clean cache:** Simply delete the `backend/processing_cache.db` file. The next run will rebuild the cache from scratch.

- **Model download fails?**
  - Make sure the model exists and is public on Hugging Face
  - Check your workflow logs for errors
- **Frontend not updating?**
  - Ensure topic JSONs are copied to both `public/topics/` and `build/topics/` in the workflow
- **GitHub Pages 404?**
  - Make sure you have a `404.html` in `public/` for SPA routing
  - Check that Pages is enabled and set to GitHub Actions

---

## 6. Customization & Extending

- Add new feeds or topics in `backend/config.yaml` (each topic must have a `description` and `keywords`)
- Tweak summarization or topic logic in `backend/generate_news_digest.py`
- Style or extend the frontend in `frontend/`
- Use your own LLM or summarizer if you like!

---

## Questions?

Open an issue or reach out via GitHub!
