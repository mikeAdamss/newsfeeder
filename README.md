# Newsfeeder - Automated News Digest System

This repo generates an automatic and LLM-filtered personal news site.  
**Live demo:** [https://mikeadamss.github.io/newsfeeder/](https://mikeadamss.github.io/newsfeeder/)

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

## What is Newsfeeder?

Newsfeeder is a personal project that brings together the latest news from your favorite sources, filters and summarizes them using both classic keyword techniques and modern LLMs (Large Language Models), and presents everything in a clean, fast React web app. It’s designed to be easy to extend, fun to tinker with, and a great way to showcase some full-stack automation and AI skills.

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

## Why I Built This

I wanted a personal news dashboard that was:
- **Truly mine** (no ads, no tracking, no paywalls)
- **Smart** (uses LLMs for real summarization and topic detection)
- **Automated** (runs itself every day, no manual work)
- **A playground** for experimenting with Python, React, LLMs, and CI/CD

It’s also a great way to demonstrate:
- End-to-end automation (Python backend, React frontend, CI/CD)
- Practical use of LLMs and prompt engineering
- Workflow design (GitHub Actions, model caching, static deploys)
- Clean, maintainable code and documentation

---

## Quick Start

Want to see it in action?  
Check out the [live site](https://mikeadamss.github.io/newsfeeder/) or clone the repo and run it locally!

---

## Technical Setup

For full installation and customization instructions, see [TECHNICAL_SETUP.md](./TECHNICAL_SETUP.md).

---

## Screenshots

*(Add screenshots here if you want!)*

---

## License

MIT – use, fork, and tinker as you like.

---

## Contact

Questions, ideas, or want to collaborate?  
Open an issue or reach out via GitHub!