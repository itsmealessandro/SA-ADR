#!/usr/bin/env python3
"""
Vehicles Simulator - Emergency Management System

Main entry point for the vehicle tracking component of the L'Aquila
Emergency Management System.

Architecture:
- Loads vehicle configuration from JSON
- Creates VehicleManager for each vehicle
- Each VehicleManager runs in a separate thread
- Generates realistic GPS tracking, battery monitoring, and incident detection data
- Publishes data to Kafka for monitoring and analysis

This simulator supports:
- Real-time vehicle tracking with GPS movement
- Battery and firmware monitoring (Managed Resources)
- Incident detection via accelerometer
- Route planning and predictive destination modeling
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

# Import our vehicle components
from vehicle_manager import VehicleManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(threadName)s] - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables for configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC_VEHICLES', 'vehicles-telemetry')
VEHICLES_CONFIG_FILE = os.getenv('VEHICLES_CONFIG_FILE', 
                                  os.path.join(os.path.dirname(__file__), 'config', 'vehicles.json'))


def load_vehicles_config():
    """
    Load vehicles configuration from JSON file.
    
    Returns:
        Dict with complete vehicles configuration
        
    Raises:
        FileNotFoundError: If config file not found
        json.JSONDecodeError: If JSON is malformed
    """
    try:
        with open(VEHICLES_CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.info(f"✓ Loaded vehicles configuration (version: {config['metadata']['version']})")
        return config
    except FileNotFoundError:
        logger.error(f"✗ Vehicles configuration file not found: {VEHICLES_CONFIG_FILE}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"✗ Invalid JSON in vehicles configuration file: {e}")
        raise


class VehiclesSimulator:
    """
    Main Vehicles Simulator
    
    Coordinates all vehicle managers and handles system lifecycle.
    
    Responsibilities:
    - Load vehicle configuration
    - Initialize Kafka connection
    - Create and start VehicleManagers
    - Handle graceful shutdown
    """
    
    def __init__(self):
        """Initialize the vehicles simulator."""
        # Load configuration
        self.vehicles_config = load_vehicles_config()
        
        # Initialize Kafka producer (shared across all vehicles)
        self.kafka_producer = self._init_kafka_producer()
        
        # Threading control
        self.stop_event = threading.Event()
        self.vehicle_managers = []
        self.vehicle_threads = []
        
        # Initialize vehicle managers
        self._initialize_vehicles()
        
        logger.info(f"✓ VehiclesSimulator initialized")
        logger.info(f"  Total vehicles: {len(self.vehicle_managers)}")
    
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
        
        logger.info(f"✓ Vehicles simulator Kafka producer ready (topic: {KAFKA_TOPIC})")
        return producer
    
    def _initialize_vehicles(self):
        """
        Initialize VehicleManager for each vehicle.
        
        Iterates through all vehicles in the configuration,
        creating a VehicleManager instance for each.
        """
        for vehicle_config in self.vehicles_config.get('vehicles', []):
            # Create VehicleManager for this vehicle
            vehicle_manager = VehicleManager(
                vehicle_config=vehicle_config,
                kafka_producer=self.kafka_producer,
                kafka_topic=KAFKA_TOPIC,
                stop_event=self.stop_event
            )
            
            self.vehicle_managers.append(vehicle_manager)
    
    def start_vehicles(self):
        """
        Start all vehicle managers in separate threads.
        
        Each vehicle runs independently in its own thread.
        """
        logger.info("Starting all vehicle managers...")
        
        for vehicle_manager in self.vehicle_managers:
            thread = threading.Thread(
                target=vehicle_manager.run,
                name=f"Vehicle-{vehicle_manager.vehicle_id}",
                daemon=True
            )
            thread.start()
            self.vehicle_threads.append(thread)
        
        logger.info(f"✓ Started {len(self.vehicle_threads)} vehicle threads")
    
    def run(self):
        """
        Run the vehicles simulator.
        
        Main execution flow:
        1. Display startup information
        2. Start all vehicle manager threads
        3. Wait until interrupted
        4. Perform graceful shutdown
        """
        # Display startup banner
        logger.info("=" * 70)
        logger.info("🚗 L'Aquila Vehicles Tracking System")
        logger.info("=" * 70)
        logger.info(f"📊 Configuration:")
        logger.info(f"   Total Vehicles: {len(self.vehicle_managers)}")
        
        # Count by type
        vehicle_types = {}
        for vm in self.vehicle_managers:
            vehicle_types[vm.vehicle_type] = vehicle_types.get(vm.vehicle_type, 0) + 1
        
        for vtype, count in vehicle_types.items():
            logger.info(f"   - {vtype}: {count}")
        
        logger.info(f"   Kafka Topic: {KAFKA_TOPIC}")
        logger.info("=" * 70)
        
        try:
            # Start all vehicle managers
            self.start_vehicles()
            
            logger.info("✓ System running. Press Ctrl+C to stop.")
            
            while not self.stop_event.is_set():
                time.sleep(1)
            
        except KeyboardInterrupt:
            logger.info("\\n⚠ Shutdown requested...")
        finally:
            self.stop()
    
    def stop(self):
        """
        Stop all vehicle managers and cleanup resources.
        
        Performs graceful shutdown:
        1. Signal all threads to stop
        2. Wait for threads to finish
        3. Close Kafka connection
        """
        logger.info("Stopping all vehicle managers...")
        
        # Signal all threads to stop
        self.stop_event.set()
        
        # Wait for threads to finish
        for thread in self.vehicle_threads:
            thread.join(timeout=5)
        
        # Close Kafka producer
        self.kafka_producer.close()
        
        logger.info("✓ Vehicles simulator stopped cleanly")


if __name__ == '__main__':
    """
    Main entry point.
    
    Creates and runs the VehiclesSimulator.
    """
    try:
        simulator = VehiclesSimulator()
        simulator.run()
    except Exception as e:
        logger.error(f"✗ Fatal error: {e}")
        sys.exit(1)
