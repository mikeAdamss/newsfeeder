import feedparser
import yaml
from pathlib import Path
import requests
from gpt4all import GPT4All
from sqlite_cache import SQLiteProcessingCache
import re
import time
import json
import html
from html.parser import HTMLParser

# --- Load config ---
config_path = Path(Path(__file__).parent, "config.yaml")
with open(config_path, "r") as f:
    config = yaml.safe_load(f)

feeds = config["feeds"]
topics = config["topics"]

# --- Initialize processing cache ---
cache = SQLiteProcessingCache()
print(f"Cache stats: {cache.get_cache_stats()}")

model_path = Path(Path(__file__).parent.parent / "models")

# --- Setup LLM for topic classification ---
print("Loading GPT4All model...")
llm = GPT4All(
    model_name="phi-2.Q4_0.gguf",
    model_path=model_path,
    device='cpu',
    verbose=False
)
print("Model loaded successfully!")

# --- Configuration ---
SUMMARY_LENGTH_THRESHOLD = 400  # Characters above which to generate LLM summary
LLM_SUMMARY_TARGET_LENGTH = 50   # Target length for LLM-generated summaries in words
LLM_SUMMARY_MAX_CHARS = 250      # Maximum character limit for LLM summaries (increased slightly)

# --- Helper functions ---

def match_topic(entry, keywords):
    """Check if article matches topic keywords with word boundaries"""
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
    # Truncate summary to avoid context window issues
    summary = entry.get('summary', 'No summary available')
    if len(summary) > 500:  # Limit summary length
        summary = summary[:500] + "..."
    
    prompt = f"""
Task: Determine if this news article belongs to the topic "{topic}".

Topic Description: {topic_description}

Article Title: {entry.title}
Article Summary: {summary}

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
    """Extract and process article summary, handling both HTML and plain text"""
    summary = entry.get("summary", "No summary available")
    
    # Check if the summary contains HTML tags
    html_pattern = r'<[^>]+>'
    if re.search(html_pattern, summary):
        # It's HTML - clean it up
        # Remove HTML tags but preserve the text content
        clean_summary = re.sub(r'<[^>]+>', '', summary)
        # Decode HTML entities like &amp; &lt; etc.
        clean_summary = html.unescape(clean_summary)
        # Clean up extra whitespace and newlines
        clean_summary = re.sub(r'\s+', ' ', clean_summary).strip()
        
        # Store both versions
        return {
            "text": clean_summary,
            "html": summary,
            "is_html": True
        }
    else:
        # Plain text summary
        return {
            "text": summary,
            "html": None,
            "is_html": False
        }

def llm_generate_summary(title, original_summary, target_length_words=50):
    """Use LLM to generate a concise summary when the original is too long"""
    # Truncate the original summary to avoid context window issues
    if len(original_summary) > 800:
        original_summary = original_summary[:800] + "..."
    
    prompt = f"""
Task: Create a very short, concise summary of this news article for a news digest.

Article Title: {title}

Original Summary: {original_summary}

Instructions:
- Write ONLY 1-2 sentences maximum
- Keep it under {target_length_words} words
- Focus on the single most important point
- Use simple, clear language
- No HTML, markdown, or special formatting
- End immediately after the key information

