"""
Message handling utilities for WhatsApp
"""

import re
from typing import Dict, Any, Tuple, Optional
from ..config import config


class MessageHandler:
    """Handles message processing and formatting"""
    
    def __init__(self):
        self.command_prefix = "/"
    
    def should_ignore_message(self, message: Dict[str, Any]) -> bool:
        """Check if message should be ignored"""
        # Ignore own messages
        if message.get("fromMe", False):
            return True
        
        # Ignore status updates
        if message.get("type") == "status":
            return True
        
        # Ignore empty messages
        body = message.get("body", "").strip()
        if not body:
            return True
        
        # Ignore emoji-only messages (simplified check)
        if len(body) <= 3 and not body.isalnum():
            return True
        
        return False
    
    def clean_message(self, message_text: str) -> str:
        """Clean and normalize message text"""
        if not message_text:
            return ""
        
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', message_text.strip())
        
        # Remove special characters that might cause issues
        cleaned = re.sub(r'[\u200b-\u200d\ufeff]', '', cleaned)
        
        return cleaned
    
    def is_command(self, message_text: str) -> bool:
        """Check if message is a command"""
        return message_text.strip().startswith(self.command_prefix)
    
    def parse_command(self, message_text: str) -> Tuple[str, list]:
        """Parse command and arguments"""
        if not self.is_command(message_text):
            return "", []
        
        # Remove command prefix and split
        command_text = message_text.strip()[1:]  # Remove '/'
        parts = command_text.split()
        
        if not parts:
            return "", []
        
        command = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        return command, args
    
    def split_message(self, message: str, max_length: Optional[int] = None) -> list:
        """Split long messages into smaller parts"""
        if max_length is None:
            max_length = config.bot.message_split_length
        
        if len(message) <= max_length:
            return [message]
        
        parts = []
        current_part = ""
        
        # Split by sentences first
        sentences = re.split(r'(?<=[.!?])\s+', message)
        
        for sentence in sentences:
            # If single sentence is too long, split by words
            if len(sentence) > max_length:
                words = sentence.split()
                for word in words:
                    if len(current_part + " " + word) > max_length:
                        if current_part:
                            parts.append(current_part.strip())
                            current_part = word
                        else:
                            # Single word is too long, force split
                            parts.append(word[:max_length])
                            current_part = word[max_length:]
                    else:
                        current_part += " " + word if current_part else word
            else:
                # Check if adding this sentence exceeds limit
                if len(current_part + " " + sentence) > max_length:
                    if current_part:
                        parts.append(current_part.strip())
                        current_part = sentence
                    else:
                        current_part = sentence
                else:
                    current_part += " " + sentence if current_part else sentence
        
        # Add remaining part
        if current_part:
            parts.append(current_part.strip())
        
        return parts
    
    def format_response(self, response: str) -> str:
        """Format AI response for WhatsApp"""
        if not response:
            return "Desculpe, não consegui gerar uma resposta."
        
        # Clean up the response
        formatted = response.strip()
        
        # Remove excessive line breaks
        formatted = re.sub(r'\n{3,}', '\n\n', formatted)
        
        # Ensure proper spacing around bullet points
        formatted = re.sub(r'\n-', '\n• ', formatted)
        formatted = re.sub(r'\n\*', '\n• ', formatted)
        
        return formatted
    
    def extract_chat_id(self, message: Dict[str, Any]) -> str:
        """Extract chat ID from message"""
        # Try different possible fields for chat ID
        chat_id = message.get("from") or message.get("chatId") or message.get("chat", {}).get("id")
        
        if not chat_id:
            raise ValueError("Could not extract chat ID from message")
        
        return str(chat_id)
    
    def extract_message_text(self, message: Dict[str, Any]) -> str:
        """Extract message text from message object"""
        return message.get("body") or message.get("text") or ""
    
    def create_message_object(self, chat_id: str, text: str, from_me: bool = False) -> Dict[str, Any]:
        """Create a standardized message object"""
        return {
            "from": chat_id,
            "chatId": chat_id,
            "body": text,
            "text": text,
            "fromMe": from_me,
            "timestamp": int(time.time()),
            "type": "text"
        }
    
    def is_group_message(self, message: Dict[str, Any]) -> bool:
        """Check if message is from a group chat"""
        chat_id = self.extract_chat_id(message)
        # Group chats typically have '@g.us' in their ID
        return "@g.us" in chat_id
    
    def extract_sender_info(self, message: Dict[str, Any]) -> Dict[str, str]:
        """Extract sender information from message"""
        return {
            "chat_id": self.extract_chat_id(message),
            "sender_id": message.get("author") or message.get("from", ""),
            "sender_name": message.get("notifyName") or message.get("pushname") or "Unknown",
            "is_group": self.is_group_message(message)
        }


import time
