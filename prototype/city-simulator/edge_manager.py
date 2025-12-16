"""
Edge Manager Module

This module manages a single edge location with its sensors.
Each edge runs in a separate thread, simulating concurrent operations
at different physical locations in the city.

An edge represents a specific location (e.g., a street intersection) that
hosts multiple sensors of different types.
"""

import time
import logging
import threading
from datetime import datetime
from typing import Dict, Any
from collections import deque

from sensor_simulator import SpeedSensorSimulator, WeatherSensorSimulator, CameraSensorSimulator

logger = logging.getLogger(__name__)


class EdgeManager:
    """
    Manages a single edge location with multiple sensors.
    
    Responsibilities:
    - Coordinate data generation from all sensors at this edge
    - Aggregate sensor data per type (speed, weather, camera)
    - Send aggregated data to Kafka message bus
    - Handle local buffering for resilience
    - Run in separate thread for concurrent operation
    
    Thread Safety:
    - Each EdgeManager has its own thread
    - Shares only the Kafka producer (which is thread-safe)
    - No shared state between edges
    """
    
    def __init__(self, district_id: str, edge_config: Dict, 
                 kafka_producer: Any, kafka_topics: Dict[str, str], 
                 stop_event: threading.Event):
        """
        Initialize an Edge Manager.
        
        Args:
            district_id: ID of the district this edge belongs to
            edge_config: Configuration dict from city_config.json
            kafka_producer: Shared Kafka producer instance (thread-safe)
            kafka_topics: Dictionary mapping sensor types to topic names
            stop_event: Threading event to signal shutdown
        """
        # Edge identification
        self.district_id = district_id
        self.edge_id = edge_config['edge_id']
        self.edge_name = edge_config['name']
        self.location = edge_config['location']
        self.sensors_config = edge_config.get('sensors', {})
        
        # Kafka configuration
        self.kafka_producer = kafka_producer
        self.kafka_topics = kafka_topics
        self.stop_event = stop_event
        
        # Initialize sensor simulators
        # Each simulator maintains its own state (windows, persistence, etc.)
        self.speed_simulator = SpeedSensorSimulator(self.location)
        self.weather_simulator = WeatherSensorSimulator(self.location)
        self.camera_simulator = CameraSensorSimulator(self.location)
        
        # Local buffer for resilience
        # If Kafka is temporarily unavailable, messages are buffered here
        self.local_buffer = deque(maxlen=1000)
        
        # Randomized sampling interval to avoid synchronization
        # (prevents all edges from sending data at exactly the same time)
        import random
        self.sampling_interval = random.uniform(2.5, 4.5)
        
        # Log initialization
        speed_count = len(self.sensors_config.get('speed', []))
        weather_count = len(self.sensors_config.get('weather', []))
        camera_count = len(self.sensors_config.get('camera', []))
        
        logger.info(
            f"EdgeManager initialized: {district_id}/{self.edge_id} ({self.edge_name}) - "
            f"Sensors: {speed_count} speed, {weather_count} weather, {camera_count} camera"
        )
    
    def generate_sensor_data(self, sensor_type: str) -> Dict[str, Any]:
        """
        Generate data for a specific sensor type.
        
        This method coordinates with the appropriate sensor simulator
        and adds common metadata (district, edge, timestamp, GPS).
        
        Args:
            sensor_type: One of 'speed', 'weather', 'camera'
            
        Returns:
            Complete sensor data message ready for Kafka, or None if no sensors
        """
        # Get sensor-specific data from appropriate simulator
        if sensor_type == 'speed':
            sensor_data = self.speed_simulator.generate_data(
                self.sensors_config.get('speed', [])
            )
        elif sensor_type == 'weather':
            sensor_data = self.weather_simulator.generate_data(
                self.sensors_config.get('weather', [])
            )
        elif sensor_type == 'camera':
            sensor_data = self.camera_simulator.generate_data(
                self.sensors_config.get('camera', [])
            )
        else:
            return None
        
        # If no sensors of this type, skip
        if sensor_data is None:
            return None
        
        # Add common metadata to create complete message
        message = {
            'district_id': self.district_id,
            'edge_id': self.edge_id,
            'sensor_type': sensor_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'latitude': self.location['latitude'],
            'longitude': self.location['longitude'],
        }
        
        # Merge sensor-specific data
        message.update(sensor_data)
        
        return message
    
    def send_to_kafka(self, data: Dict[str, Any]) -> bool:
        """
        Send data to Kafka with error handling.
        
        Implements resilience pattern:
        1. Try to send to Kafka
        2. On failure, buffer locally
        3. Retry buffered messages later
        
        Args:
            data: Message data to send
            
        Returns:
            True if sent successfully, False if buffered
        """
        try:
            # Determine topic based on sensor type
            sensor_type = data.get('sensor_type')
            topic = self.kafka_topics.get(sensor_type)
            
            if not topic:
                logger.error(f"[{self.edge_id}] No topic configured for sensor type: {sensor_type}")
                return False
            
            logger.info(f"[{self.edge_id}] 📤 Sending {sensor_type} data to {topic}...")
            
            # Async send with timeout and partition key
            # Using edge_id as key ensures all data for this edge goes to same partition
            future = self.kafka_producer.send(
                topic, 
                key=self.edge_id,  # Partition key
                value=data
            )
            future.get(timeout=10)  # Wait max 10 seconds
            logger.info(f"[{self.edge_id}] ✓ Sent {sensor_type} data to {topic}")
            return True
        except Exception as e:
            # Log error and buffer message for retry
            logger.error(f"[{self.edge_id}] Kafka error: {e}. Buffering message.")
            self.local_buffer.append(data)
            return False
    
    def retry_buffered_messages(self):
        """
        Attempt to send buffered messages.
        
        Called periodically when Kafka might be available again.
        Implements simple retry logic without sophisticated backoff.
        """
        if not self.local_buffer:
            return
        
        logger.info(f"[{self.edge_id}] Retrying {len(self.local_buffer)} buffered messages")
        
        # Try to send all buffered messages
        messages_to_retry = list(self.local_buffer)
        self.local_buffer.clear()
        
        for message in messages_to_retry:
            if not self.send_to_kafka(message):
                # Still failing, will be re-buffered
                break
    
    def run(self):
        """
        Main loop for this edge: generate and send sensor data.
        
        Execution Flow:
        1. Rotate through sensor types (speed → weather → camera)
        2. Generate data for current sensor type
        3. Send to Kafka
        4. Wait for next interval
        5. Repeat until stop signal
        
        This method runs in a separate thread, one per edge.
        """
        logger.info(f"[{self.edge_id}] Starting edge loop (interval: {self.sampling_interval:.1f}s)")
        
        iteration = 0
        while not self.stop_event.is_set():
            try:
                iteration += 1
                
                # Rotate between sensor types
                # Cycle: 0=speed, 1=weather, 2=camera
                sensor_cycle = iteration % 3
                if sensor_cycle == 0:
                    sensor_type = 'speed'
                elif sensor_cycle == 1:
                    sensor_type = 'weather'
                else:
                    sensor_type = 'camera'
                
                logger.info(f"[{self.edge_id}] Iteration {iteration}: Generating {sensor_type} data")
                
                # Generate data for current sensor type
                data = self.generate_sensor_data(sensor_type)
                
                # Send if data was generated (skip if no sensors of this type)
                if data is not None:
                    logger.info(f"[{self.edge_id}] Data generated, sending to Kafka...")
                    self.send_to_kafka(data)
                else:
                    logger.info(f"[{self.edge_id}] No {sensor_type} sensors, skipping")
                
                # Periodically retry buffered messages
                if iteration % 10 == 0:
                    self.retry_buffered_messages()
                
                # Wait for next interval (interruptible sleep)
                self.stop_event.wait(timeout=self.sampling_interval)
                
            except Exception as e:
                # Log error but keep running (fault tolerance)
                logger.error(f"[{self.edge_id}] Error in edge loop: {e}")
                self.stop_event.wait(timeout=self.sampling_interval)
        
        logger.info(f"[{self.edge_id}] Edge loop stopped")
