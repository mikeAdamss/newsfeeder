import feedparser
import yaml
from pathlib import Path
import requests
from gpt4all import GPT4All
import re
import time
import json
import html
from html.parser import HTMLParser
import os

# --- Load config ---
config_dir = Path(__file__).parent
custom_config_path = config_dir / "custom_config.yaml"
default_config_path = config_dir / "config.yaml"
config_path = custom_config_path if custom_config_path.exists() else default_config_path
with open(config_path, "r") as f:
    config = yaml.safe_load(f)

feeds = config["feeds"]
topics = config["topics"]
max_processing_time = config.get("max_processing_time", 0)  # In seconds, 0 means unlimited

# --- Initialize processing cache ---
cache_db_path = config_dir / ("custom_processing_cache.db" if (config_dir / "custom_processing_cache.db").exists() else "processing_cache.db")
from sqlite_cache import SQLiteProcessingCache
cache = SQLiteProcessingCache(str(cache_db_path))
print(f"Cache stats: {cache.get_cache_stats()} (using {cache_db_path.name})")

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
SUMMARY_LENGTH_THRESHOLD = 200  # Characters above which to generate LLM summary
LLM_SUMMARY_TARGET_LENGTH = 150  # Target length for LLM-generated summaries in words (more aggressive)
LLM_SUMMARY_MAX_CHARS = 200     # Maximum character limit for LLM summaries (more restrictive)

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
Task: Create an extremely short, one-sentence summary for a news digest.

Article Title: {title}

Original Summary: {original_summary}

Instructions:
- Write ONLY one short sentence
- Maximum {target_length_words} words total
- Focus on the main point only
- No details, examples, or background
- Simple, clear language
- No HTML, markdown, quotes, or formatting
- End with a period

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
        
        # Final aggressive truncation if still too long
        if len(summary) > LLM_SUMMARY_MAX_CHARS:
            # Force truncate at word boundary
            words = summary.split()
            truncated = []
            current_length = 0
            for word in words:
                if current_length + len(word) + 1 > LLM_SUMMARY_MAX_CHARS - 1:  # Leave room for period
                    break
                truncated.append(word)
                current_length += len(word) + 1
            summary = ' '.join(truncated)
            if not summary.endswith('.'):
                summary += '.'
        
        # Final validation
        if len(summary) < 10:  # Too short
            return None
            
        return summary
        
    except Exception as e:
        print(f"Error generating LLM summary: {e}")
        return None

def llm_relevance_percent(entry, topic, topic_description, user_interest):
    """Use LLM to rate article relevance to user interest as a percentage (0-100) and provide a reason"""
    summary = entry.get('summary', 'No summary available')
    if len(summary) > 500:
        summary = summary[:500] + "..."
    prompt = f'''
Task: Rate how relevant this article is to the user's interest in the topic "{topic}".

Topic Description: {topic_description}
User Interest: {user_interest}
Article Title: {entry.title}
Article Summary: {summary}

Question: On a scale from 0% (not relevant) to 100% (perfectly relevant), what percentage best represents how well this article matches the user's interest? Answer with a single number (0-100) followed by a brief reason.
'''
    try:
        response = llm.generate(prompt, max_tokens=50).strip()
        import re
        match = re.match(r"(\d{1,3})\s*[%]?[\s:.,-]+(.*)", response)
        if match:
            percent = int(match.group(1))
            percent = max(0, min(percent, 100))
            reason = match.group(2).strip()
            return percent, reason
        # Fallback: try to extract a number
        numbers = re.findall(r"\d{1,3}", response)
        percent = int(numbers[0]) if numbers else None
        if percent is not None:
            percent = max(0, min(percent, 100))
        return percent, response
    except Exception as e:
        print(f"Error scoring relevance for '{entry.title}': {e}")
        return None, f"llm error: {str(e).lower()}"

# --- Parse and collect matches with two-stage filtering ---
matched = {topic: [] for topic in topics}
all_keywords_used = {topic: set() for topic in topics}

processed_count = 0
cached_count = 0
new_count = 0

start_time = time.time()

for url in feeds:
    feed = feedparser.parse(url)
    print(f"\nProcessing feed: {url}")
    
    for entry in feed.entries:
        # Check time limit before processing each article
        if max_processing_time and (time.time() - start_time) > max_processing_time:
            print(f"\nMax processing time of {max_processing_time} seconds reached. Stopping early and saving progress.")
            break
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
            user_interest = topic_config.get('user_interest', '')
            
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
                    final_summary = original_summary
                    
                    if len(original_summary) > SUMMARY_LENGTH_THRESHOLD:
                        print(f"  📝 Summary too long ({len(original_summary)} chars), generating LLM summary...")
                        llm_summary = llm_generate_summary(entry.title, original_summary, LLM_SUMMARY_TARGET_LENGTH)
                        if llm_summary:
                            print(f"  ✓ LLM summary generated ({len(llm_summary)} chars)")
                            final_summary = llm_summary
                        else:
                            print(f"  ⚠️ LLM summary generation failed, using placeholder")
                            # Fallback: use placeholder for failed summarization
                            final_summary = "-"
                    
                    # Get publication date
                    published_time = getattr(entry, 'published_parsed', None)
                    if not published_time:
                        published_time = getattr(entry, 'updated_parsed', None)
                    
                    # LLM relevance percent for user interest
                    relevance_percent, relevance_reason = llm_relevance_percent(entry, topic_name, description, user_interest)
                    
                    article_data = {
                        "title": entry.title,
                        "link": entry.link,
                        "summary": final_summary,  # Use LLM summary, fallback truncation, or original
                        "summary_original": summary_data["text"],  # Keep original summary
                        "summary_html": summary_data["html"],  # Original HTML if present
                        "is_html_summary": summary_data["is_html"],  # Flag for frontend
                        "has_llm_summary": llm_summary is not None,  # Flag indicating LLM summary was used
                        "has_placeholder_summary": (llm_summary is None and len(original_summary) > SUMMARY_LENGTH_THRESHOLD),  # Flag indicating placeholder was used due to failed summarization
                        "from_feed": url,
                        "published_parsed": published_time,
                        "published": getattr(entry, 'published', 'Date not available'),
                        "matched_keywords": matched_keywords,
                        "keyword_matches": keyword_matches,
                        "ai_reasoning": ai_reasoning,
                        "relevance_percent": relevance_percent,
                        "relevance_reason": relevance_reason
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

    # If time limit reached, stop processing further feeds
    if max_processing_time and (time.time() - start_time) > max_processing_time:
        break

# Sort articles by date (newest first) within each topic
def get_sort_key(article):
    """Get a consistent sort key for article dates"""
    published = article.get('published_parsed')
    
    if not published:
        # No date available, use epoch time
        return time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0))
    
    # Handle different types of date formats
    if isinstance(published, time.struct_time):
        return published
    elif isinstance(published, (list, tuple)) and len(published) >= 6:
        # Convert list/tuple to struct_time
        try:
            return time.struct_time(tuple(published[:9]) + (0,) * (9 - len(published)))
        except (ValueError, TypeError):
            return time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0))
    else:
        # Fallback for other types
        return time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0))

for topic in matched:
    matched[topic].sort(key=get_sort_key, reverse=True)

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
