"""
Configuration management for WhatsApp AI Bot
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class AIConfig:
    """AI provider configuration"""
    provider: str = "openai"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4-turbo-preview"
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-3-sonnet-20240229"
    ollama_api_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.1:8b"
    custom_api_url: Optional[str] = None
    custom_model: str = "AI"
    custom_api_key: Optional[str] = None
    timeout: int = 60
    max_retries: int = 3


@dataclass
class BotConfig:
    """Bot behavior configuration"""
    name: str = "WhatsApp AI Assistant"
    max_context_messages: int = 20
    message_split_length: int = 1500
    response_delay: int = 1
    admin_whatsapp_number: Optional[str] = None


@dataclass
class SystemConfig:
    """System configuration"""
    debug: bool = False
    log_level: str = "INFO"
    database_type: str = "sqlite"
    database_path: str = "data/whatsapp_ai.db"
    session_path: str = ".wwebjs_auth"
    data_path: str = "data"
    logs_path: str = "logs"


@dataclass
class PerformanceConfig:
    """Performance optimization configuration"""
    enable_caching: bool = True
    cache_ttl: int = 3600
    max_concurrent_messages: int = 5
    enable_queue_processing: bool = True
    ai_timeout_warning: int = 60
    ai_timeout_max: int = 120


@dataclass
class SecurityConfig:
    """Security configuration"""
    enable_rate_limiting: bool = True
    max_messages_per_minute: int = 10
    enable_admin_commands: bool = True


@dataclass
class ChromeConfig:
    """Chrome/Selenium configuration"""
    executable_path: str = "auto"
    user_data_dir: str = ".chrome_user_data"
    headless: bool = True
    no_sandbox: bool = True
    disable_gpu: bool = True


class Config:
    """Main configuration class"""
    
    def __init__(self, config_file: str = "config.json"):
        self.config_file = Path(config_file)
        
        # Initialize configurations from environment
        self.ai = AIConfig(
            provider=os.getenv("AI_PROVIDER", "openai"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview"),
            openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
            ollama_api_url=os.getenv("OLLAMA_API_URL", "http://localhost:11434/v1"),
            ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            custom_api_url=os.getenv("CUSTOM_AI_API_URL"),
            custom_model=os.getenv("CUSTOM_AI_MODEL", "AI"),
            custom_api_key=os.getenv("CUSTOM_AI_API_KEY"),
            timeout=int(os.getenv("API_TIMEOUT", "60")),
        )
        
        self.bot = BotConfig(
            name=os.getenv("BOT_NAME", "WhatsApp AI Assistant"),
            max_context_messages=int(os.getenv("MAX_CONTEXT_MESSAGES", "20")),
            message_split_length=int(os.getenv("MESSAGE_SPLIT_LENGTH", "1500")),
            response_delay=int(os.getenv("RESPONSE_DELAY", "1")),
            admin_whatsapp_number=os.getenv("ADMIN_WHATSAPP_NUMBER"),
        )
        
        self.system = SystemConfig(
            debug=os.getenv("DEBUG", "false").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            database_type=os.getenv("DATABASE_TYPE", "sqlite"),
            database_path=os.getenv("DATABASE_PATH", "data/whatsapp_ai.db"),
            session_path=os.getenv("SESSION_PATH", ".wwebjs_auth"),
            data_path=os.getenv("DATA_PATH", "data"),
            logs_path=os.getenv("LOGS_PATH", "logs"),
        )
        
        self.performance = PerformanceConfig(
            enable_caching=os.getenv("ENABLE_CACHING", "true").lower() == "true",
            cache_ttl=int(os.getenv("CACHE_TTL", "3600")),
            max_concurrent_messages=int(os.getenv("MAX_CONCURRENT_MESSAGES", "5")),
            enable_queue_processing=os.getenv("ENABLE_QUEUE_PROCESSING", "true").lower() == "true",
            ai_timeout_warning=int(os.getenv("AI_TIMEOUT_WARNING", "60")),
            ai_timeout_max=int(os.getenv("AI_TIMEOUT_MAX", "120")),
        )
        
        self.security = SecurityConfig(
            enable_rate_limiting=os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true",
            max_messages_per_minute=int(os.getenv("MAX_MESSAGES_PER_MINUTE", "10")),
            enable_admin_commands=os.getenv("ENABLE_ADMIN_COMMANDS", "true").lower() == "true",
        )
        
        self.chrome = ChromeConfig(
            executable_path=os.getenv("CHROME_EXECUTABLE_PATH", "auto"),
            user_data_dir=os.getenv("CHROME_USER_DATA_DIR", ".chrome_user_data"),
            headless=os.getenv("CHROME_HEADLESS", "true").lower() == "true",
            no_sandbox=os.getenv("CHROME_NO_SANDBOX", "true").lower() == "true",
            disable_gpu=os.getenv("CHROME_DISABLE_GPU", "true").lower() == "true",
        )
        
        # Business context (loaded from JSON file)
        self.business_context: Dict[str, Any] = {}
        self.load_business_context()
        
        # Create necessary directories
        self._create_directories()
    
    def _create_directories(self):
        """Create necessary directories if they don't exist"""
        directories = [
            self.system.data_path,
            self.system.logs_path,
            self.system.session_path,
            self.chrome.user_data_dir,
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    def load_business_context(self) -> bool:
        """Load business context from JSON file"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self.business_context = json.load(f)
                print(f"✅ Business context loaded from {self.config_file}")
                return True
            else:
                print(f"⚠️ Config file {self.config_file} not found. Using default context.")
                self._create_default_config()
                return False
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing config file: {e}")
            print("Using default business context.")
            self.business_context = {}
            return False
        except Exception as e:
            print(f"❌ Error loading config file: {e}")
            self.business_context = {}
            return False
    
    def _create_default_config(self):
        """Create a default config file if it doesn't exist"""
        default_config = {
            "ai_identity": {
                "name": "Yue",
                "gender": "female",
                "role": "AI Assistant",
                "personality": "friendly, professional, and helpful",
                "language": "Portuguese (Brazilian)",
                "tone": "professional but approachable"
            },
            "business": {
                "name": "Sua Empresa",
                "description": "Configure seu negócio no arquivo config.json",
                "website": "https://suaempresa.com.br",
                "email": "contato@suaempresa.com.br",
                "phone": "+55 11 99999-9999",
                "working_hours": "Segunda a Sexta, 9h às 18h (GMT-3)"
            },
            "services": [],
            "products": [],
            "faq": [],
            "capabilities": [
                "Responder perguntas básicas",
                "Fornecer informações de contato"
            ],
            "limitations": [
                "Configure o arquivo config.json para personalizar"
            ]
        }
        
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            print(f"✅ Default config created at {self.config_file}")
            self.business_context = default_config
        except Exception as e:
            print(f"❌ Error creating default config: {e}")
    
    def reload_business_context(self) -> bool:
        """Reload business context from file"""
        return self.load_business_context()
    
    def get_system_prompt(self) -> str:
        """Generate system prompt from business context"""
        if not self.business_context:
            return "You are a helpful AI assistant."
        
        # Get configuration sections
        ai_identity = self.business_context.get("ai_identity", {})
        business = self.business_context.get("business", {})
        services = self.business_context.get("services", [])
        products = self.business_context.get("products", [])
        faq = self.business_context.get("faq", [])
        owner = self.business_context.get("owner", {})
        capabilities = self.business_context.get("capabilities", [])
        limitations = self.business_context.get("limitations", [])
        system_prompt_config = self.business_context.get("system_prompt", {})
        
        # Build system prompt
        prompt_parts = []
        
        # Identity section
        if ai_identity:
            prompt_parts.append("IDENTIDADE E PERSONALIDADE:")
            name = ai_identity.get("name", "Assistant")
            gender = ai_identity.get("gender", "neutral")
            role = ai_identity.get("role", "AI Assistant")
            personality = ai_identity.get("personality", "helpful")
            language = ai_identity.get("language", "Portuguese")
            tone = ai_identity.get("tone", "professional")
            
            prompt_parts.append(f"Você é {name}, {role}.")
            prompt_parts.append(f"Personalidade: {personality}")
            prompt_parts.append(f"Idioma: {language}")
            prompt_parts.append(f"Tom: {tone}")
            prompt_parts.append("")
        
        # Business information
        if business:
            prompt_parts.append("INFORMAÇÕES DO NEGÓCIO:")
            for key, value in business.items():
                if value:
                    prompt_parts.append(f"{key.title()}: {value}")
            prompt_parts.append("")
        
        # Services
        if services:
            prompt_parts.append("SERVIÇOS OFERECIDOS:")
            for service in services:
                name = service.get("name", "")
                description = service.get("description", "")
                price = service.get("price", "")
                duration = service.get("duration", "")
                prompt_parts.append(f"- {name}: {description}")
                if price:
                    prompt_parts.append(f"  Preço: {price}")
                if duration:
                    prompt_parts.append(f"  Duração: {duration}")
            prompt_parts.append("")
        
        # Products
        if products:
            prompt_parts.append("PRODUTOS DISPONÍVEIS:")
            for product in products:
                name = product.get("name", "")
                description = product.get("description", "")
                price = product.get("price", "")
                prompt_parts.append(f"- {name}: {description}")
                if price:
                    prompt_parts.append(f"  Preço: {price}")
            prompt_parts.append("")
        
        # FAQ
        if faq:
            prompt_parts.append("PERGUNTAS FREQUENTES:")
            for item in faq:
                question = item.get("question", "")
                answer = item.get("answer", "")
                if question and answer:
                    prompt_parts.append(f"P: {question}")
                    prompt_parts.append(f"R: {answer}")
                    prompt_parts.append("")
        
        # Owner information
        if owner:
            prompt_parts.append("INFORMAÇÕES DO PROPRIETÁRIO:")
            for key, value in owner.items():
                if value and key != "contact":
                    prompt_parts.append(f"{key.title()}: {value}")
            prompt_parts.append("")
        
        # Capabilities
        if capabilities:
            prompt_parts.append("SUAS CAPACIDADES:")
            for capability in capabilities:
                prompt_parts.append(f"- {capability}")
            prompt_parts.append("")
        
        # Limitations
        if limitations:
            prompt_parts.append("LIMITAÇÕES IMPORTANTES:")
            for limitation in limitations:
                prompt_parts.append(f"- {limitation}")
            prompt_parts.append("")
        
        # Instructions
        instructions = system_prompt_config.get("instructions", [
            "Sempre seja útil, profissional e conhecedor do negócio",
            "Forneça informações precisas sobre serviços, produtos e políticas",
            "Se não souber algo, admita e ofereça conectar com um humano",
            "Seja proativo em oferecer serviços relevantes baseados nas necessidades do cliente"
        ])
        
        prompt_parts.append("INSTRUÇÕES:")
        for instruction in instructions:
            prompt_parts.append(f"- {instruction}")
        prompt_parts.append("")
        
        # Closing message
        business_name = business.get("name", "esta empresa")
        owner_name = owner.get("name", "o proprietário")
        closing = f"Lembre-se: Você representa {business_name} e {owner_name}. Sempre forneça excelente atendimento ao cliente!"
        prompt_parts.append(closing)
        
        return "\n".join(prompt_parts)
    
    def get_ai_config(self) -> Dict[str, Any]:
        """Get AI configuration for the selected provider"""
        provider = self.ai.provider.lower()
        
        if provider == "openai":
            return {
                "provider": "openai",
                "api_key": self.ai.openai_api_key,
                "model": self.ai.openai_model,
                "base_url": self.ai.openai_base_url,
                "timeout": self.ai.timeout,
            }
        elif provider == "anthropic":
            return {
                "provider": "anthropic",
                "api_key": self.ai.anthropic_api_key,
                "model": self.ai.anthropic_model,
                "timeout": self.ai.timeout,
            }
        elif provider == "ollama":
            return {
                "provider": "ollama",
                "api_url": self.ai.ollama_api_url,
                "model": self.ai.ollama_model,
                "timeout": self.ai.timeout,
            }
        elif provider == "custom":
            return {
                "provider": "custom",
                "api_url": self.ai.custom_api_url,
                "model": self.ai.custom_model,
                "api_key": self.ai.custom_api_key,
                "timeout": self.ai.timeout,
            }
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")


# Global config instance
config = Config()
