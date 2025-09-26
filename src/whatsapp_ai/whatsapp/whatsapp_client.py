"""
WhatsApp Web client using Selenium WebDriver
"""

import time
import qrcode
import io
import base64
import os
from typing import Optional, List, Dict, Any, Callable
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import logging
from pathlib import Path

from ..config import config


class WhatsAppClient:
    """WhatsApp Web client for automation"""
    
    def __init__(self):
        self.driver: Optional[webdriver.Chrome] = None
        self.is_authenticated = False
        self.is_ready = False
        self.message_handlers: List[Callable] = []
        self.logger = logging.getLogger(__name__)
        
        # Setup Chrome options
        self.chrome_options = self._setup_chrome_options()
        
    def _setup_chrome_options(self) -> Options:
        """Setup Chrome browser options"""
        options = Options()
        
        # Basic options
        if config.chrome.headless:
            options.add_argument("--headless=new")
        
        if config.chrome.no_sandbox:
            options.add_argument("--no-sandbox")
        
        if config.chrome.disable_gpu:
            options.add_argument("--disable-gpu")
        
        # Additional stability options
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-plugins")
        options.add_argument("--disable-images")
        options.add_argument("--disable-javascript")
        options.add_argument("--disable-web-security")
        options.add_argument("--allow-running-insecure-content")
        options.add_argument("--ignore-certificate-errors")
        options.add_argument("--ignore-ssl-errors")
        options.add_argument("--ignore-certificate-errors-spki-list")
        
        # User data directory for session persistence
        user_data_dir = Path(config.chrome.user_data_dir).absolute()
        user_data_dir.mkdir(parents=True, exist_ok=True)
        options.add_argument(f"--user-data-dir={user_data_dir}")
        
        # Performance optimizations
        options.add_argument("--memory-pressure-off")
        options.add_argument("--max_old_space_size=4096")
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-renderer-backgrounding")
        options.add_argument("--disable-backgrounding-occluded-windows")
        
        # WhatsApp Web specific
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument("--disable-blink-features=AutomationControlled")
        
        # User agent
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        return options
    
    async def initialize(self) -> bool:
        """Initialize WhatsApp Web client"""
        try:
            self.logger.info("🤖 Initializing WhatsApp Web client...")
            
            # Setup Chrome driver
            chrome_path = os.getenv("CHROME_PATH")
            if chrome_path:
                # Use the Chrome/Chromium path set by Docker startup script
                self.chrome_options.binary_location = chrome_path
                
                # Try to use system chromedriver first, fallback to WebDriverManager
                try:
                    import shutil
                    system_chromedriver = shutil.which("chromedriver")
                    if system_chromedriver:
                        service = Service(system_chromedriver)
                    else:
                        # Disable WebDriverManager cache to avoid corrupted downloads
                        os.environ['WDM_LOCAL'] = '1'
                        service = Service(ChromeDriverManager(cache_valid_range=1).install())
                except Exception:
                    service = Service(ChromeDriverManager(cache_valid_range=1).install())
            elif config.chrome.executable_path == "auto":
                service = Service(ChromeDriverManager().install())
            else:
                service = Service(config.chrome.executable_path)
            
            # Create driver
            self.driver = webdriver.Chrome(service=service, options=self.chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            # Navigate to WhatsApp Web
            self.logger.info("📱 Opening WhatsApp Web...")
            self.driver.get("https://web.whatsapp.com")
            
            # Wait for page load
            await self._wait_for_page_load()
            
            # Check if already authenticated
            if await self._check_authentication():
                self.logger.info("✅ Already authenticated!")
                self.is_authenticated = True
                await self._wait_for_ready()
            else:
                self.logger.info("📱 Please scan the QR code...")
                await self._handle_qr_authentication()
            
            # Setup message monitoring
            await self._setup_message_monitoring()
            
            self.is_ready = True
            self.logger.info("✅ WhatsApp Web client ready!")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize WhatsApp client: {e}")
            if self.driver:
                self.driver.quit()
            return False
    
    async def _wait_for_page_load(self, timeout: int = 30):
        """Wait for WhatsApp Web page to load"""
        try:
            WebDriverWait(self.driver, timeout).until(
                lambda driver: driver.execute_script("return document.readyState") == "complete"
            )
        except TimeoutException:
            raise Exception("WhatsApp Web page failed to load")
    
    async def _check_authentication(self) -> bool:
        """Check if already authenticated"""
        try:
            # Look for the main chat interface
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
            )
            return True
        except TimeoutException:
            return False
    
    async def _handle_qr_authentication(self):
        """Handle QR code authentication"""
        max_attempts = 5
        attempt = 0
        
        while attempt < max_attempts and not self.is_authenticated:
            try:
                attempt += 1
                self.logger.info(f"🔍 Looking for QR code... (Attempt {attempt}/{max_attempts})")
                
                # Wait for QR code to appear
                qr_element = WebDriverWait(self.driver, 30).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-ref]'))
                )
                
                # Get QR code data
                qr_data = qr_element.get_attribute('data-ref')
                if qr_data:
                    self._display_qr_code(qr_data)
                    
                    # Wait for authentication
                    self.logger.info("⏳ Waiting for QR code scan...")
                    WebDriverWait(self.driver, 60).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
                    )
                    
                    self.is_authenticated = True
                    self.logger.info("✅ QR code scanned successfully!")
                    await self._wait_for_ready()
                    break
                
            except TimeoutException:
                if attempt < max_attempts:
                    self.logger.warning(f"⚠️ QR code timeout, retrying... ({attempt}/{max_attempts})")
                    time.sleep(5)
                else:
                    raise Exception("Failed to authenticate after multiple attempts")
    
    def _display_qr_code(self, qr_data: str):
        """Display QR code in terminal"""
        try:
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=1, border=1)
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            # Print to terminal
            print("\n" + "="*50)
            print("📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:")
            print("="*50)
            qr.print_ascii(invert=True)
            print("="*50)
            print("1. Open WhatsApp on your phone")
            print("2. Go to Settings > Linked Devices")
            print("3. Tap 'Link a Device'")
            print("4. Scan the QR code above")
            print("="*50 + "\n")
            
        except Exception as e:
            self.logger.error(f"❌ Error displaying QR code: {e}")
    
    async def _wait_for_ready(self):
        """Wait for WhatsApp to be fully ready"""
        try:
            # Wait for chat list to be fully loaded
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
            )
            
            # Wait a bit more for full initialization
            time.sleep(5)
            
        except TimeoutException:
            raise Exception("WhatsApp Web failed to become ready")
    
    async def _setup_message_monitoring(self):
        """Setup message monitoring"""
        # This will be implemented to monitor for new messages
        # For now, we'll use polling method
        pass
    
    def add_message_handler(self, handler: Callable):
        """Add a message handler function"""
        self.message_handlers.append(handler)
    
    async def send_message(self, chat_id: str, message: str) -> bool:
        """Send a message to a chat"""
        try:
            # Find and click the chat
            await self._select_chat(chat_id)
            
            # Find message input box
            message_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]'))
            )
            
            # Clear and type message
            message_box.clear()
            message_box.send_keys(message)
            
            # Send message
            send_button = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="send"]')
            send_button.click()
            
            self.logger.info(f"📤 Message sent to {chat_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send message: {e}")
            return False
    
    async def _select_chat(self, chat_id: str):
        """Select a chat by ID or name"""
        try:
            # Try to find chat in the chat list
            chat_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="chat-list"] > div')
            
            for chat_element in chat_elements:
                try:
                    # Get chat title
                    title_element = chat_element.find_element(By.CSS_SELECTOR, '[data-testid="conversation-info-header"]')
                    chat_title = title_element.text
                    
                    # Check if this is the chat we want (simplified matching)
                    if chat_id in chat_title or chat_title in chat_id:
                        chat_element.click()
                        time.sleep(1)
                        return
                        
                except NoSuchElementException:
                    continue
            
            raise Exception(f"Chat not found: {chat_id}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to select chat: {e}")
            raise
    
    async def get_unread_messages(self) -> List[Dict[str, Any]]:
        """Get unread messages"""
        messages = []
        try:
            # This is a simplified implementation
            # In a real implementation, you'd need to track message state
            # and detect new messages more sophisticated way
            
            # For now, return empty list
            # This would be implemented with proper message detection
            pass
            
        except Exception as e:
            self.logger.error(f"❌ Error getting unread messages: {e}")
        
        return messages
    
    async def start_message_polling(self):
        """Start polling for new messages"""
        self.logger.info("🔄 Starting message polling...")
        
        while self.is_ready:
            try:
                # Check for new messages
                messages = await self.get_unread_messages()
                
                # Process messages with handlers
                for message in messages:
                    for handler in self.message_handlers:
                        try:
                            await handler(message)
                        except Exception as e:
                            self.logger.error(f"❌ Error in message handler: {e}")
                
                # Wait before next poll
                time.sleep(2)
                
            except Exception as e:
                self.logger.error(f"❌ Error in message polling: {e}")
                time.sleep(5)
    
    async def set_typing_indicator(self, chat_id: str):
        """Show typing indicator"""
        try:
            await self._select_chat(chat_id)
            # Typing indicator is automatically shown when focusing on input
            message_box = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')
            message_box.click()
        except Exception as e:
            self.logger.error(f"❌ Error setting typing indicator: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get client status"""
        return {
            "is_ready": self.is_ready,
            "is_authenticated": self.is_authenticated,
            "driver_active": self.driver is not None,
        }
    
    async def shutdown(self):
        """Shutdown the client"""
        try:
            self.logger.info("🛑 Shutting down WhatsApp client...")
            self.is_ready = False
            
            if self.driver:
                self.driver.quit()
                self.driver = None
                
            self.logger.info("✅ WhatsApp client shutdown complete")
            
        except Exception as e:
            self.logger.error(f"❌ Error during shutdown: {e}")
