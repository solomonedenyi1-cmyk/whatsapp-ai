"""
Main WhatsApp AI Bot class
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .config import config
from .whatsapp import WhatsAppClient, MessageHandler
from .ai import AIService, OpenAIService, AnthropicService, OllamaService, CustomAIService
from .services import (
    ConversationService, 
    CommandService, 
    AdminService, 
    AnalyticsService, 
    PerformanceService
)


class WhatsAppBot:
    """Main WhatsApp AI Bot class"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.is_running = False
        self.start_time = datetime.now()
        
        # Initialize services
        self.whatsapp_client = WhatsAppClient()
        self.message_handler = MessageHandler()
        self.conversation_service = ConversationService()
        self.admin_service = AdminService()
        self.analytics_service = AnalyticsService()
        self.performance_service = PerformanceService()
        
        # Initialize AI service based on configuration
        self.ai_service = self._create_ai_service()
        
        # Initialize command service with dependencies
        self.command_service = CommandService(
            self.ai_service,
            self.conversation_service,
            self.admin_service,
            self.analytics_service,
            self.performance_service
        )
        
        # Setup message handler
        self.whatsapp_client.add_message_handler(self._handle_message)
        
        self.logger.info("🤖 WhatsApp AI Bot initialized")
    
    def _create_ai_service(self) -> AIService:
        """Create AI service based on configuration"""
        ai_config = config.get_ai_config()
        provider = ai_config["provider"].lower()
        
        try:
            if provider == "openai":
                return OpenAIService(ai_config)
            elif provider == "anthropic":
                return AnthropicService(ai_config)
            elif provider == "ollama":
                return OllamaService(ai_config)
            elif provider == "custom":
                return CustomAIService(ai_config)
            else:
                raise ValueError(f"Unsupported AI provider: {provider}")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize AI service: {e}")
            # Fallback to a basic service or raise error
            raise
    
    async def start(self):
        """Start the WhatsApp bot"""
        try:
            self.logger.info("🚀 Starting WhatsApp AI Bot...")
            
            # Initialize WhatsApp client
            if not await self.whatsapp_client.initialize():
                raise Exception("Failed to initialize WhatsApp client")
            
            # Check AI service health
            ai_health = await self.ai_service.check_health()
            if ai_health.get("status") != "healthy":
                self.logger.warning(f"⚠️ AI service health check failed: {ai_health}")
            
            self.is_running = True
            self.logger.info("✅ WhatsApp AI Bot started successfully!")
            
            # Start message polling
            await self.whatsapp_client.start_message_polling()
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start bot: {e}")
            await self.shutdown()
            raise
    
    async def _handle_message(self, message: Dict[str, Any]):
        """Handle incoming WhatsApp message"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Check if message should be ignored
            if self.message_handler.should_ignore_message(message):
                return
            
            # Extract message info
            chat_id = self.message_handler.extract_chat_id(message)
            message_text = self.message_handler.extract_message_text(message)
            cleaned_text = self.message_handler.clean_message(message_text)
            
            if not cleaned_text:
                return
            
            self.logger.info(f"📨 Processing message from {chat_id}: {cleaned_text[:50]}...")
            
            # Record message processing
            await self.performance_service.record_message_processed()
            await self.analytics_service.log_message(chat_id, "text")
            
            # Show typing indicator
            await self.whatsapp_client.set_typing_indicator(chat_id)
            
            # Process message
            if self.message_handler.is_command(cleaned_text):
                response = await self._handle_command(cleaned_text, chat_id)
            else:
                response = await self._handle_ai_message(cleaned_text, chat_id)
            
            # Send response
            await self._send_response(chat_id, response)
            
            # Record performance metrics
            response_time = asyncio.get_event_loop().time() - start_time
            await self.performance_service.record_response_time(response_time)
            
            self.logger.info(f"✅ Message processed in {response_time:.2f}s")
            
        except Exception as e:
            self.logger.error(f"❌ Error handling message: {e}")
            await self.performance_service.record_error()
            await self._send_error_response(message.get("from"))
    
    async def _handle_command(self, message_text: str, chat_id: str) -> str:
        """Handle command message"""
        try:
            command, args = self.message_handler.parse_command(message_text)
            
            # Check admin access for admin commands
            admin_commands = {"health", "monitor", "performance", "errors", "admin", "optimize"}
            if command in admin_commands:
                access_check = self.admin_service.validate_admin_access(chat_id, command)
                if not access_check["allowed"]:
                    return access_check["message"]
            
            # Execute command
            response = await self.command_service.handle_command(command, args, chat_id)
            return response
            
        except Exception as e:
            self.logger.error(f"❌ Error handling command: {e}")
            return "❌ Erro ao executar comando. Tente novamente."
    
    async def _handle_ai_message(self, message_text: str, chat_id: str) -> str:
        """Handle regular AI message"""
        try:
            # Get conversation context with system prompt
            system_prompt = config.get_system_prompt()
            context = self.conversation_service.get_formatted_context(chat_id, system_prompt)
            
            # Add current message to context
            await self.conversation_service.add_message(chat_id, "user", message_text)
            
            # Send to AI service
            ai_response = await self.ai_service.send_message(message_text, context)
            
            # Add AI response to context
            await self.conversation_service.add_message(chat_id, "assistant", ai_response)
            
            # Format response
            return self.message_handler.format_response(ai_response)
            
        except Exception as e:
            self.logger.error(f"❌ Error processing AI message: {e}")
            return "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes."
    
    async def _send_response(self, chat_id: str, response: str):
        """Send response to WhatsApp chat"""
        try:
            # Split long messages
            message_parts = self.message_handler.split_message(response)
            
            for part in message_parts:
                await self.whatsapp_client.send_message(chat_id, part)
                
                # Add delay between parts
                if len(message_parts) > 1:
                    await asyncio.sleep(config.bot.response_delay)
            
        except Exception as e:
            self.logger.error(f"❌ Error sending response: {e}")
            raise
    
    async def _send_error_response(self, chat_id: str):
        """Send error response to user"""
        try:
            error_message = "❌ Ops! Algo deu errado. Tente enviar sua mensagem novamente."
            await self.whatsapp_client.send_message(chat_id, error_message)
        except Exception as e:
            self.logger.error(f"❌ Error sending error response: {e}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get comprehensive bot status"""
        try:
            # Get component statuses
            whatsapp_status = self.whatsapp_client.get_status()
            ai_health = await self.ai_service.check_health()
            conversation_stats = await self.conversation_service.get_stats()
            performance_stats = await self.performance_service.get_stats()
            
            # Calculate uptime
            uptime_seconds = (datetime.now() - self.start_time).total_seconds()
            
            return {
                "bot": {
                    "is_running": self.is_running,
                    "uptime_seconds": uptime_seconds,
                    "start_time": self.start_time.isoformat()
                },
                "whatsapp": whatsapp_status,
                "ai": ai_health,
                "conversations": conversation_stats,
                "performance": performance_stats,
                "config": {
                    "ai_provider": config.ai.provider,
                    "bot_name": config.bot.name,
                    "admin_configured": bool(config.bot.admin_whatsapp_number),
                    "debug_mode": config.system.debug
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error getting bot status: {e}")
            return {"error": str(e)}
    
    async def reload_config(self) -> bool:
        """Reload bot configuration"""
        try:
            self.logger.info("🔄 Reloading bot configuration...")
            
            # Reload business context
            success = config.reload_business_context()
            
            if success:
                self.logger.info("✅ Configuration reloaded successfully")
            else:
                self.logger.warning("⚠️ Configuration reloaded with warnings")
            
            return success
            
        except Exception as e:
            self.logger.error(f"❌ Error reloading configuration: {e}")
            return False
    
    async def shutdown(self):
        """Gracefully shutdown the bot"""
        try:
            self.logger.info("🛑 Shutting down WhatsApp AI Bot...")
            self.is_running = False
            
            # Shutdown WhatsApp client
            await self.whatsapp_client.shutdown()
            
            # Close AI service connections
            if hasattr(self.ai_service, '__aenter__'):
                await self.ai_service.__aexit__(None, None, None)
            
            self.logger.info("✅ WhatsApp AI Bot shutdown complete")
            
        except Exception as e:
            self.logger.error(f"❌ Error during shutdown: {e}")
    
    async def run_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check"""
        try:
            health_report = {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "healthy",
                "components": {}
            }
            
            # Check WhatsApp client
            whatsapp_status = self.whatsapp_client.get_status()
            health_report["components"]["whatsapp"] = {
                "status": "healthy" if whatsapp_status.get("is_ready") else "unhealthy",
                "details": whatsapp_status
            }
            
            # Check AI service
            ai_health = await self.ai_service.check_health()
            health_report["components"]["ai"] = ai_health
            
            # Check database/storage
            try:
                await self.conversation_service.get_stats()
                health_report["components"]["storage"] = {"status": "healthy"}
            except Exception as e:
                health_report["components"]["storage"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
            
            # Check performance
            performance_alerts = await self.performance_service.get_performance_alerts()
            health_report["components"]["performance"] = {
                "status": "healthy" if not performance_alerts else "warning",
                "alerts": performance_alerts
            }
            
            # Determine overall status
            component_statuses = [comp.get("status") for comp in health_report["components"].values()]
            if "unhealthy" in component_statuses:
                health_report["overall_status"] = "unhealthy"
            elif "warning" in component_statuses:
                health_report["overall_status"] = "warning"
            
            return health_report
            
        except Exception as e:
            self.logger.error(f"❌ Error running health check: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "error",
                "error": str(e)
            }
