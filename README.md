# Newsfeeder - Automated News Digest System

This repo generates an automatic and LLM-filtered personal news site.  
**Live demo:** [https://mikeadamss.github.io/newsfeeder/](https://mikeadamss.github.io/newsfeeder/)

---

## What is Newsfeeder?

Newsfeeder started as a Sunday afternoon experiment to see if I could combine RSS feeds, some keyword tricks, and a local LLM into a personal news dashboard. It turned out ok so I thought I'd share it. It essentially pulls in news from all over, filters and summarizes it, and presents everything in a clean React web app. It’s easy to extend and makes for a nice playground for automation and LLMs with a light frontend and a little git and full-stack trickery to make it work.

Best of all it's pretty customisable so gives anyone that wants one a free website of articles _taht they care about_ with an interesting LLM spin in it, tis pretty cool.

---

## How It Works

- **1. Keyword Filtering:**
  Newsfeeder first uses your topic keywords to collect a broad set of potentially relevant articles from your chosen feeds.

- **2. LLM Filtering & Summarization:**
  Each article is then passed through a local LLM, which:
  - Checks if the article truly matches the topic description (for more accurate results)
  - Generates a concise summary if one isn’t already provided

- **3. Caching & Repeat Runs:**
  Previously assessed articles are cached in a local SQLite database, so only new or updated articles are processed each run. After each run, new results are written back to the cache for future efficiency. This means you can run the workflow as often as you like (even with a strict time limit per run), and over time, Newsfeeder will process and summarize far more articles than would be possible in a single run—making it robust and scalable for large or slow feeds.

- **4. Automatic Website Generation:**
  The backend outputs per-topic JSON files, and the React frontend automatically builds a modern, filterable news website. The whole process is automated and deployed via GitHub Actions.

**Current setup:** We gather and process articles for up to 1 hour per run, and the workflow is scheduled to run every 2 hours. (You can adjust both values; see the technical setup for details.)

---

## Features

- **Automated RSS Fetching:** Pulls articles from any number of RSS feeds.
- **Smart Topic Classification:** Uses both keyword matching and LLMs for accurate topic sorting.
- **Summarization:** Each article is summarized using a local LLM (with fallback to simple methods if needed).
- **Caching:** SQLite-based caching for fast, efficient updates and minimal API calls.
- **Modern Frontend:** React UI with dynamic topic tabs, filters, and a mobile-friendly design.
- **Automated Deployment:** GitHub Actions workflow for daily updates, model caching, and seamless deploy to GitHub Pages.
- **Easy Customization:** Just edit a YAML config to add new feeds or topics.

---


## Technical Setup

For full installation and customization instructions ro run your own one of these (it's really easy), see [TECHNICAL_SETUP.md](./TECHNICAL_SETUP.md).

---
