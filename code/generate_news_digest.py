import feedparser
import yaml
from pathlib import Path
import requests
from gpt4all import GPT4All

# --- Load config ---
config_path = Path(Path(__file__).parent, "config.yaml")
with open(config_path, "r") as f:
    config = yaml.safe_load(f)

feeds = config["feeds"]
topics = config["topics"]

# --- Setup LLM for topic classification ---
print("Loading GPT4All model...")
llm = GPT4All(
    model_name="phi-2.Q4_0.gguf",
    model_path="./models",
    device='cpu',
    verbose=False
)
print("Model loaded successfully!")

# --- Helper functions ---

def match_topic(entry, keywords):
    import re
    title = entry.title or ""
    summary = entry.get('summary', '')
    
    keyword_matches = {}
    matched_keywords = []
    
    for keyword in keywords:
        # Create regex pattern with word boundaries
        # \b ensures the keyword is matched as a complete word
        pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
        
        # Check title and summary separately
        title_match = re.search(pattern, title.lower())
        summary_match = re.search(pattern, summary.lower())
        
        if title_match or summary_match:
            matched_keywords.append(keyword)
            
            # Track where the keyword was found
            found_in = []
            if title_match:
                found_in.append("title")
            if summary_match:
                found_in.append("summary")
                
            keyword_matches[keyword] = {
                "found_in": found_in,
                "title_text": title if title_match else None,
                "summary_text": summary if summary_match else None
            }
    
    return matched_keywords, keyword_matches

def llm_classify_article(entry, topic, topic_description):
    """Use LLM to determine if an article truly belongs to a topic"""
    prompt = f"""
Task: Determine if this news article belongs to the topic "{topic}".

Topic Description: {topic_description}

Article Title: {entry.title}
Article Summary: {entry.get('summary', 'No summary available')}

Question: Does this article belong to the "{topic}" topic based on the description above?

Answer with only "YES" or "NO" followed by a brief reason.
"""
    
    try:
        response = llm.generate(prompt, max_tokens=50)
        original_response = response.strip()
        response = response.strip().upper()
        
        # Check if response starts with YES or NO
        if response.startswith("YES"):
            return True, original_response.lower()
        elif response.startswith("NO"):
            return False, original_response.lower()
        else:
            # Fallback - if unclear response, be conservative and include it
            print(f"Unclear LLM response for '{entry.title}': {response}")
            return True, f"unclear response: {original_response.lower()}"
    except Exception as e:
        print(f"Error classifying article '{entry.title}': {e}")
        return True, f"llm error: {str(e).lower()}"  # Fallback to include article if LLM fails

def get_entry_summary(entry):
    return entry.get("summary", "No summary available")

# --- Parse and collect matches with two-stage filtering ---
matched = {topic: [] for topic in topics}
all_keywords_used = {topic: set() for topic in topics}

for url in feeds:
    feed = feedparser.parse(url)
    print(f"\nProcessing feed: {url}")
    
    for entry in feed.entries:
        print(f"Processing entry: {entry.title}")
        
        for topic_name, topic_config in topics.items():
            keywords = topic_config['keywords']
            description = topic_config['description']
            
            # Stage 1: Keyword pre-filtering
            matched_keywords, keyword_matches = match_topic(entry, keywords)
            
            if matched_keywords:
                print(f"  Keywords matched for {topic_name}: {', '.join(matched_keywords[:3])}...")
                
                # Stage 2: LLM topic validation
                print(f"  Checking with LLM if article belongs to {topic_name}...")
                is_relevant, ai_reasoning = llm_classify_article(entry, topic_name, description)
                
                if is_relevant:
                    summary = get_entry_summary(entry)
                    # Get publication date
                    published_time = getattr(entry, 'published_parsed', None)
                    if not published_time:
                        published_time = getattr(entry, 'updated_parsed', None)
                    
                    matched[topic_name].append({
                        "title": entry.title,
                        "link": entry.link,
                        "summary": summary,
                        "from_feed": url,
                        "published_parsed": published_time,
                        "published": getattr(entry, 'published', 'Date not available'),
                        "matched_keywords": matched_keywords,
                        "keyword_matches": keyword_matches,
                        "ai_reasoning": ai_reasoning
                    })
                    # Track which keywords were actually used
                    all_keywords_used[topic_name].update(matched_keywords)
                    print(f"  ✓ Article confirmed for {topic_name}")
                    break  # Only assign to one topic
                else:
                    print(f"  ✗ Article rejected for {topic_name} - Reason: {ai_reasoning}")
            # If no keywords match, don't even check with LLM

# Sort articles by date (newest first) within each topic
import time
for topic in matched:
    matched[topic].sort(
        key=lambda x: x['published_parsed'] if x['published_parsed'] else time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0)),
        reverse=True
    )

print(f"\nFinal results:")
for topic, articles in matched.items():
    print(f"  {topic}: {len(articles)} articles")

import json
output_path = Path(Path(__file__).parent, "matched_entries.json")
with open(output_path, "w") as f:
    json.dump(matched, f, indent=4)
