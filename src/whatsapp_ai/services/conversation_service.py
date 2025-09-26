"""
Conversation management service
"""

import json
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

from ..config import config


class ConversationService:
    """Manages conversation context and persistence"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.conversations: Dict[str, List[Dict[str, Any]]] = {}
        self.max_context_messages = config.bot.max_context_messages
        
        # Initialize storage
        self._init_storage()
    
    def _init_storage(self):
        """Initialize storage backend"""
        if config.system.database_type == "sqlite":
            self._init_sqlite()
        else:
            self._init_json_storage()
    
    def _init_sqlite(self):
        """Initialize SQLite database"""
        try:
            db_path = Path(config.system.database_path)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            self.db_path = str(db_path)
            
            # Create tables
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        chat_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT
                    )
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_id_timestamp 
                    ON conversations(chat_id, timestamp)
                """)
                
                conn.commit()
                
            self.logger.info("✅ SQLite database initialized")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize SQLite: {e}")
            self._init_json_storage()
    
    def _init_json_storage(self):
        """Initialize JSON file storage as fallback"""
        self.data_dir = Path(config.system.data_path)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.conversations_file = self.data_dir / "conversations.json"
        
        # Load existing conversations
        if self.conversations_file.exists():
            try:
                with open(self.conversations_file, 'r', encoding='utf-8') as f:
                    self.conversations = json.load(f)
                self.logger.info("✅ Conversations loaded from JSON")
            except Exception as e:
                self.logger.error(f"❌ Error loading conversations: {e}")
                self.conversations = {}
    
    async def add_message(self, chat_id: str, role: str, content: str, metadata: Dict[str, Any] = None):
        """Add a message to conversation context"""
        try:
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat(),
                "metadata": metadata or {}
            }
            
            if config.system.database_type == "sqlite":
                await self._add_message_sqlite(chat_id, message)
            else:
                await self._add_message_json(chat_id, message)
                
        except Exception as e:
            self.logger.error(f"❌ Error adding message: {e}")
    
    async def _add_message_sqlite(self, chat_id: str, message: Dict[str, Any]):
        """Add message to SQLite database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO conversations (chat_id, role, content, metadata)
                    VALUES (?, ?, ?, ?)
                """, (
                    chat_id,
                    message["role"],
                    message["content"],
                    json.dumps(message["metadata"])
                ))
                conn.commit()
                
        except Exception as e:
            self.logger.error(f"❌ SQLite error: {e}")
    
    async def _add_message_json(self, chat_id: str, message: Dict[str, Any]):
        """Add message to JSON storage"""
        if chat_id not in self.conversations:
            self.conversations[chat_id] = []
        
        self.conversations[chat_id].append(message)
        
        # Limit context size
        if len(self.conversations[chat_id]) > self.max_context_messages * 2:
            self.conversations[chat_id] = self.conversations[chat_id][-self.max_context_messages:]
        
        # Save to file
        await self._save_conversations()
    
    async def _save_conversations(self):
        """Save conversations to JSON file"""
        try:
            with open(self.conversations_file, 'w', encoding='utf-8') as f:
                json.dump(self.conversations, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"❌ Error saving conversations: {e}")
    
    def get_context(self, chat_id: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
        """Get conversation context for a chat"""
        try:
            if limit is None:
                limit = self.max_context_messages
            
            if config.system.database_type == "sqlite":
                return self._get_context_sqlite(chat_id, limit)
            else:
                return self._get_context_json(chat_id, limit)
                
        except Exception as e:
            self.logger.error(f"❌ Error getting context: {e}")
            return []
    
    def _get_context_sqlite(self, chat_id: str, limit: int) -> List[Dict[str, str]]:
        """Get context from SQLite database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT role, content FROM conversations 
                    WHERE chat_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (chat_id, limit))
                
                messages = []
                for row in cursor.fetchall():
                    messages.append({
                        "role": row[0],
                        "content": row[1]
                    })
                
                # Reverse to get chronological order
                return list(reversed(messages))
                
        except Exception as e:
            self.logger.error(f"❌ SQLite context error: {e}")
            return []
    
    def _get_context_json(self, chat_id: str, limit: int) -> List[Dict[str, str]]:
        """Get context from JSON storage"""
        if chat_id not in self.conversations:
            return []
        
        messages = self.conversations[chat_id][-limit:]
        return [{"role": msg["role"], "content": msg["content"]} for msg in messages]
    
    def get_formatted_context(self, chat_id: str, system_prompt: str = None) -> List[Dict[str, str]]:
        """Get formatted context with system prompt"""
        context = []
        
        # Add system prompt if provided
        if system_prompt:
            context.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add conversation history
        context.extend(self.get_context(chat_id))
        
        return context
    
    async def clear_context(self, chat_id: str) -> bool:
        """Clear conversation context for a chat"""
        try:
            if config.system.database_type == "sqlite":
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute("DELETE FROM conversations WHERE chat_id = ?", (chat_id,))
                    conn.commit()
            else:
                if chat_id in self.conversations:
                    del self.conversations[chat_id]
                await self._save_conversations()
            
            self.logger.info(f"✅ Context cleared for {chat_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error clearing context: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get conversation statistics"""
        try:
            if config.system.database_type == "sqlite":
                return await self._get_stats_sqlite()
            else:
                return await self._get_stats_json()
                
        except Exception as e:
            self.logger.error(f"❌ Error getting stats: {e}")
            return {}
    
    async def _get_stats_sqlite(self) -> Dict[str, Any]:
        """Get statistics from SQLite"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Total conversations
                cursor = conn.execute("SELECT COUNT(DISTINCT chat_id) FROM conversations")
                total_chats = cursor.fetchone()[0]
                
                # Total messages
                cursor = conn.execute("SELECT COUNT(*) FROM conversations")
                total_messages = cursor.fetchone()[0]
                
                # Messages today
                today = datetime.now().date()
                cursor = conn.execute("""
                    SELECT COUNT(*) FROM conversations 
                    WHERE DATE(timestamp) = ?
                """, (today,))
                messages_today = cursor.fetchone()[0]
                
                # Active chats (last 24 hours)
                yesterday = datetime.now() - timedelta(days=1)
                cursor = conn.execute("""
                    SELECT COUNT(DISTINCT chat_id) FROM conversations 
                    WHERE timestamp > ?
                """, (yesterday.isoformat(),))
                active_chats = cursor.fetchone()[0]
                
                return {
                    "total_conversations": total_chats,
                    "total_messages": total_messages,
                    "messages_today": messages_today,
                    "active_chats_24h": active_chats,
                    "storage_type": "sqlite"
                }
                
        except Exception as e:
            self.logger.error(f"❌ SQLite stats error: {e}")
            return {}
    
    async def _get_stats_json(self) -> Dict[str, Any]:
        """Get statistics from JSON storage"""
        total_chats = len(self.conversations)
        total_messages = sum(len(messages) for messages in self.conversations.values())
        
        # Count messages today
        today = datetime.now().date()
        messages_today = 0
        active_chats = 0
        
        for chat_id, messages in self.conversations.items():
            chat_active = False
            for message in messages:
                try:
                    msg_date = datetime.fromisoformat(message["timestamp"]).date()
                    if msg_date == today:
                        messages_today += 1
                        chat_active = True
                except:
                    pass
            
            if chat_active:
                active_chats += 1
        
        return {
            "total_conversations": total_chats,
            "total_messages": total_messages,
            "messages_today": messages_today,
            "active_chats_24h": active_chats,
            "storage_type": "json"
        }
    
    async def cleanup_old_data(self, days: int = 30) -> int:
        """Clean up old conversation data"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            if config.system.database_type == "sqlite":
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute("""
                        DELETE FROM conversations 
                        WHERE timestamp < ?
                    """, (cutoff_date.isoformat(),))
                    deleted = cursor.rowcount
                    conn.commit()
            else:
                deleted = 0
                for chat_id in list(self.conversations.keys()):
                    messages = self.conversations[chat_id]
                    original_count = len(messages)
                    
                    # Filter out old messages
                    self.conversations[chat_id] = [
                        msg for msg in messages
                        if datetime.fromisoformat(msg["timestamp"]) > cutoff_date
                    ]
                    
                    deleted += original_count - len(self.conversations[chat_id])
                    
                    # Remove empty conversations
                    if not self.conversations[chat_id]:
                        del self.conversations[chat_id]
                
                await self._save_conversations()
            
            self.logger.info(f"✅ Cleaned up {deleted} old messages")
            return deleted
            
        except Exception as e:
            self.logger.error(f"❌ Error cleaning up data: {e}")
            return 0
