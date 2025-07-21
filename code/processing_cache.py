import json
import hashlib
import os
from pathlib import Path
from datetime import datetime

class ProcessingCache:
    def __init__(self, cache_file="processing_cache.json"):
        self.cache_file = Path(Path(__file__).parent, cache_file)
        self.cache = self._load_cache()
        self.script_version = self._get_script_version()
    
    def _load_cache(self):
        """Load existing cache or create new one"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                pass
        
        return {
            "script_version": "",
            "articles": {},
            "last_updated": ""
        }
    
    def _get_script_version(self):
        """Generate a version hash based on the main script content"""
        script_path = Path(Path(__file__).parent, "generate_news_digest.py")
        try:
            with open(script_path, 'r') as f:
                content = f.read()
            
            # Include key parts that affect processing logic
            # Remove comments and whitespace to focus on actual logic
            import re
            # Remove comments
            content = re.sub(r'#.*', '', content)
            # Remove extra whitespace
            content = re.sub(r'\s+', ' ', content).strip()
            
            return hashlib.md5(content.encode()).hexdigest()[:12]
        except FileNotFoundError:
            return "unknown"
    
    def _get_article_key(self, entry):
        """Generate unique key for an article"""
        # Use title + link as unique identifier
        title = getattr(entry, 'title', '') or ''
        link = getattr(entry, 'link', '') or ''
        return hashlib.md5(f"{title}|{link}".encode()).hexdigest()
    
    def should_process_article(self, entry):
        """Check if article needs processing"""
        article_key = self._get_article_key(entry)
        
        # Check if article exists in cache
        if article_key not in self.cache["articles"]:
            return True, "new_article"
        
        # Check if script version has changed
        cached_version = self.cache["articles"][article_key].get("script_version", "")
        if cached_version != self.script_version:
            return True, "script_updated"
        
        return False, "already_processed"
    
    def mark_article_processed(self, entry, result_data):
        """Mark article as processed with current script version"""
        article_key = self._get_article_key(entry)
        
        self.cache["articles"][article_key] = {
            "title": getattr(entry, 'title', ''),
            "link": getattr(entry, 'link', ''),
            "script_version": self.script_version,
            "processed_at": datetime.now().isoformat(),
            "result": result_data  # Store the actual processing result
        }
    
    def get_cached_result(self, entry):
        """Get cached processing result if available and valid"""
        article_key = self._get_article_key(entry)
        
        if article_key in self.cache["articles"]:
            cached_article = self.cache["articles"][article_key]
            if cached_article.get("script_version") == self.script_version:
                return cached_article.get("result")
        
        return None
    
    def save_cache(self):
        """Save cache to disk"""
        self.cache["script_version"] = self.script_version
        self.cache["last_updated"] = datetime.now().isoformat()
        
        with open(self.cache_file, 'w') as f:
            json.dump(self.cache, f, indent=2)
    
    def get_cache_stats(self):
        """Get statistics about the cache"""
        total_articles = len(self.cache["articles"])
        current_version_articles = sum(
            1 for article in self.cache["articles"].values()
            if article.get("script_version") == self.script_version
        )
        
        return {
            "total_cached_articles": total_articles,
            "current_version_articles": current_version_articles,
            "outdated_articles": total_articles - current_version_articles,
            "current_script_version": self.script_version,
            "cache_file": str(self.cache_file)
        }
    
    def clean_old_entries(self, max_age_days=30):
        """Remove cache entries older than specified days"""
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        
        articles_to_remove = []
        for key, article in self.cache["articles"].items():
            try:
                processed_at = datetime.fromisoformat(article.get("processed_at", ""))
                if processed_at < cutoff_date:
                    articles_to_remove.append(key)
            except (ValueError, TypeError):
                # Remove entries with invalid dates
                articles_to_remove.append(key)
        
        for key in articles_to_remove:
            del self.cache["articles"][key]
        
        return len(articles_to_remove)
