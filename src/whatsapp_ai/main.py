"""
Main entry point for WhatsApp AI Bot
"""

import asyncio
import logging
import signal
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.logging import RichHandler

from .bot import WhatsAppBot
from .config import config


# Setup logging
def setup_logging():
    """Setup logging configuration"""
    log_level = getattr(logging, config.system.log_level.upper(), logging.INFO)
    
    # Create logs directory
    logs_dir = Path(config.system.logs_path)
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            RichHandler(rich_tracebacks=True),
            logging.FileHandler(logs_dir / "whatsapp_ai.log")
        ]
    )
    
    # Reduce noise from external libraries
    logging.getLogger("selenium").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


class BotRunner:
    """Bot runner with graceful shutdown handling"""
    
    def __init__(self):
        self.bot = None
        self.console = Console()
        self.shutdown_event = asyncio.Event()
    
    async def start_bot(self):
        """Start the bot with error handling"""
        try:
            self.bot = WhatsAppBot()
            
            # Setup signal handlers for graceful shutdown
            if sys.platform != "win32":
                loop = asyncio.get_running_loop()
                for sig in (signal.SIGTERM, signal.SIGINT):
                    loop.add_signal_handler(sig, self.signal_handler)
            
            # Start the bot
            await self.bot.start()
            
        except KeyboardInterrupt:
            self.console.print("\n🛑 Shutdown requested by user", style="yellow")
        except Exception as e:
            self.console.print(f"❌ Fatal error: {e}", style="red")
            raise
        finally:
            if self.bot:
                await self.bot.shutdown()
    
    def signal_handler(self):
        """Handle shutdown signals"""
        self.console.print("\n🛑 Shutdown signal received", style="yellow")
        self.shutdown_event.set()
    
    async def run(self):
        """Main run loop"""
        try:
            # Start bot in background
            bot_task = asyncio.create_task(self.start_bot())
            
            # Wait for shutdown signal or bot completion
            done, pending = await asyncio.wait(
                [bot_task, asyncio.create_task(self.shutdown_event.wait())],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            # Check if bot task completed with error
            if bot_task in done:
                try:
                    await bot_task
                except Exception as e:
                    self.console.print(f"❌ Bot error: {e}", style="red")
                    return 1
            
            return 0
            
        except Exception as e:
            self.console.print(f"❌ Runner error: {e}", style="red")
            return 1


@click.group()
@click.option('--debug', is_flag=True, help='Enable debug mode')
@click.option('--config', 'config_file', default='config.json', help='Configuration file path')
def cli(debug, config_file):
    """WhatsApp AI Bot - Python Edition"""
    if debug:
        config.system.debug = True
        config.system.log_level = "DEBUG"
    
    # Update config file path if specified
    if config_file != 'config.json':
        config.config_file = Path(config_file)
        config.load_business_context()


@cli.command()
def start():
    """Start the WhatsApp AI Bot"""
    setup_logging()
    
    console = Console()
    console.print("🤖 WhatsApp AI Bot - Python Edition", style="bold blue")
    console.print(f"Version: 2.0.0", style="dim")
    console.print(f"AI Provider: {config.ai.provider}", style="dim")
    console.print(f"Debug Mode: {config.system.debug}", style="dim")
    console.print()
    
    # Validate configuration
    if not config.bot.admin_whatsapp_number:
        console.print("⚠️ Warning: No admin WhatsApp number configured", style="yellow")
        console.print("Set ADMIN_WHATSAPP_NUMBER in your .env file", style="dim")
        console.print()
    
    if config.ai.provider == "openai" and not config.ai.openai_api_key:
        console.print("❌ Error: OpenAI API key not configured", style="red")
        console.print("Set OPENAI_API_KEY in your .env file", style="dim")
        sys.exit(1)
    
    if config.ai.provider == "anthropic" and not config.ai.anthropic_api_key:
        console.print("❌ Error: Anthropic API key not configured", style="red")
        console.print("Set ANTHROPIC_API_KEY in your .env file", style="dim")
        sys.exit(1)
    
    # Run the bot
    runner = BotRunner()
    
    try:
        if sys.platform == "win32":
            # Windows specific event loop policy
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        exit_code = asyncio.run(runner.run())
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        console.print("\n👋 Goodbye!", style="blue")
        sys.exit(0)


@cli.command()
def health():
    """Run health check"""
    setup_logging()
    
    async def run_health_check():
        bot = WhatsAppBot()
        health_report = await bot.run_health_check()
        
        console = Console()
        console.print("🏥 Health Check Report", style="bold")
        console.print(f"Overall Status: {health_report['overall_status']}")
        console.print()
        
        for component, status in health_report['components'].items():
            status_style = "green" if status['status'] == "healthy" else "red"
            console.print(f"• {component.title()}: {status['status']}", style=status_style)
    
    asyncio.run(run_health_check())


@cli.command()
def config_check():
    """Check configuration"""
    console = Console()
    console.print("🔧 Configuration Check", style="bold")
    console.print()
    
    # Check environment variables
    console.print("Environment Variables:", style="bold")
    console.print(f"• AI Provider: {config.ai.provider}")
    console.print(f"• Admin Number: {'✅ Set' if config.bot.admin_whatsapp_number else '❌ Not set'}")
    console.print(f"• Debug Mode: {config.system.debug}")
    console.print(f"• Database Type: {config.system.database_type}")
    console.print()
    
    # Check business context
    console.print("Business Context:", style="bold")
    if config.business_context:
        ai_identity = config.business_context.get("ai_identity", {})
        business = config.business_context.get("business", {})
        services = config.business_context.get("services", [])
        
        console.print(f"• AI Name: {ai_identity.get('name', 'Not set')}")
        console.print(f"• Business Name: {business.get('name', 'Not set')}")
        console.print(f"• Services: {len(services)} configured")
    else:
        console.print("• ❌ No business context loaded")
    
    console.print()
    console.print("✅ Configuration check complete")


@cli.command()
@click.option('--days', default=30, help='Days of data to clean (default: 30)')
def cleanup(days):
    """Clean up old data"""
    setup_logging()
    
    async def run_cleanup():
        from .services import ConversationService, AnalyticsService
        
        conv_service = ConversationService()
        analytics_service = AnalyticsService()
        
        console = Console()
        console.print(f"🧹 Cleaning up data older than {days} days...", style="yellow")
        
        # Clean conversations
        conv_deleted = await conv_service.cleanup_old_data(days)
        console.print(f"• Conversations: {conv_deleted} records cleaned")
        
        # Clean analytics
        analytics_deleted = await analytics_service.cleanup_old_analytics(days)
        console.print(f"• Analytics: {analytics_deleted} records cleaned")
        
        console.print("✅ Cleanup complete", style="green")
    
    asyncio.run(run_cleanup())


@cli.command()
def version():
    """Show version information"""
    console = Console()
    console.print("🤖 WhatsApp AI Bot", style="bold blue")
    console.print("Version: 2.0.0 (Python Edition)")
    console.print("Author: WhatsApp AI Bot Team")
    console.print("License: LGPL-2.1")
    console.print("Repository: https://github.com/isyuricunha/whatsapp-ai")


def main():
    """Main entry point"""
    cli()


if __name__ == "__main__":
    main()