Summary:
"""
    
    try:
        response = llm.generate(prompt, max_tokens=100)  # Reduced token limit
        
        # Clean up the response aggressively
        summary = response.strip()
        
        # Remove model artifacts and tokens
        summary = re.sub(r'<\|.*?\|>', '', summary)
        summary = re.sub(r'<\|.*?>', '', summary)   
        summary = re.sub(r'\|.*?>', '', summary)    
        summary = re.sub(r'<.*?>', '', summary)     
        
        # Remove common stopping patterns more aggressively
        stop_patterns = [
            'about me:', 'tech stack:', 'conclusion:', 'in conclusion:',
            'hope you found', 'happy coding', 'github:', 'source:',
            'the article', 'this article', 'the author', 'in summary:',
            'to summarize:', 'overall:', 'finally:', 'additionally:'
        ]
        
        summary_lower = summary.lower()
        for pattern in stop_patterns:
            if pattern in summary_lower:
                idx = summary_lower.find(pattern)
                summary = summary[:idx].strip()
                break
        
        # Clean up formatting
        summary = re.sub(r'\n+', ' ', summary)
        summary = re.sub(r'\s+', ' ', summary)
        summary = summary.strip()
        
        # Take only the first sentence or two if it's still too long
        if len(summary) > LLM_SUMMARY_MAX_CHARS:
            # Split into sentences
            sentences = re.split(r'[.!?]+', summary)
            if len(sentences) > 1:
                # Take first sentence and add period if missing
                summary = sentences[0].strip()
                if summary and not summary[-1] in '.!?':
                    summary += '.'
            else:
                # Truncate to character limit
                summary = summary[:LLM_SUMMARY_MAX_CHARS].strip()
                if not summary[-1] in '.!?':
                    summary = summary[:summary.rfind(' ')] + '.'
        
        # Ensure proper sentence ending
        if summary and not summary[-1] in '.!?':
            summary += '.'
        
        # Final validation
        if len(summary) < 10:  # Too short
            return None
            
        if len(summary) > LLM_SUMMARY_MAX_CHARS + 50:  # More forgiving limit
            return None
            
        return summary
        
    except Exception as e:
        print(f"Error generating LLM summary: {e}")
        return None

# --- Parse and collect matches with two-stage filtering ---
matched = {topic: [] for topic in topics}
all_keywords_used = {topic: set() for topic in topics}

processed_count = 0
cached_count = 0
new_count = 0

for url in feeds:
    feed = feedparser.parse(url)
    print(f"\nProcessing feed: {url}")
    
    for entry in feed.entries:
        processed_count += 1
        print(f"Processing entry {processed_count}: {entry.title}")
        
        # Check if we should process this article
        should_process, reason = cache.should_process_article(entry)
        
        if not should_process:
            # Use cached result
            cached_result = cache.get_cached_result(entry)
            if cached_result:
                topic_name = cached_result.get("topic")
                if topic_name and topic_name in matched:
                    matched[topic_name].append(cached_result["article_data"])
                    all_keywords_used[topic_name].update(cached_result["article_data"]["matched_keywords"])
                    cached_count += 1
                    print(f"  ✓ Using cached result for {topic_name}")
                continue
        else:
            new_count += 1
            print(f"  🔄 Processing ({reason})")
        
        # Process the article (existing logic)
        article_processed = False
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
                    summary_data = get_entry_summary(entry)
                    
                    # Check if summary is too long and generate LLM summary if needed
                    llm_summary = None
                    original_summary = summary_data["text"]
                    
                    if len(original_summary) > SUMMARY_LENGTH_THRESHOLD:
                        print(f"  📝 Summary too long ({len(original_summary)} chars), generating LLM summary...")
                        llm_summary = llm_generate_summary(entry.title, original_summary, LLM_SUMMARY_TARGET_LENGTH)
                        if llm_summary:
                            print(f"  ✓ LLM summary generated ({len(llm_summary)} chars)")
                        else:
                            print(f"  ⚠️ LLM summary generation failed, using original")
                    
                    # Get publication date
                    published_time = getattr(entry, 'published_parsed', None)
                    if not published_time:
                        published_time = getattr(entry, 'updated_parsed', None)
                    
                    article_data = {
                        "title": entry.title,
                        "link": entry.link,
                        "summary": llm_summary if llm_summary else summary_data["text"],  # Use LLM summary if available
                        "summary_original": summary_data["text"],  # Keep original summary
                        "summary_html": summary_data["html"],  # Original HTML if present
                        "is_html_summary": summary_data["is_html"],  # Flag for frontend
                        "has_llm_summary": llm_summary is not None,  # Flag indicating LLM summary was used
                        "from_feed": url,
                        "published_parsed": published_time,
                        "published": getattr(entry, 'published', 'Date not available'),
                        "matched_keywords": matched_keywords,
                        "keyword_matches": keyword_matches,
                        "ai_reasoning": ai_reasoning
                    }
                    
                    matched[topic_name].append(article_data)
                    all_keywords_used[topic_name].update(matched_keywords)
                    
                    # Cache the result
                    cache_data = {
                        "topic": topic_name,
                        "article_data": article_data,
                        "keywords_matched": matched_keywords,
                        "ai_reasoning": ai_reasoning
                    }
                    cache.mark_article_processed(entry, cache_data)
                    
                    print(f"  ✓ Article confirmed for {topic_name}")
                    article_processed = True
                    break  # Only assign to one topic
                else:
                    print(f"  ✗ Article rejected for {topic_name} - Reason: {ai_reasoning}")
            # If no keywords match, don't even check with LLM
        
        # If article wasn't processed by any topic, still cache the negative result
        if not article_processed:
            cache.mark_article_processed(entry, {"topic": None, "processed": False})

# Sort articles by date (newest first) within each topic
for topic in matched:
    matched[topic].sort(
        key=lambda x: x['published_parsed'] if x['published_parsed'] else time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0)),
        reverse=True
    )

# Clean up old cache entries (older than 30 days) and optimize database
old_entries_removed = cache.clean_old_entries(max_age_days=30)
if old_entries_removed > 0:
    print(f"Cleaned up {old_entries_removed} old cache entries")
    cache.vacuum_database()
    print("Database optimized")

# Print final results
print(f"\nProcessing Summary:")
print(f"  Total entries processed: {processed_count}")
print(f"  Cached entries used: {cached_count}")
print(f"  New entries processed: {new_count}")
print(f"\nFinal results:")
for topic, articles in matched.items():
    print(f"  {topic}: {len(articles)} articles")

# Save results to JSON files - one per topic in a separate directory
output_dir = Path(Path(__file__).parent)
topics_dir = output_dir / "topics"
topics_dir.mkdir(exist_ok=True)

# Create topics index for React app
topics_index = {
    "topics": list(topics.keys()),
    "generated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
    "summary": {
        "total_topics": len(matched),
        "total_articles": sum(len(articles) for articles in matched.values()),
        "articles_by_topic": {topic: len(articles) for topic, articles in matched.items()}
    }
}

# Save topics index
index_path = topics_dir / "index.json"
with open(index_path, "w") as f:
    json.dump(topics_index, f, indent=2, default=str)

# Save individual topic files
for topic, articles in matched.items():
    topic_filename = f"{topic.lower().replace(' ', '_')}.json"
    topic_path = topics_dir / topic_filename
    
    topic_data = {
        "topic": topic,
        "articles": articles,
        "total_articles": len(articles),
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    }
    
    with open(topic_path, "w") as f:
        json.dump(topic_data, f, indent=2, default=str)
    
    print(f"  {topic}: saved {len(articles)} articles to topics/{topic_filename}")

print(f"\nTopic files saved to: {topics_dir}")
print(f"Topics index saved to: {index_path}")

# Show updated cache stats
final_stats = cache.get_cache_stats()
print(f"\nFinal cache stats:")
print(f"  Database size: {final_stats['cache_size_mb']} MB")
print(f"  Total cached articles: {final_stats['total_cached_articles']}")
print(f"  Current version articles: {final_stats['current_version_articles']}")
if final_stats['articles_by_topic']:
    print(f"  Articles by topic: {final_stats['articles_by_topic']}")
