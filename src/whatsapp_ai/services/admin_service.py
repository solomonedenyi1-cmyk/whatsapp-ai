"""
Admin service for access control and management
"""

import logging
from typing import Dict, Any, List
from datetime import datetime

from ..config import config


class AdminService:
    """Manages admin access control and permissions"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.admin_number = config.bot.admin_whatsapp_number
        self.access_attempts = {}
        self.command_usage = {}
    
    def is_admin(self, chat_id: str) -> bool:
        """Check if chat_id belongs to an admin"""
        if not self.admin_number:
            return False
        
        # Normalize chat IDs for comparison
        normalized_admin = self._normalize_chat_id(self.admin_number)
        normalized_chat = self._normalize_chat_id(chat_id)
        
        return normalized_admin == normalized_chat
    
    def _normalize_chat_id(self, chat_id: str) -> str:
        """Normalize chat ID for consistent comparison"""
        if not chat_id:
            return ""
        
        # Remove common prefixes/suffixes and normalize
        normalized = chat_id.strip()
        
        # Handle different WhatsApp ID formats
        if "@c.us" in normalized:
            normalized = normalized.replace("@c.us", "")
        elif "@g.us" in normalized:
            normalized = normalized.replace("@g.us", "")
        
        # Remove any non-numeric characters for phone numbers
        if normalized.isdigit() or (normalized.startswith("+") and normalized[1:].isdigit()):
            # Keep only digits
            normalized = "".join(filter(str.isdigit, normalized))
        
        return normalized
    
    def validate_admin_access(self, chat_id: str, command: str) -> Dict[str, Any]:
        """Validate admin access for a command"""
        is_admin_user = self.is_admin(chat_id)
        
        # Log access attempt
        self._log_access_attempt(chat_id, command, is_admin_user)
        
        if is_admin_user:
            # Track command usage
            self._track_command_usage(command)
            
            return {
                "allowed": True,
                "message": None
            }
        else:
            return {
                "allowed": False,
                "message": "🔒 Este comando é restrito a administradores.\n\nSe você é o administrador, verifique se seu número está configurado corretamente na variável ADMIN_WHATSAPP_NUMBER."
            }
    
    def _log_access_attempt(self, chat_id: str, command: str, granted: bool):
        """Log access attempt for monitoring"""
        timestamp = datetime.now().isoformat()
        
        if chat_id not in self.access_attempts:
            self.access_attempts[chat_id] = []
        
        self.access_attempts[chat_id].append({
            "command": command,
            "timestamp": timestamp,
            "granted": granted
        })
        
        # Keep only last 100 attempts per chat
        if len(self.access_attempts[chat_id]) > 100:
            self.access_attempts[chat_id] = self.access_attempts[chat_id][-100:]
        
        # Log to system
        status = "GRANTED" if granted else "DENIED"
        self.logger.info(f"Admin access {status}: {chat_id} -> /{command}")
    
    def _track_command_usage(self, command: str):
        """Track admin command usage"""
        if command not in self.command_usage:
            self.command_usage[command] = 0
        
        self.command_usage[command] += 1
    
    def get_admin_stats(self) -> Dict[str, Any]:
        """Get admin statistics"""
        total_attempts = sum(len(attempts) for attempts in self.access_attempts.values())
        denied_attempts = sum(
            1 for attempts in self.access_attempts.values()
            for attempt in attempts
            if not attempt["granted"]
        )
        
        # Get recent admin activity
        last_admin_activity = None
        for attempts in self.access_attempts.values():
            for attempt in attempts:
                if attempt["granted"]:
                    if not last_admin_activity or attempt["timestamp"] > last_admin_activity:
                        last_admin_activity = attempt["timestamp"]
        
        return {
            "admin_configured": bool(self.admin_number),
            "admin_number": self.admin_number,
            "total_access_attempts": total_attempts,
            "denied_attempts": denied_attempts,
            "command_usage": dict(self.command_usage),
            "last_admin_activity": last_admin_activity,
            "unique_users_attempted": len(self.access_attempts)
        }
    
    def get_access_log(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent access log entries"""
        all_attempts = []
        
        for chat_id, attempts in self.access_attempts.items():
            for attempt in attempts:
                all_attempts.append({
                    "chat_id": chat_id,
                    "command": attempt["command"],
                    "timestamp": attempt["timestamp"],
                    "granted": attempt["granted"]
                })
        
        # Sort by timestamp (most recent first)
        all_attempts.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return all_attempts[:limit]
    
    def is_admin_configured(self) -> bool:
        """Check if admin is properly configured"""
        return bool(self.admin_number and self.admin_number.strip())
    
    def get_admin_info(self) -> Dict[str, Any]:
        """Get admin configuration info"""
        return {
            "configured": self.is_admin_configured(),
            "admin_number": self.admin_number,
            "normalized_number": self._normalize_chat_id(self.admin_number) if self.admin_number else None,
            "total_commands_used": sum(self.command_usage.values()),
            "most_used_command": max(self.command_usage.items(), key=lambda x: x[1])[0] if self.command_usage else None
        }
