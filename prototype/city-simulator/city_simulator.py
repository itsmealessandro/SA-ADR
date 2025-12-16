#!/usr/bin/env python3
"""
City Simulator - Emergency Management System

Main entry point for the L'Aquila Emergency Management System simulator.

Architecture:
- Loads city configuration from JSON (districts, edges, sensors)
- Creates EdgeManager for each edge location
- Each EdgeManager runs in a separate thread
- EdgeManagers use SensorSimulators to generate realistic data
- All data is sent to Kafka for processing by the monitor

This simulator demonstrates:
- Edge computing with local processing
- Concurrent operations with threading
- Resilient message handling with buffering
- Dynamic configuration loading
"""

import os
import sys
import time
import json
import logging
import threading

# Add parent directory to path to import common module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import common utilities
from common.kafka_utils import create_kafka_producer

# Import our modular components
from edge_manager import EdgeManager

# Configure logging with clear formatting
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(threadName)s] - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables for configuration
# Environment variables for configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
# Updated topic configuration for sensor-type architecture
KAFKA_TOPICS = {
    'speed': os.getenv('KAFKA_TOPIC_SPEED', 'city-speed-sensors'),
    'weather': os.getenv('KAFKA_TOPIC_WEATHER', 'city-weather-sensors'),
    'camera': os.getenv('KAFKA_TOPIC_CAMERA', 'city-camera-sensors')
}
CITY_CONFIG_FILE = os.getenv('CITY_CONFIG_FILE', 
                              os.path.join(os.path.dirname(__file__), 'config', 'city_config.json'))


def load_city_config():
    """
    Load city configuration from JSON file.
    
    The configuration includes:
    - City metadata (name, location)
    - Managed resources configuration
    - Districts with their edges
    - Sensors for each edge
    
    Returns:
        Dict with complete city configuration
        
    Raises:
        FileNotFoundError: If config file not found
        json.JSONDecodeError: If JSON is malformed
    """
    try:
        with open(CITY_CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.info(f"✓ Loaded city configuration: {config['city']['name']}")
        return config
    except FileNotFoundError:
        logger.error(f"✗ City configuration file not found: {CITY_CONFIG_FILE}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"✗ Invalid JSON in city configuration file: {e}")
        raise


class CitySimulator:
    """
    Main City Simulator
    
    Coordinates all edge managers and handles system lifecycle.
    
    Responsibilities:
    - Load configuration
    - Initialize Kafka connection
    - Create and start EdgeManagers
    - Handle graceful shutdown
    """
    
    def __init__(self):
        """Initialize the city simulator."""
        # Load configuration
        self.city_config = load_city_config()
        self.city_name = self.city_config['city']['name']
        
        # Get configuration parameters
        managed_resources = self.city_config.get('managed_resources', {})
        self.monitor_interval = managed_resources.get('monitor_interval_seconds', 3)
        
        # Initialize Kafka producer (shared across all edges)
        self.kafka_producer = self._init_kafka_producer()
        
        # Threading control
        self.stop_event = threading.Event()
        self.edge_managers = []
        self.edge_threads = []
        
        # Initialize edge managers
        self._initialize_edges()
        
        logger.info(f"✓ CitySimulator initialized for {self.city_name}")
        logger.info(f"  Total edges: {len(self.edge_managers)}")
    
    def _init_kafka_producer(self):
        """
        Initialize Kafka producer using common utilities.
        
        The producer is shared across all edge managers (thread-safe).
        Uses the shared kafka_utils module for consistent connection handling.
        
        Returns:
            Connected KafkaProducer instance
            
        Raises:
            Exception: If connection fails after all retries
        """
        # Use common utility for Kafka producer creation
        # The utility already configures JSON serialization correctly
        producer = create_kafka_producer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            max_retries=10,
            retry_delay=5
        )
        
        logger.info(f"✓ City simulator Kafka producer ready (topics: {list(KAFKA_TOPICS.values())})")
        return producer
    
    def _initialize_edges(self):
        """
        Initialize EdgeManager for each edge in the city.
        
        Iterates through all districts and edges in the configuration,
        creating an EdgeManager instance for each edge location.
        """
        for district in self.city_config.get('districts', []):
            district_id = district['district_id']
            district_name = district['name']
            
            logger.info(f"  District: {district_name} ({district_id})")
            
            for edge_config in district.get('edges', []):
                # Create EdgeManager for this edge
                edge_manager = EdgeManager(
                    district_id=district_id,
                    edge_config=edge_config,
                    kafka_producer=self.kafka_producer,
                    kafka_topics=KAFKA_TOPICS,
                    stop_event=self.stop_event
                )
                
                self.edge_managers.append(edge_manager)
    
    def start_edges(self):
        """
        Start all edge managers in separate threads.
        
        Each edge runs independently in its own thread, allowing
        concurrent sensor data generation and transmission.
        """
        logger.info("Starting all edge managers...")
        
        for edge_manager in self.edge_managers:
            # Create thread for this edge
            thread = threading.Thread(
                target=edge_manager.run,
                name=f"Edge-{edge_manager.edge_id}",
                daemon=True  # Thread will stop when main program exits
            )
            thread.start()
            self.edge_threads.append(thread)
        
        logger.info(f"✓ Started {len(self.edge_threads)} edge threads")
    
    def run(self):
        """
        Run the city simulator.
        
        Main execution flow:
        1. Display startup information
        2. Start all edge manager threads
        3. Wait until interrupted
        4. Perform graceful shutdown
        """
        # Display startup banner
        logger.info("=" * 70)
        logger.info(f"🏙️  {self.city_name} Emergency Management System")
        logger.info("=" * 70)
        logger.info(f"📊 Configuration:")
        logger.info(f"   Monitor Interval: {self.monitor_interval}s")
        logger.info(f"   Districts: {len(self.city_config['districts'])}")
        logger.info(f"   Edges: {len(self.edge_managers)}")
        logger.info(f"   Kafka Topics: {KAFKA_TOPICS}")
        logger.info("=" * 70)
        
        try:
            # Start all edge managers
            self.start_edges()
            
            # Keep main thread alive
            # In a full MAPE-K implementation, this is where the
            # Monitor-Analyze-Plan-Execute loop would run
            logger.info("✓ System running. Press Ctrl+C to stop.")
            
            while not self.stop_event.is_set():
                time.sleep(1)
            
        except KeyboardInterrupt:
            logger.info("\n⚠ Shutdown requested...")
        finally:
            self.stop()
    
    def stop(self):
        """
        Stop all edge managers and cleanup resources.
        
        Performs graceful shutdown:
        1. Signal all threads to stop
        2. Wait for threads to finish
        3. Close Kafka connection
        """
        logger.info("Stopping all edge managers...")
        
        # Signal all threads to stop
        self.stop_event.set()
        
        # Wait for threads to finish (with timeout)
        for thread in self.edge_threads:
            thread.join(timeout=5)
        
        # Close Kafka producer
        self.kafka_producer.close()
        
        logger.info("✓ City simulator stopped cleanly")


if __name__ == '__main__':
    """
    Main entry point.
    
    Creates and runs the CitySimulator.
    Handles any startup errors gracefully.
    """
    try:
        simulator = CitySimulator()
        simulator.run()
    except Exception as e:
        logger.error(f"✗ Fatal error: {e}")
        sys.exit(1)
