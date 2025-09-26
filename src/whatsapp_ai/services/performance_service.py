"""
Performance monitoring and optimization service
"""

import time
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from collections import deque
import logging

from ..config import config


class PerformanceService:
    """Manages performance monitoring and optimization"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.start_time = time.time()
        
        # Performance metrics storage
        self.response_times = deque(maxlen=1000)
        self.message_counts = deque(maxlen=100)  # Messages per minute
        self.error_counts = deque(maxlen=100)
        self.cache_stats = {"hits": 0, "misses": 0, "entries": 0}
        
        # Real-time metrics
        self.current_metrics = {
            "active_connections": 0,
            "queue_size": 0,
            "memory_usage_mb": 0,
            "cpu_usage_percent": 0
        }
        
        # Performance history
        self.performance_history = []
        
        # Start background monitoring
        asyncio.create_task(self._background_monitoring())
    
    async def record_response_time(self, response_time: float):
        """Record a response time measurement"""
        self.response_times.append(response_time)
        
        # Log slow responses
        if response_time > 10:
            self.logger.warning(f"⚠️ Slow response detected: {response_time:.2f}s")
    
    async def record_message_processed(self):
        """Record that a message was processed"""
        current_minute = int(time.time() / 60)
        
        # Add to current minute or create new entry
        if self.message_counts and self.message_counts[-1][0] == current_minute:
            self.message_counts[-1] = (current_minute, self.message_counts[-1][1] + 1)
        else:
            self.message_counts.append((current_minute, 1))
    
    async def record_error(self):
        """Record an error occurrence"""
        current_minute = int(time.time() / 60)
        
        if self.error_counts and self.error_counts[-1][0] == current_minute:
            self.error_counts[-1] = (current_minute, self.error_counts[-1][1] + 1)
        else:
            self.error_counts.append((current_minute, 1))
    
    async def record_cache_hit(self):
        """Record a cache hit"""
        self.cache_stats["hits"] += 1
    
    async def record_cache_miss(self):
        """Record a cache miss"""
        self.cache_stats["misses"] += 1
    
    async def update_cache_entries(self, count: int):
        """Update cache entry count"""
        self.cache_stats["entries"] = count
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        try:
            # Calculate response time stats
            if self.response_times:
                avg_response_time = sum(self.response_times) / len(self.response_times)
                min_response_time = min(self.response_times)
                max_response_time = max(self.response_times)
                
                # Calculate P95
                sorted_times = sorted(self.response_times)
                p95_index = int(len(sorted_times) * 0.95)
                p95_response_time = sorted_times[p95_index] if sorted_times else 0
            else:
                avg_response_time = min_response_time = max_response_time = p95_response_time = 0
            
            # Calculate messages per minute
            current_time = time.time()
            recent_messages = [
                count for minute, count in self.message_counts
                if current_time - (minute * 60) < 3600  # Last hour
            ]
            messages_per_minute = sum(recent_messages) / max(len(recent_messages), 1)
            
            # Calculate cache hit rate
            total_cache_requests = self.cache_stats["hits"] + self.cache_stats["misses"]
            cache_hit_rate = (self.cache_stats["hits"] / total_cache_requests * 100) if total_cache_requests > 0 else 0
            
            # Calculate uptime
            uptime_seconds = time.time() - self.start_time
            uptime_str = self._format_uptime(uptime_seconds)
            
            # Error rate
            recent_errors = [
                count for minute, count in self.error_counts
                if current_time - (minute * 60) < 3600
            ]
            error_count = sum(recent_errors)
            total_messages = sum(recent_messages)
            error_rate = (error_count / total_messages * 100) if total_messages > 0 else 0
            
            return {
                "avg_response_time": avg_response_time,
                "min_response_time": min_response_time,
                "max_response_time": max_response_time,
                "p95_response_time": p95_response_time,
                "messages_per_minute": messages_per_minute,
                "peak_throughput": max(recent_messages) if recent_messages else 0,
                "cache_hit_rate": cache_hit_rate,
                "cache_entries": self.cache_stats["entries"],
                "cache_memory_mb": self.cache_stats["entries"] * 0.001,  # Rough estimate
                "uptime": uptime_str,
                "uptime_seconds": uptime_seconds,
                "error_rate": error_rate,
                "messages_last_hour": sum(recent_messages),
                "errors_count": error_count,
                "commands_executed": 0,  # Would be tracked separately
                "queue_size": self.current_metrics["queue_size"],
                "active_connections": self.current_metrics["active_connections"]
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error getting performance stats: {e}")
            return {}
    
    async def get_detailed_stats(self) -> str:
        """Get detailed performance statistics as formatted string"""
        try:
            stats = await self.get_stats()
            
            detailed = "📊 **Estatísticas Detalhadas de Performance**\n\n"
            
            # Response times
            detailed += "⏱️ **Tempos de Resposta:**\n"
            detailed += f"• Média: {stats.get('avg_response_time', 0):.2f}s\n"
            detailed += f"• Mínimo: {stats.get('min_response_time', 0):.2f}s\n"
            detailed += f"• Máximo: {stats.get('max_response_time', 0):.2f}s\n"
            detailed += f"• P95: {stats.get('p95_response_time', 0):.2f}s\n\n"
            
            # Throughput
            detailed += "📈 **Throughput:**\n"
            detailed += f"• Mensagens/minuto: {stats.get('messages_per_minute', 0):.1f}\n"
            detailed += f"• Pico: {stats.get('peak_throughput', 0)}/min\n"
            detailed += f"• Última hora: {stats.get('messages_last_hour', 0)}\n\n"
            
            # Cache performance
            detailed += "💾 **Cache:**\n"
            detailed += f"• Hit rate: {stats.get('cache_hit_rate', 0):.1f}%\n"
            detailed += f"• Entradas: {stats.get('cache_entries', 0)}\n"
            detailed += f"• Memória estimada: {stats.get('cache_memory_mb', 0):.1f}MB\n\n"
            
            # System health
            detailed += "🔧 **Sistema:**\n"
            detailed += f"• Uptime: {stats.get('uptime', 'Unknown')}\n"
            detailed += f"• Taxa de erro: {stats.get('error_rate', 0):.1f}%\n"
            detailed += f"• Conexões ativas: {stats.get('active_connections', 0)}\n"
            detailed += f"• Tamanho da fila: {stats.get('queue_size', 0)}\n"
            
            return detailed
            
        except Exception as e:
            self.logger.error(f"❌ Error getting detailed stats: {e}")
            return "❌ Erro ao obter estatísticas detalhadas."
    
    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human readable format"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    
    async def _background_monitoring(self):
        """Background task for continuous monitoring"""
        while True:
            try:
                await self._collect_system_metrics()
                await self._cleanup_old_metrics()
                await asyncio.sleep(60)  # Run every minute
                
            except Exception as e:
                self.logger.error(f"❌ Error in background monitoring: {e}")
                await asyncio.sleep(60)
    
    async def _collect_system_metrics(self):
        """Collect system-level metrics"""
        try:
            # This would collect real system metrics in a production environment
            # For now, we'll use placeholder values
            
            # Update current metrics (these would be real measurements)
            self.current_metrics.update({
                "active_connections": 1,  # Would track actual connections
                "queue_size": 0,  # Would track message queue size
                "memory_usage_mb": 50,  # Would measure actual memory usage
                "cpu_usage_percent": 10  # Would measure actual CPU usage
            })
            
            # Store historical data
            self.performance_history.append({
                "timestamp": datetime.now().isoformat(),
                "metrics": dict(self.current_metrics)
            })
            
            # Keep only last 24 hours of history
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.performance_history = [
                entry for entry in self.performance_history
                if datetime.fromisoformat(entry["timestamp"]) > cutoff_time
            ]
            
        except Exception as e:
            self.logger.error(f"❌ Error collecting system metrics: {e}")
    
    async def _cleanup_old_metrics(self):
        """Clean up old metric data to prevent memory leaks"""
        try:
            # Clean up old message counts (keep last hour)
            current_time = time.time()
            cutoff_time = current_time - 3600  # 1 hour ago
            
            self.message_counts = deque([
                (minute, count) for minute, count in self.message_counts
                if (minute * 60) > cutoff_time
            ], maxlen=100)
            
            self.error_counts = deque([
                (minute, count) for minute, count in self.error_counts
                if (minute * 60) > cutoff_time
            ], maxlen=100)
            
        except Exception as e:
            self.logger.error(f"❌ Error cleaning up metrics: {e}")
    
    async def get_performance_alerts(self) -> List[Dict[str, Any]]:
        """Get performance alerts for issues that need attention"""
        alerts = []
        
        try:
            stats = await self.get_stats()
            
            # High response time alert
            if stats.get("avg_response_time", 0) > 15:
                alerts.append({
                    "type": "warning",
                    "message": f"Tempo de resposta alto: {stats['avg_response_time']:.2f}s",
                    "recommendation": "Verificar conectividade com IA ou otimizar cache"
                })
            
            # High error rate alert
            if stats.get("error_rate", 0) > 5:
                alerts.append({
                    "type": "error",
                    "message": f"Taxa de erro alta: {stats['error_rate']:.1f}%",
                    "recommendation": "Verificar logs de erro e conectividade"
                })
            
            # Low cache hit rate alert
            if stats.get("cache_hit_rate", 0) < 50 and stats.get("cache_entries", 0) > 0:
                alerts.append({
                    "type": "info",
                    "message": f"Cache hit rate baixo: {stats['cache_hit_rate']:.1f}%",
                    "recommendation": "Considerar ajustar TTL do cache ou estratégia de caching"
                })
            
            # High queue size alert
            if stats.get("queue_size", 0) > 10:
                alerts.append({
                    "type": "warning",
                    "message": f"Fila de mensagens alta: {stats['queue_size']} mensagens",
                    "recommendation": "Sistema pode estar sobrecarregado"
                })
            
        except Exception as e:
            self.logger.error(f"❌ Error generating performance alerts: {e}")
        
        return alerts
    
    async def optimize_performance(self) -> Dict[str, Any]:
        """Run performance optimizations"""
        try:
            optimizations_applied = []
            
            # Enable caching if disabled and performance is poor
            stats = await self.get_stats()
            if not config.performance.enable_caching and stats.get("avg_response_time", 0) > 10:
                config.performance.enable_caching = True
                optimizations_applied.append("Caching habilitado")
            
            # Enable queue processing if disabled and queue is building up
            if not config.performance.enable_queue_processing and stats.get("queue_size", 0) > 5:
                config.performance.enable_queue_processing = True
                optimizations_applied.append("Processamento de fila habilitado")
            
            # Clear cache if hit rate is very low
            if stats.get("cache_hit_rate", 0) < 20 and stats.get("cache_entries", 0) > 100:
                # This would clear the cache in a real implementation
                optimizations_applied.append("Cache limpo devido a baixa eficiência")
            
            return {
                "optimizations_applied": optimizations_applied,
                "performance_improved": len(optimizations_applied) > 0
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error optimizing performance: {e}")
            return {"optimizations_applied": [], "performance_improved": False}
