"""
Anthropic service implementation
"""

import asyncio
from typing import List, Dict, Any
import anthropic

from .ai_service import AIService


class AnthropicService(AIService):
    """Anthropic Claude service implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        
        self.api_key = config.get("api_key")
        self.model = config.get("model", "claude-3-sonnet-20240229")
        
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        # Initialize Anthropic client
        self.client = anthropic.AsyncAnthropic(
            api_key=self.api_key,
            timeout=self.timeout
        )
    
    async def send_message(self, message: str, context: List[Dict[str, str]] = None) -> str:
        """Send message to Anthropic and get response"""
        try:
            # Prepare messages for Anthropic format
            messages = []
            system_prompt = None
            
            # Extract system prompt and format messages
            if context:
                for msg in context:
                    if msg["role"] == "system":
                        system_prompt = msg["content"]
                    else:
                        messages.append(msg)
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": message
            })
            
            # Make API call with retry
            response = await self._retry_operation(self._make_api_call, messages, system_prompt)
            
            # Extract response text
            if response and response.content:
                return response.content[0].text.strip()
            else:
                return "Desculpe, não recebi uma resposta válida da IA."
                
        except Exception as e:
            return self._handle_error(e, "Anthropic API call")
    
    async def _make_api_call(self, messages: List[Dict[str, str]], system_prompt: str = None):
        """Make the actual API call to Anthropic"""
        kwargs = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 2000,
            "temperature": 0.7
        }
        
        if system_prompt:
            kwargs["system"] = system_prompt
        
        return await self.client.messages.create(**kwargs)
    
    async def check_health(self) -> Dict[str, Any]:
        """Check Anthropic service health"""
        try:
            # Make a simple test call
            response = await self.client.messages.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            return {
                "status": "healthy",
                "provider": "anthropic",
                "model": self.model,
                "response_time": "< 1s",
                "last_check": asyncio.get_event_loop().time()
            }
            
        except anthropic.AuthenticationError:
            return {
                "status": "error",
                "provider": "anthropic",
                "error": "Authentication failed - check API key",
                "last_check": asyncio.get_event_loop().time()
            }
        except anthropic.RateLimitError:
            return {
                "status": "error",
                "provider": "anthropic",
                "error": "Rate limit exceeded",
                "last_check": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "anthropic",
                "error": str(e),
                "last_check": asyncio.get_event_loop().time()
            }
