"""
Base AI service interface
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging


class AIService(ABC):
    """Abstract base class for AI service providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)
        self.timeout = config.get("timeout", 60)
        self.max_retries = config.get("max_retries", 3)
    
    @abstractmethod
    async def send_message(self, message: str, context: List[Dict[str, str]] = None) -> str:
        """
        Send a message to the AI service and get response
        
        Args:
            message: User message
            context: Conversation context as list of {"role": "user/assistant", "content": "..."}
            
        Returns:
            AI response text
        """
        pass
    
    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """
        Check if the AI service is healthy and accessible
        
        Returns:
            Health status dictionary
        """
        pass
    
    def format_context(self, context: List[Dict[str, str]], system_prompt: str = None) -> List[Dict[str, str]]:
        """
        Format conversation context for the AI service
        
        Args:
            context: Raw context messages
            system_prompt: System prompt to include
            
        Returns:
            Formatted context
        """
        formatted_context = []
        
        # Add system prompt if provided
        if system_prompt:
            formatted_context.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Add conversation context
        if context:
            formatted_context.extend(context)
        
        return formatted_context
    
    def _handle_error(self, error: Exception, operation: str) -> str:
        """Handle and log errors"""
        error_msg = f"Error in {operation}: {str(error)}"
        self.logger.error(error_msg)
        return "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente."
    
    async def _retry_operation(self, operation, *args, **kwargs):
        """Retry an operation with exponential backoff"""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await operation(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    self.logger.warning(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    self.logger.error(f"All {self.max_retries} attempts failed")
        
        raise last_error


import asyncio
