"""
OpenAI service implementation
"""

import asyncio
from typing import List, Dict, Any
import openai
from openai import AsyncOpenAI

from .ai_service import AIService


class OpenAIService(AIService):
    """OpenAI service implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        
        self.api_key = config.get("api_key")
        self.model = config.get("model", "gpt-4-turbo-preview")
        self.base_url = config.get("base_url", "https://api.openai.com/v1")
        
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        # Initialize OpenAI client
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.timeout
        )
    
    async def send_message(self, message: str, context: List[Dict[str, str]] = None) -> str:
        """Send message to OpenAI and get response"""
        try:
            # Prepare messages
            messages = []
            
            # Add context if provided
            if context:
                messages.extend(context)
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": message
            })
            
            # Make API call with retry
            response = await self._retry_operation(self._make_api_call, messages)
            
            # Extract response text
            if response and response.choices:
                return response.choices[0].message.content.strip()
            else:
                return "Desculpe, não recebi uma resposta válida da IA."
                
        except Exception as e:
            return self._handle_error(e, "OpenAI API call")
    
    async def _make_api_call(self, messages: List[Dict[str, str]]):
        """Make the actual API call to OpenAI"""
        return await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
    
    async def check_health(self) -> Dict[str, Any]:
        """Check OpenAI service health"""
        try:
            # Make a simple test call
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            return {
                "status": "healthy",
                "provider": "openai",
                "model": self.model,
                "response_time": "< 1s",
                "last_check": asyncio.get_event_loop().time()
            }
            
        except openai.AuthenticationError:
            return {
                "status": "error",
                "provider": "openai",
                "error": "Authentication failed - check API key",
                "last_check": asyncio.get_event_loop().time()
            }
        except openai.RateLimitError:
            return {
                "status": "error",
                "provider": "openai", 
                "error": "Rate limit exceeded",
                "last_check": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "openai",
                "error": str(e),
                "last_check": asyncio.get_event_loop().time()
            }
