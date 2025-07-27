import sqlite3
import json
from pathlib import Path
import sys
import time
import yaml

def export_json_from_cache(
    db_path="backend/processing_cache.db",
    config_path="backend/config.yaml",
    output_dir="backend/topics"
):
    # Load config for topic names and descriptions
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    topics = config["topics"]

    # Connect to SQLite cache
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Fetch all articles with topic assignments
    cursor.execute("SELECT result_json FROM article_cache WHERE topic IS NOT NULL AND topic != ''")
    rows = cursor.fetchall()

    # Organize articles by topic
    matched = {topic: [] for topic in topics}
    for (result_json,) in rows:
        try:
            cache_data = json.loads(result_json)
            topic = cache_data.get("topic")
            article_data = cache_data.get("article_data")
            if topic and article_data and topic in matched:
                matched[topic].append(article_data)
        except Exception as e:
            print(f"Error parsing cache row: {e}")
            continue

    # Sort articles by date (newest first)
    def get_sort_key(article):
        published = article.get('published_parsed')
        if not published:
            return time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0))
        if isinstance(published, (list, tuple)) and len(published) >= 6:
            try:
                return time.struct_time(tuple(published[:9]) + (0,) * (9 - len(published)))
            except Exception:
                return time.struct_time((1970, 1, 1, 0, 0, 0, 0, 0, 0))
        return published
    for topic in matched:
        matched[topic].sort(key=get_sort_key, reverse=True)

    # Prepare output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Create topics index
    topics_index = {
        "topics": list(topics.keys()),
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        "summary": {
            "total_topics": len(matched),
            "total_articles": sum(len(articles) for articles in matched.values()),
            "articles_by_topic": {topic: len(articles) for topic, articles in matched.items()}
        }
    }
    with open(Path(output_dir) / "index.json", "w") as f:
        json.dump(topics_index, f, indent=2, default=str)

    # Write per-topic files
    for topic, articles in matched.items():
        topic_filename = f"{topic.lower().replace(' ', '_')}.json"
        topic_path = Path(output_dir) / topic_filename
        topic_data = {
            "topic": topic,
            "articles": articles,
            "total_articles": len(articles),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        }
        with open(topic_path, "w") as f:
            json.dump(topic_data, f, indent=2, default=str)
        print(f"  {topic}: exported {len(articles)} articles to {topic_path}")
    print(f"\nTopic files exported to: {output_dir}")
    print(f"Topics index exported to: {Path(output_dir) / 'index.json'}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Export per-topic JSON files from the processing cache.")
    parser.add_argument("--db", default="backend/processing_cache.db", help="Path to SQLite cache DB")
    parser.add_argument("--config", default="backend/config.yaml", help="Path to config.yaml")
    parser.add_argument("--output", default="backend/topics", help="Output directory for JSON files")
    args = parser.parse_args()
    export_json_from_cache(args.db, args.config, args.output)
