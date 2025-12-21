"""
Building Manager Module

Manages a single building: coordinates sensor simulation and data transmission.
Each building runs in a separate thread for concurrent operation.
"""

import time
import logging
import threading
from typing import Dict, Any
from collections import deque

from building_sensor_simulator import BuildingSensorSimulator

logger = logging.getLogger(__name__)


class BuildingManager:
    """
    Manages a single building with its sensors.
    
    Responsibilities:
    - Coordinate sensor data generation for this building
    - Send building data to Kafka message bus
    - Handle local buffering for resilience
    - Run in separate thread for concurrent operation
    """
    
    def __init__(self, building_config: Dict[str, Any], 
                 kafka_producer: Any, kafka_topic: str, 
                 stop_event: threading.Event):
        """
        Initialize a Building Manager.
        
        Args:
            building_config: Configuration dict from buildings.json
            kafka_producer: Shared Kafka producer instance (thread-safe)
            kafka_topic: Topic name for publishing building data
            stop_event: Threading event to signal shutdown
        """
        # Building identification
        self.building_id = building_config['building_id']
        self.district_id = building_config['district_id']
        self.building_name = building_config['name']
        self.building_type = building_config['type']
        
        # Kafka configuration
        self.kafka_producer = kafka_producer
        self.kafka_topic = kafka_topic
        self.stop_event = stop_event
        
        # Initialize sensor simulator
        self.sensor_simulator = BuildingSensorSimulator(building_config)
        
        # Local buffer for resilience
        self.local_buffer = deque(maxlen=500)
        
        # Sampling interval (every 5 seconds with small randomization for buildings)
        import random
        self.sampling_interval = random.uniform(4.5, 5.5)
        
        logger.info(
            f"BuildingManager initialized: {self.building_id} - {self.building_name} ({self.building_type})"
        )
    
    def send_to_kafka(self, data: Dict[str, Any]) -> bool:
        """
        Send data to Kafka with error handling.
        
        Args:
            data: Building data to send
            
        Returns:
            True if sent successfully, False if buffered
        """
        try:
            future = self.kafka_producer.send(
                self.kafka_topic, 
                key=self.district_id,  # Partition key for data locality by district
                value=data
            )
            return True
        except Exception as e:
            logger.error(f"[{self.building_id}] Kafka error: {e}. Buffering message.")
            self.local_buffer.append(data)
            return False
    
    def retry_buffered_messages(self):
        """Attempt to send buffered messages."""
        if not self.local_buffer:
            return
        
        logger.info(f"[{self.building_id}] Retrying {len(self.local_buffer)} buffered messages")
        
        messages_to_retry = list(self.local_buffer)
        self.local_buffer.clear()
        
        for message in messages_to_retry:
            if not self.send_to_kafka(message):
                break
    
    def run(self):
        """
        Main loop for this building: generate and send sensor data.
        
        Execution Flow:
        1. Generate sensor data (AQ, acoustic, displays, exits, elevators)
        2. Send to Kafka
        3. Wait for next interval
        4. Repeat until stop signal
        """
        logger.info(f"[{self.building_id}] Starting building loop (interval: {self.sampling_interval:.1f}s)")
        
        iteration = 0
        while not self.stop_event.is_set():
            try:
                iteration += 1
                
                # Generate current building sensor data
                data = self.sensor_simulator.generate_data()
                
                # Send to Kafka
                self.send_to_kafka(data)
                
                # Periodically retry buffered messages
                if iteration % 10 == 0:
                    self.retry_buffered_messages()
                
                # Wait for next interval
                self.stop_event.wait(timeout=self.sampling_interval)
                
            except Exception as e:
                logger.error(f"[{self.building_id}] Error in building loop: {e}")
                self.stop_event.wait(timeout=self.sampling_interval)
        
        logger.info(f"[{self.building_id}] Building loop stopped")
