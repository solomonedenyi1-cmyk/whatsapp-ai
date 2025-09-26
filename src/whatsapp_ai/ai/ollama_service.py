"""
Ollama service implementation
"""

import asyncio
import httpx
from typing import List, Dict, Any

from .ai_service import AIService


class OllamaService(AIService):
    """Ollama service implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        
        self.api_url = config.get("api_url", "http://localhost:11434/v1")
        self.model = config.get("model", "llama3.1:8b")
        
        # Ensure API URL has correct format
        if not self.api_url.endswith("/v1"):
            self.api_url = self.api_url.rstrip("/") + "/v1"
        
        # Initialize HTTP client
        self.client = httpx.AsyncClient(timeout=self.timeout)
    
    async def send_message(self, message: str, context: List[Dict[str, str]] = None) -> str:
        """Send message to Ollama and get response"""
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
            if response and "message" in response and "content" in response["message"]:
                return response["message"]["content"].strip()
            else:
                return "Desculpe, não recebi uma resposta válida da IA."
                
        except Exception as e:
            return self._handle_error(e, "Ollama API call")
    
    async def _make_api_call(self, messages: List[Dict[str, str]]):
        """Make the actual API call to Ollama"""
        url = f"{self.api_url}/chat/completions"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        
        # Handle Ollama response format
        if "choices" in data and data["choices"]:
            return {
                "message": {
                    "content": data["choices"][0]["message"]["content"]
                }
            }
        elif "message" in data:
            return data
        else:
            raise Exception("Unexpected response format from Ollama")
    
    async def check_health(self) -> Dict[str, Any]:
        """Check Ollama service health"""
        try:
            # Check if Ollama is running
            url = f"{self.api_url}/models"
            response = await self.client.get(url)
            response.raise_for_status()
            
            # Make a simple test call
            test_response = await self.client.post(
                f"{self.api_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": "Hello"}],
                    "stream": False,
                    "max_tokens": 10
                }
            )
            test_response.raise_for_status()
            
            return {
                "status": "healthy",
                "provider": "ollama",
                "model": self.model,
                "api_url": self.api_url,
                "response_time": "< 1s",
                "last_check": asyncio.get_event_loop().time()
            }
            
        except httpx.ConnectError:
            return {
                "status": "error",
                "provider": "ollama",
                "error": "Cannot connect to Ollama server",
                "api_url": self.api_url,
                "last_check": asyncio.get_event_loop().time()
            }
        except httpx.HTTPStatusError as e:
            return {
                "status": "error",
                "provider": "ollama",
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
                "api_url": self.api_url,
                "last_check": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "ollama",
                "error": str(e),
                "api_url": self.api_url,
                "last_check": asyncio.get_event_loop().time()
            }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
