#!/usr/bin/env python3
"""
Buildings Simulator - Emergency Management System

Main entry point for the building monitoring component of the L'Aquila
Emergency Management System.

Architecture:
- Loads building configuration from JSON
- Creates BuildingManager for each building
- Each BuildingManager runs in a separate thread
- Generates realistic environmental and safety monitoring data
- Publishes data to Kafka for monitoring and analysis

This simulator supports:
- Air quality monitoring (PM2.5, PM10, NO2, CO, O3, VOC)
- Acoustic monitoring (noise levels)
- Emergency exit status monitoring
- Elevator operational status
- Display communication systems
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

# Import our building components
from building_manager import BuildingManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(threadName)s] - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables for configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC_BUILDINGS', 'buildings-monitoring')
BUILDINGS_CONFIG_FILE = os.getenv('BUILDINGS_CONFIG_FILE', 
                                   os.path.join(os.path.dirname(__file__), 'config', 'buildings.json'))


def load_buildings_config():
    """
    Load buildings configuration from JSON file.
    
    Returns:
        Dict with complete buildings configuration
        
    Raises:
        FileNotFoundError: If config file not found
        json.JSONDecodeError: If JSON is malformed
    """
    try:
        with open(BUILDINGS_CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.info(f"✓ Loaded buildings configuration (version: {config['metadata']['version']})")
        return config
    except FileNotFoundError:
        logger.error(f"✗ Buildings configuration file not found: {BUILDINGS_CONFIG_FILE}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"✗ Invalid JSON in buildings configuration file: {e}")
        raise


class BuildingsSimulator:
    """
    Main Buildings Simulator
    
    Coordinates all building managers and handles system lifecycle.
    
    Responsibilities:
    - Load building configuration
    - Initialize Kafka connection
    - Create and start BuildingManagers
    - Handle graceful shutdown
    """
    
    def __init__(self):
        """Initialize the buildings simulator."""
        # Load configuration
        self.buildings_config = load_buildings_config()
        
        # Initialize Kafka producer (shared across all buildings)
        self.kafka_producer = self._init_kafka_producer()
        
        # Threading control
        self.stop_event = threading.Event()
        self.building_managers = []
        self.building_threads = []
        
        # Initialize building managers
        self._initialize_buildings()
        
        logger.info(f"✓ BuildingsSimulator initialized")
        logger.info(f"  Total buildings: {len(self.building_managers)}")
    
    def _init_kafka_producer(self):
        """
        Initialize Kafka producer using common utilities.
        
        Returns:
            Connected KafkaProducer instance
        """
        producer = create_kafka_producer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            max_retries=10,
            retry_delay=5
        )
        
        # Configure for JSON serialization
        producer.config['value_serializer'] = lambda v: json.dumps(v).encode('utf-8')
        
        logger.info(f"✓ Buildings simulator Kafka producer ready (topic: {KAFKA_TOPIC})")
        return producer
    
    def _initialize_buildings(self):
        """
        Initialize BuildingManager for each building.
        
        Iterates through all buildings in the configuration,
        creating a BuildingManager instance for each.
        """
        for building_config in self.buildings_config.get('buildings', []):
            # Create BuildingManager for this building
            building_manager = BuildingManager(
                building_config=building_config,
                kafka_producer=self.kafka_producer,
                kafka_topic=KAFKA_TOPIC,
                stop_event=self.stop_event
            )
            
            self.building_managers.append(building_manager)
    
    def start_buildings(self):
        """
        Start all building managers in separate threads.
        
        Each building runs independently in its own thread.
        """
        logger.info("Starting all building managers...")
        
        for building_manager in self.building_managers:
            thread = threading.Thread(
                target=building_manager.run,
                name=f"Building-{building_manager.building_id}",
                daemon=True
            )
            thread.start()
            self.building_threads.append(thread)
        
        logger.info(f"✓ Started {len(self.building_threads)} building threads")
    
    def run(self):
        """
        Run the buildings simulator.
        
        Main execution flow:
        1. Display startup information
        2. Start all building manager threads
        3. Wait until interrupted
        4. Perform graceful shutdown
        """
        # Display startup banner
        logger.info("=" * 70)
        logger.info("🏢 L'Aquila Buildings Monitoring System")
        logger.info("=" * 70)
        logger.info(f"📊 Configuration:")
        logger.info(f"   Total Buildings: {len(self.building_managers)}")
        
        # Count by type
        building_types = {}
        for bm in self.building_managers:
            building_types[bm.building_type] = building_types.get(bm.building_type, 0) + 1
        
        for btype, count in building_types.items():
            logger.info(f"   - {btype}: {count}")
        
        logger.info(f"   Kafka Topic: {KAFKA_TOPIC}")
        logger.info("=" * 70)
        
        try:
            # Start all building managers
            self.start_buildings()
            
            logger.info("✓ System running. Press Ctrl+C to stop.")
            
            while not self.stop_event.is_set():
                time.sleep(1)
            
        except KeyboardInterrupt:
            logger.info("\\n⚠ Shutdown requested...")
        finally:
            self.stop()
    
    def stop(self):
        """
        Stop all building managers and cleanup resources.
        
        Performs graceful shutdown:
        1. Signal all threads to stop
        2. Wait for threads to finish
        3. Close Kafka connection
        """
        logger.info("Stopping all building managers...")
        
        # Signal all threads to stop
        self.stop_event.set()
        
        # Wait for threads to finish
        for thread in self.building_threads:
            thread.join(timeout=5)
        
        # Close Kafka producer
        self.kafka_producer.close()
        
        logger.info("✓ Buildings simulator stopped cleanly")


if __name__ == '__main__':
    """
    Main entry point.
    
    Creates and runs the BuildingsSimulator.
    """
    try:
        simulator = BuildingsSimulator()
        simulator.run()
    except Exception as e:
        logger.error(f"✗ Fatal error: {e}")
        sys.exit(1)
