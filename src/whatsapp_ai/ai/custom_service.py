"""
Custom AI service implementation for generic APIs
"""

import asyncio
import httpx
from typing import List, Dict, Any

from .ai_service import AIService


class CustomAIService(AIService):
    """Custom AI service implementation for generic APIs"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        
        self.api_url = config.get("api_url")
        self.model = config.get("model", "AI")
        self.api_key = config.get("api_key")
        
        if not self.api_url:
            raise ValueError("Custom AI API URL is required")
        
        # Initialize HTTP client
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            headers=headers
        )
    
    async def send_message(self, message: str, context: List[Dict[str, str]] = None) -> str:
        """Send message to custom AI service and get response"""
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
            
            # Extract response text (try different response formats)
            if isinstance(response, dict):
                # Try Ollama format
                if "message" in response and "content" in response["message"]:
                    return response["message"]["content"].strip()
                
                # Try OpenAI format
                if "choices" in response and response["choices"]:
                    choice = response["choices"][0]
                    if "message" in choice and "content" in choice["message"]:
                        return choice["message"]["content"].strip()
                    elif "text" in choice:
                        return choice["text"].strip()
                
                # Try direct response format
                if "response" in response:
                    return response["response"].strip()
                
                # Try content field
                if "content" in response:
                    return response["content"].strip()
            
            return "Desculpe, não recebi uma resposta válida da IA."
                
        except Exception as e:
            return self._handle_error(e, "Custom AI API call")
    
    async def _make_api_call(self, messages: List[Dict[str, str]]):
        """Make the actual API call to custom AI service"""
        # Try different endpoint patterns
        endpoints = [
            "/api/chat",
            "/chat/completions", 
            "/v1/chat/completions",
            "/generate",
            "/api/generate"
        ]
        
        for endpoint in endpoints:
            try:
                url = self.api_url.rstrip("/") + endpoint
                
                # Try different payload formats
                payloads = [
                    # Ollama format
                    {
                        "model": self.model,
                        "messages": messages,
                        "stream": False
                    },
                    # OpenAI format
                    {
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2000
                    },
                    # Simple format
                    {
                        "prompt": messages[-1]["content"] if messages else "",
                        "model": self.model
                    }
                ]
                
                for payload in payloads:
                    try:
                        response = await self.client.post(url, json=payload)
                        if response.status_code == 200:
                            return response.json()
                    except:
                        continue
                        
            except:
                continue
        
        # If all attempts failed, raise an error
        raise Exception("Failed to connect to custom AI API with any known format")
    
    async def check_health(self) -> Dict[str, Any]:
        """Check custom AI service health"""
        try:
            # Try to make a simple health check
            test_message = [{"role": "user", "content": "Hello"}]
            response = await self._make_api_call(test_message)
            
            return {
                "status": "healthy",
                "provider": "custom",
                "model": self.model,
                "api_url": self.api_url,
                "response_time": "< 1s",
                "last_check": asyncio.get_event_loop().time()
            }
            
        except httpx.ConnectError:
            return {
                "status": "error",
                "provider": "custom",
                "error": "Cannot connect to custom AI server",
                "api_url": self.api_url,
                "last_check": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "custom",
                "error": str(e),
                "api_url": self.api_url,
                "last_check": asyncio.get_event_loop().time()
            }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
