"""
WhatsApp AI Bot - Python Edition

A modern, feature-rich WhatsApp bot with AI integration.
"""

__version__ = "2.0.0"
__author__ = "WhatsApp AI Bot Team"
__email__ = "contact@example.com"

from .main import main
from .bot import WhatsAppBot
from .config import Config

__all__ = ["main", "WhatsAppBot", "Config"]
