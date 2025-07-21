import sqlite3
import hashlib
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

class SQLiteProcessingCache:
    def __init__(self, db_file="processing_cache.db"):
        self.db_file = Path(Path(__file__).parent, db_file)
        self.script_version = self._get_script_version()
        self._init_database()
    
    def _init_database(self):
        """Initialize the SQLite database with required tables"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Create articles cache table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS article_cache (
                article_key TEXT PRIMARY KEY,
                title TEXT,
                link TEXT,
                script_version TEXT,
                processed_at TIMESTAMP,
                result_json TEXT,
                topic TEXT,
                matched_keywords TEXT,
                from_feed TEXT
            )
        ''')
        
        # Create metadata table for script versions and stats
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cache_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP
            )
        ''')
        
        # Create index for faster lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_script_version 
            ON article_cache(script_version)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_processed_at 
            ON article_cache(processed_at)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_topic 
            ON article_cache(topic)
        ''')
        
        conn.commit()
        conn.close()
    
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
        title = getattr(entry, 'title', '') or ''
        link = getattr(entry, 'link', '') or ''
        return hashlib.md5(f"{title}|{link}".encode()).hexdigest()
    
    def should_process_article(self, entry) -> Tuple[bool, str]:
        """Check if article needs processing"""
        article_key = self._get_article_key(entry)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Check if article exists in cache with current script version
        cursor.execute('''
            SELECT script_version FROM article_cache 
            WHERE article_key = ? AND script_version = ?
        ''', (article_key, self.script_version))
        
        result = cursor.fetchone()
        conn.close()
        
        if result is None:
            # Check if article exists but with old version
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            cursor.execute('SELECT script_version FROM article_cache WHERE article_key = ?', (article_key,))
            old_result = cursor.fetchone()
            conn.close()
            
            if old_result:
                return True, "script_updated"
            else:
                return True, "new_article"
        
        return False, "already_processed"
    
    def mark_article_processed(self, entry, result_data: Dict[str, Any]):
        """Mark article as processed with current script version"""
        article_key = self._get_article_key(entry)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Extract some key fields for easier querying
        topic = result_data.get("topic")
        matched_keywords = json.dumps(result_data.get("keywords_matched", []))
        from_feed = None
        if result_data.get("article_data"):
            from_feed = result_data["article_data"].get("from_feed")
        
        # Insert or replace the cache entry
        cursor.execute('''
            INSERT OR REPLACE INTO article_cache 
            (article_key, title, link, script_version, processed_at, result_json, topic, matched_keywords, from_feed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            article_key,
            getattr(entry, 'title', ''),
            getattr(entry, 'link', ''),
            self.script_version,
            datetime.now(),
            json.dumps(result_data),
            topic,
            matched_keywords,
            from_feed
        ))
        
        conn.commit()
        conn.close()
    
    def get_cached_result(self, entry) -> Optional[Dict[str, Any]]:
        """Get cached processing result if available and valid"""
        article_key = self._get_article_key(entry)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT result_json FROM article_cache 
            WHERE article_key = ? AND script_version = ?
        ''', (article_key, self.script_version))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            try:
                return json.loads(result[0])
            except json.JSONDecodeError:
                return None
        
        return None
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the cache"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Total articles in cache
        cursor.execute('SELECT COUNT(*) FROM article_cache')
        total_articles = cursor.fetchone()[0]
        
        # Articles with current script version
        cursor.execute('SELECT COUNT(*) FROM article_cache WHERE script_version = ?', (self.script_version,))
        current_version_articles = cursor.fetchone()[0]
        
        # Articles by topic (for current version)
        cursor.execute('''
            SELECT topic, COUNT(*) FROM article_cache 
            WHERE script_version = ? AND topic IS NOT NULL 
            GROUP BY topic
        ''', (self.script_version,))
        articles_by_topic = dict(cursor.fetchall())
        
        # Cache file size
        cache_size_mb = self.db_file.stat().st_size / (1024 * 1024) if self.db_file.exists() else 0
        
        conn.close()
        
        return {
            "total_cached_articles": total_articles,
            "current_version_articles": current_version_articles,
            "outdated_articles": total_articles - current_version_articles,
            "articles_by_topic": articles_by_topic,
            "current_script_version": self.script_version,
            "cache_file": str(self.db_file),
            "cache_size_mb": round(cache_size_mb, 2)
        }
    
    def clean_old_entries(self, max_age_days=30) -> int:
        """Remove cache entries older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Count entries to be deleted
        cursor.execute('SELECT COUNT(*) FROM article_cache WHERE processed_at < ?', (cutoff_date,))
        count_to_delete = cursor.fetchone()[0]
        
        # Delete old entries
        cursor.execute('DELETE FROM article_cache WHERE processed_at < ?', (cutoff_date,))
        
        conn.commit()
        conn.close()
        
        return count_to_delete
    
    def vacuum_database(self):
        """Optimize database by reclaiming unused space"""
        conn = sqlite3.connect(self.db_file)
        conn.execute('VACUUM')
        conn.close()
    
    def get_articles_by_topic(self, topic: str, limit: Optional[int] = None) -> list:
        """Get cached articles for a specific topic (useful for debugging)"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        query = '''
            SELECT title, link, processed_at, matched_keywords 
            FROM article_cache 
            WHERE topic = ? AND script_version = ? 
            ORDER BY processed_at DESC
        '''
        params = [topic, self.script_version]
        
        if limit:
            query += ' LIMIT ?'
            params.append(limit)
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                "title": row[0],
                "link": row[1], 
                "processed_at": row[2],
                "matched_keywords": json.loads(row[3]) if row[3] else []
            }
            for row in results
        ]
    
    def export_to_json(self, output_file: str = None) -> str:
        """Export cache to JSON format (for backup or analysis)"""
        if not output_file:
            output_file = f"cache_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT article_key, title, link, script_version, processed_at, result_json, topic
            FROM article_cache
            ORDER BY processed_at DESC
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        export_data = {
            "export_date": datetime.now().isoformat(),
            "script_version": self.script_version,
            "total_articles": len(results),
            "articles": [
                {
                    "article_key": row[0],
                    "title": row[1],
                    "link": row[2],
                    "script_version": row[3],
                    "processed_at": row[4],
                    "result": json.loads(row[5]) if row[5] else None,
                    "topic": row[6]
                }
                for row in results
            ]
        }
        
        output_path = Path(Path(__file__).parent, output_file)
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)
        
        return str(output_path)
