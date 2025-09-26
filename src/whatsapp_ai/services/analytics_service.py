"""
Analytics service for tracking usage and performance
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from pathlib import Path
import logging

from ..config import config


class AnalyticsService:
    """Manages analytics and usage tracking"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.analytics_data = {
            "messages": [],
            "commands": [],
            "users": {},
            "errors": [],
            "performance": []
        }
        
        # Initialize storage
        self._init_storage()
    
    def _init_storage(self):
        """Initialize analytics storage"""
        if config.system.database_type == "sqlite":
            self._init_sqlite_analytics()
        else:
            self._init_json_analytics()
    
    def _init_sqlite_analytics(self):
        """Initialize SQLite analytics tables"""
        try:
            db_path = Path(config.system.database_path)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            with sqlite3.connect(str(db_path)) as conn:
                # Messages analytics
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS analytics_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        chat_id TEXT NOT NULL,
                        message_type TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        response_time REAL,
                        success BOOLEAN DEFAULT TRUE
                    )
                """)
                
                # Commands analytics
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS analytics_commands (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        chat_id TEXT NOT NULL,
                        command TEXT NOT NULL,
                        args TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        success BOOLEAN DEFAULT TRUE
                    )
                """)
                
                # User analytics
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS analytics_users (
                        chat_id TEXT PRIMARY KEY,
                        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                        message_count INTEGER DEFAULT 0,
                        command_count INTEGER DEFAULT 0
                    )
                """)
                
                # Performance analytics
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS analytics_performance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_name TEXT NOT NULL,
                        metric_value REAL NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                conn.commit()
                
            self.logger.info("✅ SQLite analytics initialized")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize SQLite analytics: {e}")
            self._init_json_analytics()
    
    def _init_json_analytics(self):
        """Initialize JSON analytics storage"""
        self.analytics_file = Path(config.system.data_path) / "analytics.json"
        
        if self.analytics_file.exists():
            try:
                with open(self.analytics_file, 'r', encoding='utf-8') as f:
                    self.analytics_data = json.load(f)
                self.logger.info("✅ Analytics data loaded from JSON")
            except Exception as e:
                self.logger.error(f"❌ Error loading analytics: {e}")
    
    async def log_message(self, chat_id: str, message_type: str, response_time: float = None, success: bool = True):
        """Log a message interaction"""
        try:
            if config.system.database_type == "sqlite":
                await self._log_message_sqlite(chat_id, message_type, response_time, success)
            else:
                await self._log_message_json(chat_id, message_type, response_time, success)
            
            # Update user stats
            await self._update_user_stats(chat_id, message_count=1)
            
        except Exception as e:
            self.logger.error(f"❌ Error logging message: {e}")
    
    async def _log_message_sqlite(self, chat_id: str, message_type: str, response_time: float, success: bool):
        """Log message to SQLite"""
        with sqlite3.connect(config.system.database_path) as conn:
            conn.execute("""
                INSERT INTO analytics_messages (chat_id, message_type, response_time, success)
                VALUES (?, ?, ?, ?)
            """, (chat_id, message_type, response_time, success))
            conn.commit()
    
    async def _log_message_json(self, chat_id: str, message_type: str, response_time: float, success: bool):
        """Log message to JSON"""
        self.analytics_data["messages"].append({
            "chat_id": chat_id,
            "message_type": message_type,
            "response_time": response_time,
            "success": success,
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep only last 10000 messages
        if len(self.analytics_data["messages"]) > 10000:
            self.analytics_data["messages"] = self.analytics_data["messages"][-5000:]
        
        await self._save_analytics_json()
    
    async def log_command_usage(self, chat_id: str, command: str, args: List[str], success: bool = True):
        """Log command usage"""
        try:
            if config.system.database_type == "sqlite":
                await self._log_command_sqlite(chat_id, command, args, success)
            else:
                await self._log_command_json(chat_id, command, args, success)
            
            # Update user stats
            await self._update_user_stats(chat_id, command_count=1)
            
        except Exception as e:
            self.logger.error(f"❌ Error logging command: {e}")
    
    async def _log_command_sqlite(self, chat_id: str, command: str, args: List[str], success: bool):
        """Log command to SQLite"""
        with sqlite3.connect(config.system.database_path) as conn:
            conn.execute("""
                INSERT INTO analytics_commands (chat_id, command, args, success)
                VALUES (?, ?, ?, ?)
            """, (chat_id, command, json.dumps(args), success))
            conn.commit()
    
    async def _log_command_json(self, chat_id: str, command: str, args: List[str], success: bool):
        """Log command to JSON"""
        self.analytics_data["commands"].append({
            "chat_id": chat_id,
            "command": command,
            "args": args,
            "success": success,
            "timestamp": datetime.now().isoformat()
        })
        
        await self._save_analytics_json()
    
    async def _update_user_stats(self, chat_id: str, message_count: int = 0, command_count: int = 0):
        """Update user statistics"""
        try:
            if config.system.database_type == "sqlite":
                await self._update_user_stats_sqlite(chat_id, message_count, command_count)
            else:
                await self._update_user_stats_json(chat_id, message_count, command_count)
                
        except Exception as e:
            self.logger.error(f"❌ Error updating user stats: {e}")
    
    async def _update_user_stats_sqlite(self, chat_id: str, message_count: int, command_count: int):
        """Update user stats in SQLite"""
        with sqlite3.connect(config.system.database_path) as conn:
            # Insert or update user
            conn.execute("""
                INSERT INTO analytics_users (chat_id, message_count, command_count)
                VALUES (?, ?, ?)
                ON CONFLICT(chat_id) DO UPDATE SET
                    last_seen = CURRENT_TIMESTAMP,
                    message_count = message_count + ?,
                    command_count = command_count + ?
            """, (chat_id, message_count, command_count, message_count, command_count))
            conn.commit()
    
    async def _update_user_stats_json(self, chat_id: str, message_count: int, command_count: int):
        """Update user stats in JSON"""
        if chat_id not in self.analytics_data["users"]:
            self.analytics_data["users"][chat_id] = {
                "first_seen": datetime.now().isoformat(),
                "last_seen": datetime.now().isoformat(),
                "message_count": 0,
                "command_count": 0
            }
        
        user = self.analytics_data["users"][chat_id]
        user["last_seen"] = datetime.now().isoformat()
        user["message_count"] += message_count
        user["command_count"] += command_count
        
        await self._save_analytics_json()
    
    async def log_performance_metric(self, metric_name: str, value: float):
        """Log a performance metric"""
        try:
            if config.system.database_type == "sqlite":
                with sqlite3.connect(config.system.database_path) as conn:
                    conn.execute("""
                        INSERT INTO analytics_performance (metric_name, metric_value)
                        VALUES (?, ?)
                    """, (metric_name, value))
                    conn.commit()
            else:
                self.analytics_data["performance"].append({
                    "metric_name": metric_name,
                    "value": value,
                    "timestamp": datetime.now().isoformat()
                })
                await self._save_analytics_json()
                
        except Exception as e:
            self.logger.error(f"❌ Error logging performance metric: {e}")
    
    async def _save_analytics_json(self):
        """Save analytics data to JSON file"""
        try:
            with open(self.analytics_file, 'w', encoding='utf-8') as f:
                json.dump(self.analytics_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"❌ Error saving analytics: {e}")
    
    async def get_analytics_report(self, days: int = 7) -> Dict[str, Any]:
        """Get comprehensive analytics report"""
        try:
            if config.system.database_type == "sqlite":
                return await self._get_analytics_sqlite(days)
            else:
                return await self._get_analytics_json(days)
                
        except Exception as e:
            self.logger.error(f"❌ Error generating analytics report: {e}")
            return {}
    
    async def _get_analytics_sqlite(self, days: int) -> Dict[str, Any]:
        """Get analytics from SQLite"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with sqlite3.connect(config.system.database_path) as conn:
            # Message stats
            cursor = conn.execute("""
                SELECT COUNT(*) FROM analytics_messages 
                WHERE timestamp > ?
            """, (cutoff_date.isoformat(),))
            total_messages = cursor.fetchone()[0]
            
            cursor = conn.execute("""
                SELECT COUNT(*) FROM analytics_messages 
                WHERE DATE(timestamp) = DATE('now')
            """)
            messages_today = cursor.fetchone()[0]
            
            # User stats
            cursor = conn.execute("SELECT COUNT(*) FROM analytics_users")
            total_users = cursor.fetchone()[0]
            
            cursor = conn.execute("""
                SELECT COUNT(*) FROM analytics_users 
                WHERE DATE(last_seen) = DATE('now')
            """)
            active_users_today = cursor.fetchone()[0]
            
            cursor = conn.execute("""
                SELECT COUNT(*) FROM analytics_users 
                WHERE first_seen > ?
            """, (cutoff_date.isoformat(),))
            new_users_week = cursor.fetchone()[0]
            
            # Command stats
            cursor = conn.execute("""
                SELECT command, COUNT(*) as count 
                FROM analytics_commands 
                WHERE timestamp > ?
                GROUP BY command 
                ORDER BY count DESC 
                LIMIT 10
            """, (cutoff_date.isoformat(),))
            top_commands = cursor.fetchall()
            
            # Performance stats
            cursor = conn.execute("""
                SELECT AVG(response_time) FROM analytics_messages 
                WHERE response_time IS NOT NULL AND timestamp > ?
            """, (cutoff_date.isoformat(),))
            avg_response_time = cursor.fetchone()[0] or 0
            
            cursor = conn.execute("""
                SELECT COUNT(*) FROM analytics_messages 
                WHERE success = 0 AND timestamp > ?
            """, (cutoff_date.isoformat(),))
            error_count = cursor.fetchone()[0]
            
            error_rate = (error_count / total_messages * 100) if total_messages > 0 else 0
            
            return {
                "total_messages": total_messages,
                "messages_today": messages_today,
                "avg_daily_messages": total_messages / days,
                "total_users": total_users,
                "active_users_today": active_users_today,
                "new_users_week": new_users_week,
                "top_commands": top_commands,
                "avg_response_time": avg_response_time,
                "error_rate": error_rate,
                "period_days": days
            }
    
    async def _get_analytics_json(self, days: int) -> Dict[str, Any]:
        """Get analytics from JSON"""
        cutoff_date = datetime.now() - timedelta(days=days)
        today = datetime.now().date()
        
        # Filter recent messages
        recent_messages = [
            msg for msg in self.analytics_data["messages"]
            if datetime.fromisoformat(msg["timestamp"]) > cutoff_date
        ]
        
        # Message stats
        total_messages = len(recent_messages)
        messages_today = len([
            msg for msg in recent_messages
            if datetime.fromisoformat(msg["timestamp"]).date() == today
        ])
        
        # User stats
        total_users = len(self.analytics_data["users"])
        active_users_today = len([
            user for user in self.analytics_data["users"].values()
            if datetime.fromisoformat(user["last_seen"]).date() == today
        ])
        new_users_week = len([
            user for user in self.analytics_data["users"].values()
            if datetime.fromisoformat(user["first_seen"]) > cutoff_date
        ])
        
        # Command stats
        recent_commands = [
            cmd for cmd in self.analytics_data["commands"]
            if datetime.fromisoformat(cmd["timestamp"]) > cutoff_date
        ]
        
        command_counts = {}
        for cmd in recent_commands:
            command_counts[cmd["command"]] = command_counts.get(cmd["command"], 0) + 1
        
        top_commands = sorted(command_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Performance stats
        response_times = [msg["response_time"] for msg in recent_messages if msg.get("response_time")]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        error_count = len([msg for msg in recent_messages if not msg.get("success", True)])
        error_rate = (error_count / total_messages * 100) if total_messages > 0 else 0
        
        return {
            "total_messages": total_messages,
            "messages_today": messages_today,
            "avg_daily_messages": total_messages / days,
            "total_users": total_users,
            "active_users_today": active_users_today,
            "new_users_week": new_users_week,
            "top_commands": top_commands,
            "avg_response_time": avg_response_time,
            "error_rate": error_rate,
            "period_days": days
        }
    
    async def get_admin_stats(self) -> Dict[str, Any]:
        """Get admin-specific statistics"""
        try:
            # Get command usage for admin commands
            admin_commands = ["health", "monitor", "performance", "errors", "admin", "optimize"]
            
            if config.system.database_type == "sqlite":
                with sqlite3.connect(config.system.database_path) as conn:
                    admin_usage = {}
                    for cmd in admin_commands:
                        cursor = conn.execute("""
                            SELECT COUNT(*) FROM analytics_commands 
                            WHERE command = ?
                        """, (cmd,))
                        admin_usage[cmd] = cursor.fetchone()[0]
                    
                    # Get last admin activity
                    cursor = conn.execute("""
                        SELECT MAX(timestamp) FROM analytics_commands 
                        WHERE command IN ({})
                    """.format(','.join('?' * len(admin_commands))), admin_commands)
                    last_activity = cursor.fetchone()[0]
            else:
                admin_usage = {}
                last_activity = None
                
                for cmd in self.analytics_data["commands"]:
                    if cmd["command"] in admin_commands:
                        admin_usage[cmd["command"]] = admin_usage.get(cmd["command"], 0) + 1
                        if not last_activity or cmd["timestamp"] > last_activity:
                            last_activity = cmd["timestamp"]
            
            return {
                "admin_commands_usage": admin_usage,
                "last_admin_activity": last_activity,
                "access_denied_count": 0  # This would be tracked separately
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error getting admin stats: {e}")
            return {}
    
    async def cleanup_old_analytics(self, days: int = 90) -> int:
        """Clean up old analytics data"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            deleted = 0
            
            if config.system.database_type == "sqlite":
                with sqlite3.connect(config.system.database_path) as conn:
                    # Clean messages
                    cursor = conn.execute("""
                        DELETE FROM analytics_messages 
                        WHERE timestamp < ?
                    """, (cutoff_date.isoformat(),))
                    deleted += cursor.rowcount
                    
                    # Clean commands
                    cursor = conn.execute("""
                        DELETE FROM analytics_commands 
                        WHERE timestamp < ?
                    """, (cutoff_date.isoformat(),))
                    deleted += cursor.rowcount
                    
                    # Clean performance
                    cursor = conn.execute("""
                        DELETE FROM analytics_performance 
                        WHERE timestamp < ?
                    """, (cutoff_date.isoformat(),))
                    deleted += cursor.rowcount
                    
                    conn.commit()
            else:
                # Clean JSON data
                original_count = len(self.analytics_data["messages"]) + len(self.analytics_data["commands"])
                
                self.analytics_data["messages"] = [
                    msg for msg in self.analytics_data["messages"]
                    if datetime.fromisoformat(msg["timestamp"]) > cutoff_date
                ]
                
                self.analytics_data["commands"] = [
                    cmd for cmd in self.analytics_data["commands"]
                    if datetime.fromisoformat(cmd["timestamp"]) > cutoff_date
                ]
                
                self.analytics_data["performance"] = [
                    perf for perf in self.analytics_data["performance"]
                    if datetime.fromisoformat(perf["timestamp"]) > cutoff_date
                ]
                
                new_count = len(self.analytics_data["messages"]) + len(self.analytics_data["commands"])
                deleted = original_count - new_count
                
                await self._save_analytics_json()
            
            self.logger.info(f"✅ Cleaned up {deleted} old analytics records")
            return deleted
            
        except Exception as e:
            self.logger.error(f"❌ Error cleaning up analytics: {e}")
            return 0
